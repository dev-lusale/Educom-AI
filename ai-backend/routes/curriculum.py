"""
Educom AI Backend — Curriculum Routes
Handles document upload, ingestion, and semantic search endpoints.
"""

import logging
import os
import uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import asyncio

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status, BackgroundTasks
import aiofiles

from models.lesson_plan import (
    CurriculumSearchRequest,
    CurriculumSearchResponse,
    CurriculumSearchResult,
    DocumentUploadResponse,
)
from rag.document_processor import get_document_processor
from rag.retriever import get_retriever
from config.settings import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/curriculum", tags=["Curriculum"])

# Track ingestion state
_ingestion_state = {
    "running": False,
    "processed": 0,
    "successful": 0,
    "failed": 0,
    "total": 0,
    "current_file": "",
    "done": False,
    "errors": [],
}


def _run_ingestion_background(docs_dir: str, collection: str):
    """Runs ingestion in a background thread, updating state as it goes."""
    global _ingestion_state

    supported = {".pdf", ".docx", ".doc", ".txt"}
    all_files = [
        f for f in Path(docs_dir).rglob("*")
        if f.is_file() and f.suffix.lower() in supported
    ]

    _ingestion_state.update({
        "running": True,
        "processed": 0,
        "successful": 0,
        "failed": 0,
        "total": len(all_files),
        "done": False,
        "errors": [],
    })

    processor = get_document_processor()

    for file_path in all_files:
        _ingestion_state["current_file"] = file_path.name
        subfolder = file_path.parent.name
        metadata = {}
        if subfolder != Path(docs_dir).name:
            metadata["category"] = subfolder

        try:
            processor.ingest_document(str(file_path), collection, metadata)
            _ingestion_state["successful"] += 1
        except Exception as e:
            logger.error(f"Failed to ingest {file_path.name}: {e}")
            _ingestion_state["failed"] += 1
            _ingestion_state["errors"].append(f"{file_path.name}: {str(e)[:100]}")

        _ingestion_state["processed"] += 1

    _ingestion_state["running"] = False
    _ingestion_state["done"] = True
    _ingestion_state["current_file"] = ""
    logger.info(
        f"Background ingestion complete: "
        f"{_ingestion_state['successful']}/{_ingestion_state['total']} successful"
    )


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a curriculum document",
    description=(
        "Upload a PDF or DOCX curriculum document. "
        "The document is automatically chunked, embedded, and stored in ChromaDB "
        "for use in the RAG pipeline."
    ),
)
async def upload_curriculum_document(
    file: UploadFile = File(..., description="PDF or DOCX file to upload"),
    collection: str = Form(
        default="curriculum",
        description="Target collection: 'curriculum' or 'lesson_plans'",
    ),
    grade: str = Form(default="", description="Grade level this document covers"),
    subject: str = Form(default="", description="Subject this document covers"),
    description: str = Form(default="", description="Brief description of the document"),
) -> DocumentUploadResponse:
    """
    Upload and ingest a curriculum document into the RAG system.

    Supported formats: PDF, DOCX, TXT

    The document will be:
    1. Saved to the uploads directory
    2. Text extracted and split into chunks
    3. Embeddings generated using sentence-transformers
    4. Stored in ChromaDB for semantic retrieval
    """
    settings = get_settings()

    # Validate file type
    allowed_extensions = {".pdf", ".docx", ".doc", ".txt"}
    file_ext = Path(file.filename or "").suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file_ext}'. Allowed: PDF, DOCX, TXT",
        )

    # Validate file size
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read()

    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.max_upload_size_mb}MB",
        )

    # Save file to uploads directory
    os.makedirs(settings.upload_dir, exist_ok=True)
    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(settings.upload_dir, safe_filename)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    logger.info(f"Saved uploaded file: {safe_filename}")

    # Build metadata for ChromaDB
    # Parse user_id from description if present (format: "user_id:<id> <optional text>")
    user_id = ""
    clean_description = description
    if description.startswith("user_id:"):
        parts = description.split(" ", 1)
        user_id = parts[0].replace("user_id:", "").strip()
        clean_description = parts[1].strip() if len(parts) > 1 else ""

    metadata = {
        "original_filename": file.filename,
        "description": clean_description,
    }
    if grade:
        metadata["grade"] = grade
    if subject:
        metadata["subject"] = subject
    # Store user_id as a dedicated metadata field for reliable per-teacher filtering
    if user_id:
        metadata["user_id"] = user_id

    # Ingest into ChromaDB
    try:
        processor = get_document_processor()
        result = processor.ingest_document(
            file_path=file_path,
            collection_name=collection,
            metadata=metadata,
        )

        return DocumentUploadResponse(
            filename=file.filename or safe_filename,
            file_type=result["file_type"],
            chunks_created=result["chunks_created"],
            embeddings_stored=result["embeddings_stored"],
            collection=collection,
            message=(
                f"Successfully ingested '{file.filename}' into the {collection} collection. "
                f"{result['embeddings_stored']} chunks are now searchable."
            ),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Document ingestion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}",
        )


