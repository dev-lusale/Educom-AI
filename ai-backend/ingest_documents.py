"""
Educom AI Backend — Standalone Document Ingestion Script
Run this directly to ingest all curriculum documents into ChromaDB.

Usage:
    python ingest_documents.py

This runs independently of the FastAPI server, so the server stays
fully responsive while documents are being processed.
"""

import logging
import sys
import time
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def main():
    from config.settings import get_settings
    from rag.document_processor import get_document_processor
    from vector_db.chroma_client import get_chroma_client

    settings = get_settings()
    docs_dir = settings.curriculum_docs_dir

    # Count all documents
    supported = {".pdf", ".docx", ".doc", ".txt"}
    all_files = sorted([
        f for f in Path(docs_dir).rglob("*")
        if f.is_file() and f.suffix.lower() in supported
    ])

    if not all_files:
        logger.error(f"No documents found in {docs_dir}")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("  Educom AI — Document Ingestion")
    logger.info("=" * 60)
    logger.info(f"  Documents found : {len(all_files)}")
    logger.info(f"  ChromaDB path   : {settings.chroma_persist_dir}")
    logger.info("=" * 60)

    # Show breakdown by folder
    from collections import Counter
    folders = Counter(f.parent.name for f in all_files)
    for folder, count in sorted(folders.items()):
        logger.info(f"  {folder}: {count} files")
    logger.info("=" * 60)

    processor = get_document_processor()
    chroma = get_chroma_client()

    successful = 0
    failed = 0
    skipped = 0
    start_time = time.time()

    for i, file_path in enumerate(all_files, 1):
        subfolder = file_path.parent.name
        metadata = {"category": subfolder} if subfolder != Path(docs_dir).name else {}

        elapsed = time.time() - start_time
        eta = (elapsed / i) * (len(all_files) - i) if i > 1 else 0

        logger.info(
            f"[{i}/{len(all_files)}] {subfolder}/{file_path.name} "
            f"(ETA: {int(eta//60)}m {int(eta%60)}s)"
        )

        try:
            result = processor.ingest_document(
                str(file_path),
                collection_name="curriculum",
                metadata=metadata,
            )
            successful += 1
            logger.info(
                f"  ✓ {result['chunks_created']} chunks | "
                f"{result['embeddings_stored']} embeddings stored"
            )
        except Exception as e:
            failed += 1
            logger.error(f"  ✗ FAILED: {e}")

    # Final summary
    total_time = time.time() - start_time
    total_chunks = chroma.get_collection_count("curriculum")

    logger.info("")
    logger.info("=" * 60)
    logger.info("  INGESTION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"  Successful  : {successful}/{len(all_files)} documents")
    logger.info(f"  Failed      : {failed} documents")
    logger.info(f"  Total chunks: {total_chunks} searchable chunks in ChromaDB")
    logger.info(f"  Time taken  : {int(total_time//60)}m {int(total_time%60)}s")
    logger.info("=" * 60)
    logger.info("")
    logger.info("Your documents are now loaded into the RAG system.")
    logger.info("Restart the AI backend to use the new knowledge.")
    logger.info("")


if __name__ == "__main__":
    main()
