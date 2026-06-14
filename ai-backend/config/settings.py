"""
Educom AI Backend — Application Settings
Loads and validates all environment variables using Pydantic Settings.
"""

from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """
    Central configuration for the Educom AI backend.
    All values can be overridden via environment variables or .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Server ───────────────────────────────────────────────────
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=False, description="Enable debug mode")
    environment: str = Field(default="production", description="Runtime environment")

    # ── CORS ─────────────────────────────────────────────────────
    allowed_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated allowed CORS origins",
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated origins into a list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # ── Google Gemini (Primary AI Provider) ─────────────────────
    gemini_api_key: str = Field(
        default="",
        description="Google AI Studio API key (get one free at aistudio.google.com)",
    )
    gemini_model: str = Field(
        default="gemini-2.0-flash",
        description="Gemini model to use (gemini-2.0-flash recommended)",
    )

    # ── Ollama (Local fallback when Gemini is not configured) ────
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        description="Ollama server base URL",
    )
    ollama_model: str = Field(
        default="phi3",
        description="Primary Ollama model name",
    )
    ollama_fallback_model: str = Field(
        default="mistral",
        description="Fallback model if primary is unavailable",
    )

    # ── AI Generation ────────────────────────────────────────────
    ai_max_tokens: int = Field(default=8192, description="Max generation tokens")
    ai_temperature: float = Field(default=0.7, description="Generation temperature")
    ai_timeout: int = Field(default=60, description="AI request timeout (seconds)")

    # ── ChromaDB ─────────────────────────────────────────────────
    chroma_persist_dir: str = Field(
        default="./vector_db/chroma_store",
        description="ChromaDB persistence directory",
    )
    chroma_collection_curriculum: str = Field(
        default="zambia_curriculum",
        description="ChromaDB collection for curriculum content",
    )
    chroma_collection_lesson_plans: str = Field(
        default="lesson_plan_samples",
        description="ChromaDB collection for lesson plan samples",
    )

    # ── Embeddings ───────────────────────────────────────────────
    embedding_model: str = Field(
        default="all-MiniLM-L6-v2",
        description="Sentence transformer model for embeddings",
    )

    # ── Document Storage ─────────────────────────────────────────
    upload_dir: str = Field(default="./uploads", description="Uploaded files directory")
    curriculum_docs_dir: str = Field(
        default="./curriculum_docs",
        description="Pre-loaded curriculum documents directory",
    )
    max_upload_size_mb: int = Field(
        default=50, description="Maximum upload file size in MB"
    )

    # ── RAG Settings ─────────────────────────────────────────────
    rag_top_k: int = Field(
        default=5, description="Number of relevant chunks to retrieve"
    )
    rag_chunk_size: int = Field(
        default=1000, description="Document chunk size in characters"
    )
    rag_chunk_overlap: int = Field(
        default=200, description="Overlap between document chunks"
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    Using lru_cache ensures settings are only loaded once per process.
    """
    return Settings()