@router.post(
    "/search",
    response_model=CurriculumSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search curriculum content",
    description="Perform semantic search across ingested curriculum documents.",
)
async def search_curriculum(request: CurriculumSearchRequest) -> CurriculumSearchResponse:
    """
    Semantic search across curriculum documents.

    Uses sentence-transformer embeddings to find the most relevant
    curriculum content for a given query.

    Optionally filter by grade and/or subject.
    """
    try:
        retriever = get_retriever()
        results = retriever.retrieve_for_search(
            query=request.query,
            grade=request.grade,
            subject=request.subject,
            top_k=request.top_k,
        )

        search_results = [
            CurriculumSearchResult(
                content=r["content"],
                source=r.get("metadata", {}).get("source", "Unknown"),
                relevance_score=round(r.get("relevance_score", 0.0), 4),
                grade=r.get("metadata", {}).get("grade"),
                subject=r.get("metadata", {}).get("subject"),
            )
            for r in results
        ]

        return CurriculumSearchResponse(
            query=request.query,
            results=search_results,
            total_found=len(search_results),
        )

    except Exception as e:
        logger.error(f"Curriculum search error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


@router.post(
    "/ingest-directory",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest all documents from curriculum_docs directory",
    description=(
        "Starts background ingestion of all PDF/DOCX/TXT files from curriculum_docs/. "
        "Returns immediately — check /ingest-status for progress."
    ),
)
async def ingest_curriculum_directory(
    collection: str = "curriculum",
) -> dict:
    """
    Start background ingestion of all documents in curriculum_docs/.
    Returns immediately with a job ID. Poll /ingest-status for progress.
    """
    global _ingestion_state

    settings = get_settings()
    docs_dir = settings.curriculum_docs_dir

    if not os.path.exists(docs_dir):
        os.makedirs(docs_dir, exist_ok=True)
        return {
            "status": "no_files",
            "message": f"Directory '{docs_dir}' created. Add curriculum documents and call this endpoint again.",
        }

    if _ingestion_state["running"]:
        return {
            "status": "already_running",
            "message": "Ingestion is already in progress.",
            "progress": f"{_ingestion_state['processed']}/{_ingestion_state['total']} files",
            "current_file": _ingestion_state["current_file"],
        }

    # Count files first
    supported = {".pdf", ".docx", ".doc", ".txt"}
    all_files = [
        f for f in Path(docs_dir).rglob("*")
        if f.is_file() and f.suffix.lower() in supported
    ]

    if not all_files:
        return {
            "status": "no_files",
            "message": "No supported documents found in curriculum_docs/.",
        }

    # Start ingestion in background thread (non-blocking)
    executor = ThreadPoolExecutor(max_workers=1)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(executor, _run_ingestion_background, docs_dir, collection)

    return {
        "status": "started",
        "message": f"Ingestion started for {len(all_files)} documents. Poll /api/curriculum/ingest-status for progress.",
        "total_files": len(all_files),
    }


@router.get(
    "/ingest-status",
    status_code=status.HTTP_200_OK,
    summary="Check ingestion progress",
)
async def get_ingestion_status() -> dict:
    """Check the progress of a running or completed ingestion job."""
    from vector_db.chroma_client import get_chroma_client
    chroma = get_chroma_client()

    state = _ingestion_state.copy()
    state["chunks_in_db"] = chroma.get_collection_count("curriculum")

    if state["total"] > 0:
        pct = round((state["processed"] / state["total"]) * 100, 1)
        state["percent_complete"] = pct
    else:
        state["percent_complete"] = 0

    return state


@router.get(
    "/stats",
    status_code=status.HTTP_200_OK,
    summary="Get curriculum database statistics",
)
async def get_curriculum_stats() -> dict:
    """Return statistics about the curriculum vector database."""
    from vector_db.chroma_client import get_chroma_client

    chroma = get_chroma_client()

    return {
        "curriculum_chunks": chroma.get_collection_count("curriculum"),
        "lesson_plan_samples": chroma.get_collection_count("lesson_plans"),
        "chroma_connected": chroma.is_connected,
    }
