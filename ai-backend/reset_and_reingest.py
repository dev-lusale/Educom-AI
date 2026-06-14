"""
Reset ChromaDB and re-ingest all curriculum documents from scratch.
Run this when the vector index is corrupted or needs to be rebuilt.
"""
import sys
import time
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

sys.path.insert(0, '.')


def main():
    from config.settings import get_settings
    settings = get_settings()

    logger.info("=" * 60)
    logger.info("  Educom AI — Reset & Re-ingest")
    logger.info("=" * 60)

    # Step 1: Delete the existing collection
    import chromadb
    from chromadb.config import Settings as ChromaSettings

    logger.info("Connecting to ChromaDB...")
    client = chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    try:
        old_count = client.get_collection(settings.chroma_collection_curriculum).count()
        logger.info(f"Deleting existing collection '{settings.chroma_collection_curriculum}' ({old_count} chunks)...")
        client.delete_collection(settings.chroma_collection_curriculum)
        logger.info("Collection deleted.")
    except Exception as e:
        logger.info(f"No existing collection to delete: {e}")

    # Step 2: Re-create collection with optimized HNSW settings
    logger.info("Creating fresh collection with optimized HNSW settings...")
    client.create_collection(
        name=settings.chroma_collection_curriculum,
        metadata={
            "description": "Zambia curriculum documents and teacher guides",
            "hnsw:space": "cosine",
            "hnsw:construction_ef": 100,
            "hnsw:M": 16,
        },
    )
    logger.info("Fresh collection created.")

    # Step 3: Re-ingest all documents
    docs_dir = settings.curriculum_docs_dir
    supported = {".pdf", ".docx", ".doc", ".txt"}
    all_files = sorted([
        f for f in Path(docs_dir).rglob("*")
        if f.is_file() and f.suffix.lower() in supported
    ])

    if not all_files:
        logger.error(f"No documents found in {docs_dir}")
        sys.exit(1)

    logger.info(f"Found {len(all_files)} documents to ingest")
    logger.info("=" * 60)

    from rag.document_processor import get_document_processor
    processor = get_document_processor()

    successful = 0
    failed = 0
    start_time = time.time()

    for i, file_path in enumerate(all_files, 1):
        subfolder = file_path.parent.name
        metadata = {}
        if subfolder != Path(docs_dir).name:
            metadata["category"] = subfolder

        elapsed = time.time() - start_time
        eta = (elapsed / i) * (len(all_files) - i) if i > 1 else 0

        logger.info(
            f"[{i}/{len(all_files)}] {subfolder}/{file_path.name} "
            f"(ETA: {int(eta//60)}m {int(eta%60)}s)"
        )

        try:
            result = processor.ingest_document(
                str(file_path),
                collection_name=settings.chroma_collection_curriculum,
                metadata=metadata,
            )
            successful += 1
            logger.info(
                f"  OK: {result['chunks_created']} chunks | "
                f"{result['embeddings_stored']} embeddings"
            )
        except Exception as e:
            failed += 1
            logger.error(f"  FAILED: {e}")

    # Final summary
    total_time = time.time() - start_time
    final_count = client.get_collection(settings.chroma_collection_curriculum).count()

    logger.info("")
    logger.info("=" * 60)
    logger.info("  INGESTION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"  Successful  : {successful}/{len(all_files)} documents")
    logger.info(f"  Failed      : {failed} documents")
    logger.info(f"  Total chunks: {final_count} searchable chunks in ChromaDB")
    logger.info(f"  Time taken  : {int(total_time//60)}m {int(total_time%60)}s")
    logger.info("=" * 60)

    # Step 4: Test search
    logger.info("Testing search speed...")
    from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
    ef = ONNXMiniLM_L6_V2()
    query_emb = ef(["Grade 9 Mathematics Quadratic Equations"])[0]

    col = client.get_collection(settings.chroma_collection_curriculum)
    t = time.time()
    results = col.query(
        query_embeddings=[query_emb],
        n_results=5,
        include=["documents", "metadatas", "distances"],
    )
    search_time = time.time() - t
    logger.info(f"Search completed in {search_time:.2f}s — {len(results['documents'][0])} results")
    if results["documents"][0]:
        logger.info(f"Top result: {results['documents'][0][0][:200]}")

    logger.info("")
    logger.info("Re-ingestion complete! Restart the AI backend to use the new index.")


if __name__ == "__main__":
    main()
