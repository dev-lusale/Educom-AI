"""
Educom AI Backend — FastAPI Application Entry Point
AI-powered Zambian education platform backend.

Architecture:
- FastAPI for the REST API
- Ollama (phi3/mistral) for local AI generation
- LangChain for prompt management
- ChromaDB for vector storage
- Sentence Transformers for embeddings
- RAG pipeline for curriculum-aware generation

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from config.settings import get_settings
from routes import (
    health_router,
    lesson_plans_router,
    assessments_router,
    assessment_intelligence_router,
    curriculum_router,
    chat_router,
    pdf_export_router,
)

# ── Logging Configuration ────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Application Lifespan ─────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    Initializes ChromaDB and pre-loads the embedding model on startup.
    """
    settings = get_settings()

    logger.info("=" * 60)
    logger.info("  Educom AI Backend — Starting Up")
    logger.info("=" * 60)
    logger.info(f"  Environment : {settings.environment}")
    logger.info(f"  AI Provider : Google Gemini (primary) / Ollama (fallback)")
    logger.info(f"  Gemini Model: {settings.gemini_model}")
    logger.info(f"  Ollama URL  : {settings.ollama_base_url}")
    logger.info(f"  ChromaDB    : {settings.chroma_persist_dir}")
    logger.info(f"  Embeddings  : {settings.embedding_model}")
    logger.info("=" * 60)

    # Ensure required directories exist
    for directory in [
        settings.upload_dir,
        settings.curriculum_docs_dir,
        settings.chroma_persist_dir,
    ]:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"  Directory ready: {directory}")

    # Pre-load the embedding model (avoids cold start on first request)
    try:
        from rag.embeddings import get_embeddings_service
        embeddings = get_embeddings_service()
        embeddings.embed_query("warmup")
        logger.info(f"  Embedding model loaded: {settings.embedding_model}")
    except Exception as e:
        logger.warning(f"  Embedding model warmup failed: {e}")

    # Initialize ChromaDB connection
    try:
        from vector_db.chroma_client import get_chroma_client
        chroma = get_chroma_client()
        curriculum_count = chroma.get_collection_count("curriculum")
        lesson_count = chroma.get_collection_count("lesson_plans")
        logger.info(f"  ChromaDB ready | Curriculum: {curriculum_count} chunks | Lesson Plans: {lesson_count} chunks")
    except Exception as e:
        logger.warning(f"  ChromaDB initialization warning: {e}")

    # Check Gemini / AI provider availability
    try:
        from services.ai_provider import get_ai_service
        from services.gemini_service import get_gemini_service
        gemini = get_gemini_service()
        if gemini.is_configured():
            available = await gemini.is_available()
            if available:
                logger.info(f"  Google Gemini connected | Model: {settings.gemini_model}")
            else:
                logger.warning(
                    "  Gemini API key configured but unreachable — check GEMINI_API_KEY. "
                    "Falling back to Ollama if available."
                )
        else:
            logger.warning(
                "  GEMINI_API_KEY not configured. Add it to .env to use Google Gemini. "
                "Falling back to Ollama for local generation."
            )
            from services.ollama_service import get_ollama_service
            ollama = get_ollama_service()
            available = await ollama.is_available()
            if available:
                model = await ollama.get_active_model()
                logger.info(f"  Ollama fallback connected | Active model: {model}")
            else:
                logger.warning(
                    "  Ollama not available either. "
                    "Lesson plans will use the built-in template builder."
                )
    except Exception as e:
        logger.warning(f"  AI provider check failed: {e}")

    # Auto-ingest curriculum_docs directory if it has files
    # Runs in background thread so it doesn't block startup or requests
    try:
        docs_dir = settings.curriculum_docs_dir
        if os.path.exists(docs_dir):
            supported = {".pdf", ".docx", ".doc", ".txt"}
            doc_files = [
                f for f in Path(docs_dir).rglob("*")
                if f.is_file() and f.suffix.lower() in supported
            ]
            if doc_files:
                # Check how many chunks are already indexed
                from vector_db.chroma_client import get_chroma_client as _get_chroma
                _chroma = _get_chroma()
                already_indexed = _chroma.get_collection_count("curriculum")

                # Estimate expected chunks: ~10 chunks per document on average
                # Re-ingest if we have significantly fewer chunks than expected
                expected_min_chunks = len(doc_files) * 5  # conservative: 5 chunks/doc minimum

                if already_indexed < expected_min_chunks:
                    logger.info(
                        f"  Found {len(doc_files)} curriculum documents. "
                        f"Currently indexed: {already_indexed} chunks "
                        f"(expected ≥ {expected_min_chunks}). Starting background ingestion…"
                    )
                    from rag.document_processor import DocumentProcessor

                    def _ingest_all():
                        """Ingest all curriculum docs in a background thread."""
                        processor = DocumentProcessor()
                        success = 0
                        failed = 0
                        for file_path in doc_files:
                            try:
                                subfolder = file_path.parent.name
                                meta = {}
                                if subfolder != Path(docs_dir).name:
                                    meta["category"] = subfolder
                                processor.ingest_document(str(file_path), "curriculum", meta)
                                success += 1
                                logger.info(f"  Ingested: {file_path.name}")
                            except Exception as exc:
                                failed += 1
                                logger.warning(f"  Failed to ingest {file_path.name}: {exc}")
                        final_count = _chroma.get_collection_count("curriculum")
                        logger.info(
                            f"  Ingestion complete: {success} succeeded, {failed} failed "
                            f"out of {len(doc_files)} documents. "
                            f"Total chunks in DB: {final_count}"
                        )

                    executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ingest")
                    asyncio.get_running_loop().run_in_executor(executor, _ingest_all)
                    logger.info("  Background ingestion started. Use GET /api/curriculum/ingest-status to monitor.")
                else:
                    logger.info(
                        f"  Curriculum already well-indexed: {already_indexed} chunks "
                        f"from {len(doc_files)} documents. Skipping re-ingestion."
                    )
            else:
                logger.info("  No curriculum documents found. Add PDFs to curriculum_docs/")
    except Exception as e:
        logger.warning(f"  Curriculum docs check warning: {e}")

    logger.info("  Educom AI Backend is ready!")
    logger.info("=" * 60)

    yield  # Application runs here

    logger.info("Educom AI Backend shutting down...")


# ── FastAPI Application ──────────────────────────────────────────────────────

settings = get_settings()

app = FastAPI(
    title="Educom AI Backend",
    description=(
        "AI-powered backend for the Educom Zambian education platform. "
        "Generates CBC-aligned lesson plans, assessments, and schemes of work "
        "using Ollama (phi3/mistral) with RAG from curriculum documents."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── Middleware ───────────────────────────────────────────────────────────────

# CORS — allow the Next.js frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Gzip compression for large responses
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ── Routes ───────────────────────────────────────────────────────────────────

app.include_router(health_router)
app.include_router(lesson_plans_router)
app.include_router(assessments_router)
app.include_router(assessment_intelligence_router)
app.include_router(curriculum_router)
app.include_router(chat_router)
app.include_router(pdf_export_router)


# ── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
