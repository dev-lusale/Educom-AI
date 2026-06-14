"""
Educom AI Backend — Document Processor
Handles PDF and DOCX ingestion, chunking, and storage into ChromaDB.
Supports curriculum documents, teacher guides, and lesson plan samples.
"""

import hashlib
import logging
import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Tuple

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from docx import Document as DocxDocument

from config.settings import get_settings
from vector_db.chroma_client import get_chroma_client

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    Processes uploaded documents for the RAG pipeline.

    Workflow:
    1. Extract text from PDF or DOCX
    2. Split into overlapping chunks
    3. Generate embeddings (via ChromaDB client)
    4. Store in ChromaDB with metadata
    """

    def __init__(self):
        settings = get_settings()
        self.chunk_size = settings.rag_chunk_size
        self.chunk_overlap = settings.rag_chunk_overlap
        self.chroma = get_chroma_client()

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract all text from a PDF file.

        Args:
            file_path: Path to the PDF file.

        Returns:
            Extracted text as a single string.
        """
        logger.info(f"Extracting text from PDF: {file_path}")
        reader = PdfReader(file_path)
        pages_text = []

        for page_num, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                pages_text.append(f"[Page {page_num + 1}]\n{text.strip()}")

        full_text = "\n\n".join(pages_text)
        logger.info(f"Extracted {len(full_text)} characters from {len(reader.pages)} pages")
        return full_text

    def extract_text_from_docx(self, file_path: str) -> str:
        """
        Extract all text from a DOCX file.

        Args:
            file_path: Path to the DOCX file.

        Returns:
            Extracted text as a single string.
        """
        logger.info(f"Extracting text from DOCX: {file_path}")
        doc = DocxDocument(file_path)
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        full_text = "\n\n".join(paragraphs)
        logger.info(f"Extracted {len(full_text)} characters from DOCX")
        return full_text

    def extract_text(self, file_path: str) -> Tuple[str, str]:
        """
        Auto-detect file type and extract text.

        Returns:
            Tuple of (extracted_text, file_type)
        """
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext == ".pdf":
            return self.extract_text_from_pdf(file_path), "pdf"
        elif ext in (".docx", ".doc"):
            return self.extract_text_from_docx(file_path), "docx"
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read(), "txt"
        else:
            raise ValueError(f"Unsupported file type: {ext}. Supported: PDF, DOCX, TXT")

    def chunk_text(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks for embedding.

        Args:
            text: Full document text.

        Returns:
            List of text chunks.
        """
        chunks = self.text_splitter.split_text(text)
        # Filter out very short chunks (likely noise)
        chunks = [c.strip() for c in chunks if len(c.strip()) > 50]
        logger.info(f"Created {len(chunks)} chunks from document")
        return chunks

    def ingest_document(
        self,
        file_path: str,
        collection_name: str = "curriculum",
        metadata: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """
        Full ingestion pipeline: extract → chunk → embed → store.

        Args:
            file_path: Path to the document file.
            collection_name: Target ChromaDB collection.
            metadata: Additional metadata to attach to all chunks.

        Returns:
            Dict with ingestion statistics.
        """
        filename = Path(file_path).name

        # Step 1: Extract text
        text, file_type = self.extract_text(file_path)

        if not text.strip():
            raise ValueError(f"No text could be extracted from {filename}")

        # Step 2: Chunk the text
        chunks = self.chunk_text(text)

        if not chunks:
            raise ValueError(f"No valid chunks created from {filename}")

        # Step 3: Build metadata for each chunk
        base_metadata = {
            "source": filename,
            "file_type": file_type,
            "collection": collection_name,
        }
        if metadata:
            base_metadata.update(metadata)

        chunk_metadatas = []
        for i, chunk in enumerate(chunks):
            chunk_meta = {**base_metadata, "chunk_index": i, "total_chunks": len(chunks)}
            chunk_metadatas.append(chunk_meta)

        # Step 4: Generate unique IDs (hash-based to avoid duplicates)
        file_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        chunk_ids = [f"{file_hash}_chunk_{i}" for i in range(len(chunks))]

        # Step 5: Store in ChromaDB
        stored_count = self.chroma.add_documents(
            texts=chunks,
            metadatas=chunk_metadatas,
            ids=chunk_ids,
            collection_name=collection_name,
        )

        return {
            "filename": filename,
            "file_type": file_type,
            "chunks_created": len(chunks),
            "embeddings_stored": stored_count,
            "collection": collection_name,
        }

    def ingest_directory(
        self,
        directory: str,
        collection_name: str = "curriculum",
        metadata: Dict[str, Any] | None = None,
        recursive: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Ingest all supported documents from a directory (and subdirectories).

        Args:
            directory: Path to directory containing documents.
            collection_name: Target ChromaDB collection.
            metadata: Additional metadata for all documents.
            recursive: Whether to scan subdirectories (default True).

        Returns:
            List of ingestion results per file.
        """
        supported_extensions = {".pdf", ".docx", ".doc", ".txt"}
        results = []

        # Use rglob for recursive scan, glob for flat scan
        base_path = Path(directory)
        if recursive:
            all_files = [
                f for f in base_path.rglob("*")
                if f.is_file() and f.suffix.lower() in supported_extensions
            ]
        else:
            all_files = [
                f for f in base_path.iterdir()
                if f.is_file() and f.suffix.lower() in supported_extensions
            ]

        logger.info(f"Found {len(all_files)} documents to ingest from {directory}")

        for file_path in all_files:
            try:
                # Add subfolder name as metadata context
                subfolder = file_path.parent.name
                file_metadata = {**(metadata or {})}
                if subfolder != Path(directory).name:
                    file_metadata["category"] = subfolder

                logger.info(f"Ingesting [{subfolder}]: {file_path.name}")
                result = self.ingest_document(
                    str(file_path), collection_name, file_metadata
                )
                results.append({"status": "success", **result})
            except Exception as e:
                logger.error(f"Failed to ingest {file_path.name}: {e}")
                results.append(
                    {
                        "status": "error",
                        "filename": file_path.name,
                        "error": str(e),
                    }
                )

        logger.info(f"Directory ingestion complete: {len(results)} files processed")
        return results


def get_document_processor() -> DocumentProcessor:
    """Returns a DocumentProcessor instance."""
    return DocumentProcessor()
