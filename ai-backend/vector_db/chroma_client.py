"""
Educom AI Backend — ChromaDB Client
Manages the vector database for curriculum content and lesson plan samples.
Provides semantic search capabilities for the RAG pipeline.
"""

import logging
import os
from typing import List, Optional, Dict, Any
from functools import lru_cache

import chromadb
from chromadb.config import Settings as ChromaSettings

from config.settings import get_settings
from rag.embeddings import get_embeddings_service

logger = logging.getLogger(__name__)


class ChromaDBClient:
    """
    Manages ChromaDB collections for the Educom RAG system.

    Collections:
    - zambia_curriculum: Stores chunks from curriculum PDFs and guides
    - lesson_plan_samples: Stores example lesson plans for reference
    """

    def __init__(self):
        settings = get_settings()
        self.persist_dir = settings.chroma_persist_dir
        self.curriculum_collection_name = settings.chroma_collection_curriculum
        self.lesson_plans_collection_name = settings.chroma_collection_lesson_plans
        self._client: chromadb.PersistentClient | None = None
        self._embeddings = get_embeddings_service()

    def _get_client(self) -> chromadb.PersistentClient:
        """Lazy-initialize the ChromaDB persistent client."""
        if self._client is None:
            # Ensure the persistence directory exists
            os.makedirs(self.persist_dir, exist_ok=True)

            logger.info(f"Initializing ChromaDB at: {self.persist_dir}")
            self._client = chromadb.PersistentClient(
                path=self.persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            logger.info("ChromaDB client initialized.")
        return self._client

    def get_curriculum_collection(self) -> chromadb.Collection:
        """Get or create the curriculum content collection."""
        client = self._get_client()
        return client.get_or_create_collection(
            name=self.curriculum_collection_name,
            metadata={
                "description": "Zambia curriculum documents and teacher guides",
                "hnsw:space": "cosine",
                "hnsw:construction_ef": 100,
                "hnsw:M": 16,
            },
        )

    def get_lesson_plans_collection(self) -> chromadb.Collection:
        """Get or create the lesson plan samples collection."""
        client = self._get_client()
        return client.get_or_create_collection(
            name=self.lesson_plans_collection_name,
            metadata={"description": "Sample lesson plans for RAG reference"},
        )

    def get_user_resources_collection(self) -> chromadb.Collection:
        """Get or create the teacher-uploaded resources collection."""
        client = self._get_client()
        return client.get_or_create_collection(
            name="user_resources",
            metadata={"description": "Teacher-uploaded personal resources for personalised RAG"},
        )

    def add_documents(
        self,
        texts: List[str],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
        collection_name: str = "curriculum",
    ) -> int:
        """
        Add document chunks to a ChromaDB collection.

        Args:
            texts: List of text chunks to store.
            metadatas: List of metadata dicts (source, grade, subject, etc.).
            ids: Unique IDs for each chunk.
            collection_name: Which collection to use ('curriculum' or 'lesson_plans').

        Returns:
            Number of documents successfully added.
        """
        if not texts:
            return 0

        # Generate embeddings for all chunks
        logger.info(f"Generating embeddings for {len(texts)} chunks...")
        embeddings = self._embeddings.embed_texts(texts)

        # Select the target collection
        if collection_name == "lesson_plans":
            collection = self.get_lesson_plans_collection()
        elif collection_name == "user_resources":
            collection = self.get_user_resources_collection()
        else:
            collection = self.get_curriculum_collection()

        # Add to ChromaDB in batches to avoid memory issues
        batch_size = 100
        total_added = 0

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i : i + batch_size]
            batch_embeddings = embeddings[i : i + batch_size]
            batch_metadatas = metadatas[i : i + batch_size]
            batch_ids = ids[i : i + batch_size]

            collection.add(
                documents=batch_texts,
                embeddings=batch_embeddings,
                metadatas=batch_metadatas,
                ids=batch_ids,
            )
            total_added += len(batch_texts)
            logger.info(f"Added batch {i // batch_size + 1}: {len(batch_texts)} chunks")

        logger.info(f"Total chunks stored in ChromaDB: {total_added}")
        return total_added

    def search(
        self,
        query: str,
        collection_name: str = "curriculum",
        top_k: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search in a ChromaDB collection.

        Args:
            query: The search query text.
            collection_name: Which collection to search.
            top_k: Number of results to return.
            where: Optional metadata filter (e.g., {"grade": "Grade 9"}).

        Returns:
            List of result dicts with 'content', 'metadata', and 'distance'.
        """
        # Generate query embedding
        query_embedding = self._embeddings.embed_query(query)

        # Select collection
        if collection_name == "lesson_plans":
            collection = self.get_lesson_plans_collection()
        elif collection_name == "user_resources":
            collection = self.get_user_resources_collection()
        else:
            collection = self.get_curriculum_collection()

        # Guard: if collection is empty, return nothing
        count = collection.count()
        if count == 0:
            return []

        # Build query kwargs
        query_kwargs: Dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, count),
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            query_kwargs["where"] = where

        results = collection.query(**query_kwargs)

        # Format results
        formatted = []
        if results["documents"] and results["documents"][0]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                formatted.append(
                    {
                        "content": doc,
                        "metadata": meta or {},
                        "distance": dist,
                        # Convert distance to a 0-1 relevance score
                        "relevance_score": max(0.0, 1.0 - dist),
                    }
                )

        return formatted

    def get_collection_count(self, collection_name: str = "curriculum") -> int:
        """Return the number of documents in a collection."""
        try:
            if collection_name == "lesson_plans":
                return self.get_lesson_plans_collection().count()
            elif collection_name == "user_resources":
                return self.get_user_resources_collection().count()
            return self.get_curriculum_collection().count()
        except Exception:
            return 0

    def delete_document(self, doc_id: str, collection_name: str = "curriculum") -> bool:
        """Delete a document by ID from a collection."""
        try:
            if collection_name == "lesson_plans":
                collection = self.get_lesson_plans_collection()
            elif collection_name == "user_resources":
                collection = self.get_user_resources_collection()
            else:
                collection = self.get_curriculum_collection()
            collection.delete(ids=[doc_id])
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False

    @property
    def is_connected(self) -> bool:
        """Check if ChromaDB is accessible."""
        try:
            self._get_client().heartbeat()
            return True
        except Exception:
            return False


@lru_cache()
def get_chroma_client() -> ChromaDBClient:
    """Returns a cached ChromaDB client instance."""
    return ChromaDBClient()
