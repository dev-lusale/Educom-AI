"""
Educom AI Backend — Health Check Route
Provides system status for monitoring and frontend connectivity checks.
"""

import logging
from fastapi import APIRouter
from pydantic import BaseModel

from services.ai_provider import get_ai_service
from services.openrouter_service import get_openrouter_service
from vector_db.chroma_client import get_chroma_client
from rag.embeddings import get_embeddings_service
from config.settings import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    ai_provider: str
    ai_model: str
    ai_connected: bool
    chroma_connected: bool
    embeddings_loaded: bool
    version: str = "1.0.0"


@router.get("/health", response_model=HealthResponse, summary="System health check")
async def health_check() -> HealthResponse:
    """
    Check the health of all system components:
    - AI provider (OpenRouter or Ollama fallback)
    - ChromaDB vector database
    - Sentence transformer embeddings
    """
    settings = get_settings()
    openrouter = get_openrouter_service()
    chroma = get_chroma_client()
    embeddings = get_embeddings_service()

    # Determine active AI provider and check availability
    if openrouter.is_configured():
        ai_available = await openrouter.is_available()
        ai_provider = "EduCom AI (OpenRouter)"
        # Report the default chat model — never expose the underlying model name to clients
        ai_model = "EduCom AI"
    else:
        from services.ollama_service import get_ollama_service
        ollama = get_ollama_service()
        ai_available = await ollama.is_available()
        ai_provider = "Ollama (local fallback)"
        ai_model = settings.ollama_model
        if ai_available:
            try:
                ai_model = await ollama.get_active_model()
            except Exception:
                pass

    # Check ChromaDB
    chroma_connected = chroma.is_connected

    # Check embeddings
    embeddings_loaded = True
    try:
        embeddings.embed_query("test")
    except Exception:
        embeddings_loaded = False

    overall_status = "healthy" if (ai_available and chroma_connected) else "degraded"
    if not ai_available and not chroma_connected:
        overall_status = "unhealthy"

    return HealthResponse(
        status=overall_status,
        ai_provider=ai_provider,
        ai_model=ai_model,
        ai_connected=ai_available,
        chroma_connected=chroma_connected,
        embeddings_loaded=embeddings_loaded,
    )


@router.get("/", summary="API root")
async def root():
    """API root — returns basic info."""
    return {
        "name": "Educom AI Backend",
        "version": "1.0.0",
        "description": "AI-powered Zambian education platform backend",
        "docs": "/docs",
        "health": "/health",
    }
