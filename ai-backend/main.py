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
    logger.info(f"  AI Provider : EduCom AI via OpenRouter (primary) / Ollama (fallback)")
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

    # Check OpenRouter / AI provider availability
    try:
        from services.openrouter_service import get_openrouter_service
        from services.ollama_service import get_ollama_service
        openrouter = get_openrouter_service()
        if openrouter.is_configured():
            available = await openrouter.is_available()
            if available:
                logger.info("  EduCom AI (OpenRouter) connected and ready")
            else:
                logger.warning(
                    "  OPENROUTER_API_KEY configured but OpenRouter unreachable — "
                    "check your key or network. Falling back to Ollama if available."
                )
        else:
            logger.warning(
                "  OPENROUTER_API_KEY not configured. Add it to .env to enable EduCom AI. "
                "Falling back to Ollama for local generation."
            )
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

    # Auto-ingest curriculum_docs directory on startup
    # Uses a folder-content hash to detect new/changed files — avoids
    # redundant re-ingestion on every redeploy while ensuring new papers
    # are always picked up.
    try:
        from rag.exam_paper_parser import build_exam_paper_metadata
        from rag.document_processor import DocumentProcessor
        from vector_db.chroma_client import get_chroma_client as _get_chroma

        _chroma      = _get_chroma()
        docs_dir     = settings.curriculum_docs_dir
        supported    = {".pdf", ".docx", ".doc", ".txt"}

        if os.path.exists(docs_dir):
            all_doc_files = [
                f for f in Path(docs_dir).rglob("*")
                if f.is_file() and f.suffix.lower() in supported
            ]

            # Separate exam papers from general curriculum docs
            exam_papers_dir  = Path(docs_dir) / "exam_papers"
            exam_paper_files = [
                f for f in all_doc_files
                if f.parent == exam_papers_dir or "exam_paper" in str(f.parent).lower()
            ]
            other_doc_files  = [f for f in all_doc_files if f not in exam_paper_files]

            logger.info(
                f"  Found {len(all_doc_files)} curriculum documents "
                f"({len(exam_paper_files)} exam papers, {len(other_doc_files)} other)"
            )

            # ── Folder-content hash: SHA1 of sorted filename+size pairs ─────
            # Changes only when files are added, removed, or replaced.
            def _folder_hash(files: list) -> str:
                sig = "|".join(
                    sorted(f"{f.name}:{f.stat().st_size}" for f in files)
                )
                import hashlib
                return hashlib.sha1(sig.encode()).hexdigest()[:12]

            # Hash stored in a tiny sentinel file next to the vector DB
            sentinel_path = Path(settings.chroma_persist_dir) / ".ingest_hash"

            def _read_sentinel() -> str:
                try:
                    return sentinel_path.read_text().strip()
                except Exception:
                    return ""

            def _write_sentinel(h: str):
                try:
                    sentinel_path.write_text(h)
                except Exception:
                    pass

            current_hash  = _folder_hash(all_doc_files)
            previous_hash = _read_sentinel()
            already_indexed = _chroma.get_collection_count("curriculum")

            needs_ingest = (
                current_hash != previous_hash
                or already_indexed < len(all_doc_files) * 3   # safety net
            )

            if not needs_ingest:
                logger.info(
                    f"  Curriculum already up-to-date: {already_indexed} chunks, "
                    f"hash={current_hash}. Skipping ingestion."
                )
            else:
                logger.info(
                    f"  New/changed documents detected (hash {previous_hash!r} → {current_hash!r}). "
                    f"Starting background ingestion of {len(all_doc_files)} files…"
                )

                def _ingest_all():
                    processor = DocumentProcessor()
                    success = failed = 0

                    # ── 1. Exam papers — rich filename metadata ───────────────
                    for file_path in exam_paper_files:
                        try:
                            meta = build_exam_paper_metadata(str(file_path))
                            processor.ingest_document(
                                str(file_path), "curriculum", meta
                            )
                            success += 1
                            logger.info(
                                f"  [exam_paper] ✓ {file_path.name} "
                                f"→ {meta.get('subject','')} {meta.get('grade','')} {meta.get('year','')}"
                            )
                        except Exception as exc:
                            failed += 1
                            logger.warning(f"  [exam_paper] ✗ {file_path.name}: {exc}")

                    # ── 2. Other curriculum docs (syllabi, guides, etc.) ──────
                    for file_path in other_doc_files:
                        try:
                            subfolder = file_path.parent.name
                            meta: dict = {}
                            if subfolder.lower() != Path(docs_dir).name.lower():
                                meta["category"] = subfolder
                            processor.ingest_document(
                                str(file_path), "curriculum", meta
                            )
                            success += 1
                            logger.info(f"  [curriculum] ✓ {file_path.name}")
                        except Exception as exc:
                            failed += 1
                            logger.warning(f"  [curriculum] ✗ {file_path.name}: {exc}")

                    final_count = _chroma.get_collection_count("curriculum")
                    logger.info(
                        f"  Ingestion complete — {success} succeeded, {failed} failed "
                        f"| Total chunks in DB: {final_count}"
                    )
                    _write_sentinel(current_hash)

                executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ingest")
                asyncio.get_running_loop().run_in_executor(executor, _ingest_all)
                logger.info(
                    "  Background ingestion started. "
                    "Poll GET /api/curriculum/ingest-status for progress."
                )
        else:
            logger.info(f"  curriculum_docs directory not found at: {docs_dir}")

    except Exception as e:
        logger.warning(f"  Curriculum ingestion startup error: {e}", exc_info=True)

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
        "using EduCom AI (OpenRouter) with RAG from Zambian curriculum documents."
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
