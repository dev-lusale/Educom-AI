"""
Educom AI Backend — RAG Retriever
Retrieves relevant curriculum context before AI generation.
This is the core of the Retrieval Augmented Generation pipeline.
"""

import logging
from typing import List, Optional, Dict, Any

from config.settings import get_settings
from vector_db.chroma_client import get_chroma_client

logger = logging.getLogger(__name__)


class CurriculumRetriever:
    """
    Retrieves relevant curriculum content from ChromaDB to augment AI generation.

    The retriever builds a context string from the most semantically similar
    curriculum chunks, which is then injected into the AI prompt.
    """

    def __init__(self):
        self.settings = get_settings()
        self.chroma = get_chroma_client()
        self.top_k = self.settings.rag_top_k

    def retrieve_for_lesson_plan(
        self,
        grade: str,
        subject: str,
        topic: str,
        user_id: str | None = None,
        use_user_resources: bool = False,
    ) -> Dict[str, Any]:
        """
        Retrieve curriculum context relevant to a lesson plan request.

        Performs up to three searches:
        1. Curriculum collection — for syllabus content and learning objectives
        2. Lesson plans collection — for example lesson structures
        3. User resources collection — teacher's own uploaded documents (if user_id provided)

        Args:
            grade: Grade level (e.g., "Grade 9")
            subject: Subject name (e.g., "Mathematics")
            topic: Lesson topic (e.g., "Quadratic Equations")
            user_id: Optional teacher user ID to retrieve personal resources
            use_user_resources: Whether to include teacher's uploaded resources

        Returns:
            Dict with 'curriculum_context', 'example_context', 'user_context', and 'has_context'.
        """
        query = f"{grade} {subject} {topic} Zambia curriculum lesson plan"

        # Build metadata filter for grade/subject if data exists
        curriculum_filter = self._build_filter(grade=grade, subject=subject)

        # Search curriculum collection
        curriculum_results = self.chroma.search(
            query=query,
            collection_name="curriculum",
            top_k=self.top_k,
            where=curriculum_filter,
        )

        # If filtered search returns nothing, try without filter
        if not curriculum_results and curriculum_filter:
            curriculum_results = self.chroma.search(
                query=query,
                collection_name="curriculum",
                top_k=self.top_k,
            )

        # Search lesson plan samples collection
        example_results = self.chroma.search(
            query=f"{subject} {topic} lesson plan activities",
            collection_name="lesson_plans",
            top_k=3,
        )

        # Search teacher's personal uploaded resources
        user_results = []
        if use_user_resources and user_id:
            try:
                user_results = self.chroma.search(
                    query=f"{grade} {subject} {topic}",
                    collection_name="user_resources",
                    top_k=5,
                    where={"user_id": {"$eq": user_id}},
                )
            except Exception as e:
                logger.warning(f"User resources retrieval failed (filtered): {e}")
                # Fallback: unfiltered search (less precise but still useful)
                try:
                    all_user_results = self.chroma.search(
                        query=f"{grade} {subject} {topic}",
                        collection_name="user_resources",
                        top_k=5,
                        where=None,
                    )
                    # Filter in Python by description field (legacy format)
                    user_results = [
                        r for r in all_user_results
                        if user_id in r.get("metadata", {}).get("description", "")
                        or r.get("metadata", {}).get("user_id", "") == user_id
                    ]
                except Exception as e2:
                    logger.warning(f"User resources fallback retrieval failed: {e2}")
                    user_results = []

        curriculum_context = self._format_context(curriculum_results, "Curriculum Content")
        example_context = self._format_context(example_results, "Example Lesson Plans")
        user_context = self._format_context(user_results, "Teacher's Personal Resources")

        has_context = bool(curriculum_results or example_results or user_results)

        logger.info(
            f"RAG retrieval: {len(curriculum_results)} curriculum chunks, "
            f"{len(example_results)} example chunks, "
            f"{len(user_results)} personal resource chunks "
            f"for {grade} {subject} - {topic}"
        )

        return {
            "curriculum_context": curriculum_context,
            "example_context": example_context,
            "user_context": user_context,
            "has_context": has_context,
            "curriculum_chunks": len(curriculum_results),
            "example_chunks": len(example_results),
            "user_chunks": len(user_results),
        }

    def retrieve_for_assessment(
        self,
        grade: str,
        subject: str,
        topic: str,
    ) -> Dict[str, Any]:
        """
        Retrieve exam paper context specifically for assessment generation.

        Runs two targeted searches:
        1. Exam papers matching grade + subject — for ECZ style/difficulty calibration
        2. Syllabus/curriculum content — for learning objective alignment

        Args:
            grade:   Grade level (e.g. "Grade 9")
            subject: Subject name (e.g. "Mathematics")
            topic:   Topic being assessed (e.g. "Quadratic Equations")

        Returns:
            Dict with 'curriculum_context', 'exam_paper_context', 'has_context'.
        """
        # ── 1. Exam papers ────────────────────────────────────────────────
        exam_filter: Optional[Dict[str, Any]] = None
        count = self.chroma.get_collection_count("curriculum")
        if count >= 10:
            exam_filter = {
                "$and": [
                    {"category": {"$eq": "exam_paper"}},
                    {"grade": {"$eq": grade}},
                    {"subject": {"$eq": subject}},
                ]
            }

        exam_results = self.chroma.search(
            query=f"{grade} {subject} {topic} ECZ examination question",
            collection_name="curriculum",
            top_k=self.top_k,
            where=exam_filter,
        )

        # Fallback: grade+subject filter only (no category filter)
        if not exam_results and exam_filter:
            exam_results = self.chroma.search(
                query=f"{grade} {subject} {topic}",
                collection_name="curriculum",
                top_k=self.top_k,
                where=self._build_filter(grade=grade, subject=subject),
            )

        # ── 2. Curriculum / syllabus content ──────────────────────────────
        syllabus_results = self.chroma.search(
            query=f"{grade} {subject} {topic} learning objectives syllabus",
            collection_name="curriculum",
            top_k=3,
        )

        exam_context = self._format_context(exam_results, "ECZ Past Paper Reference",
                                            max_chars_per_chunk=700, max_total_chars=2500)
        curriculum_context = self._format_context(syllabus_results, "Curriculum/Syllabus Content",
                                                   max_chars_per_chunk=500, max_total_chars=1200)

        has_context = bool(exam_results or syllabus_results)

        logger.info(
            f"Assessment RAG: {len(exam_results)} exam paper chunks, "
            f"{len(syllabus_results)} syllabus chunks for {grade} {subject} - {topic}"
        )

        return {
            "curriculum_context": curriculum_context,
            "exam_paper_context": exam_context,
            "has_context": has_context,
        }

    def retrieve_for_search(
        self,
        query: str,
        grade: Optional[str] = None,
        subject: Optional[str] = None,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Perform a general curriculum search.

        Args:
            query: Search query text.
            grade: Optional grade filter.
            subject: Optional subject filter.
            top_k: Number of results.

        Returns:
            List of search result dicts.
        """
        metadata_filter = self._build_filter(grade=grade, subject=subject)

        results = self.chroma.search(
            query=query,
            collection_name="curriculum",
            top_k=top_k,
            where=metadata_filter if metadata_filter else None,
        )

        # If filtered search returns nothing, try without filter
        if not results and metadata_filter:
            results = self.chroma.search(
                query=query,
                collection_name="curriculum",
                top_k=top_k,
            )

        return results

    def _build_filter(
        self,
        grade: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Build a ChromaDB metadata filter.
        Only applies filter if the collection has enough data.
        """
        # Only filter if we have data in the collection
        count = self.chroma.get_collection_count("curriculum")
        if count < 10:
            return None

        conditions = []
        if grade:
            conditions.append({"grade": {"$eq": grade}})
        if subject:
            conditions.append({"subject": {"$eq": subject}})

        if len(conditions) == 0:
            return None
        elif len(conditions) == 1:
            return conditions[0]
        else:
            return {"$and": conditions}

    def _format_context(
        self,
        results: List[Dict[str, Any]],
        section_title: str,
        max_chars_per_chunk: int = 600,
        max_total_chars: int = 2000,
    ) -> str:
        """
        Format search results into a context string for the AI prompt.
        Chunks are trimmed to keep the total prompt size manageable.
        OpenRouter models support large context windows, so we allow generous limits.
        """
        if not results:
            return ""

        lines = [f"[{section_title}]"]
        total = 0
        for i, result in enumerate(results, 1):
            source = result.get("metadata", {}).get("source", "Unknown")
            content = result.get("content", "").strip()
            if not content:
                continue
            trimmed = content[:max_chars_per_chunk]
            entry = f"[{source}] {trimmed}"
            if total + len(entry) > max_total_chars:
                break
            lines.append(entry)
            total += len(entry)

        return "\n".join(lines)


def get_retriever() -> CurriculumRetriever:
    """Returns a CurriculumRetriever instance."""
    return CurriculumRetriever()
