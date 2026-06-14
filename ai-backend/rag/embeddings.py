"""
Educom AI Backend — Embeddings Service
Manages text embeddings for the RAG pipeline.

Uses chromadb's built-in ONNX-based embedding function (all-MiniLM-L6-v2)
which runs via onnxruntime — no PyTorch required. This is fully compatible
with Python 3.13 on Windows.
"""

import logging
import threading
from functools import lru_cache
from typing import List

from config.settings import get_settings

logger = logging.getLogger(__name__)


class EmbeddingsService:
    """
    Generates text embeddings using ChromaDB's built-in ONNX embedding function.
    Uses all-MiniLM-L6-v2 via onnxruntime — no PyTorch dependency needed.
    Thread-safe via a lock to prevent concurrent ONNX inference issues.
    """

    def __init__(self):
        settings = get_settings()
        self.model_name = settings.embedding_model
        self._ef = None
        self._lock = threading.Lock()

    def _get_embedding_function(self):
        """Lazy-load the ONNX embedding function on first use."""
        if self._ef is None:
            with self._lock:
                if self._ef is None:  # double-checked locking
                    logger.info(f"Loading ONNX embedding function: {self.model_name}")
                    from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
                    self._ef = ONNXMiniLM_L6_V2()
                    logger.info("Embedding function loaded successfully.")
        return self._ef

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of text strings.
        Thread-safe — uses a lock to prevent concurrent ONNX inference.
        """
        if not texts:
            return []

        ef = self._get_embedding_function()
        with self._lock:
            embeddings = ef(texts)
        # Convert numpy float32 to plain Python floats for ChromaDB compatibility
        return [[float(v) for v in emb] for emb in embeddings]

    def embed_query(self, query: str) -> List[float]:
        """
        Generate an embedding for a single query string.
        Thread-safe — uses a lock to prevent concurrent ONNX inference.
        """
        ef = self._get_embedding_function()
        with self._lock:
            embeddings = ef([query])
        # Convert numpy float32 to plain Python floats
        return [float(v) for v in embeddings[0]]

    @property
    def is_loaded(self) -> bool:
        """Check if the embedding function has been loaded."""
        return self._ef is not None


@lru_cache()
def get_embeddings_service() -> EmbeddingsService:
    """
    Returns a cached EmbeddingsService instance.
    The model is shared across all requests to avoid reloading.
    """
    return EmbeddingsService()
