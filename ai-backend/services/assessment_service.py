"""
Educom AI Backend — Assessment Intelligence Service
Handles Quiz, Exam Paper, and Marking Scheme generation using RAG + Google Gemini.
Primary AI: Google Gemini. Falls back to Ollama if Gemini is not configured.
"""

import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

from models.assessment_intelligence import (
    QuizRequest, QuizData,
    ExamRequest, ExamData,
    MarkingSchemeRequest, MarkingSchemeData,
)
from services.ai_provider import get_ai_service
from services.prompts import (
    QUIZ_SYSTEM_PROMPT,
    EXAM_SYSTEM_PROMPT,
    MARKING_SCHEME_SYSTEM_PROMPT,
    build_quiz_prompt,
    build_exam_prompt,
    build_marking_scheme_prompt,
)
from rag.retriever import get_retriever

logger = logging.getLogger(__name__)
_rag_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="assess_rag")


class AssessmentService:
    """
    Service for AI-powered assessment generation.

    Pipeline:
    1. Retrieve curriculum context via RAG (syllabi + past papers)
    2. Build prompt with context
    3. Generate with Google Gemini (or Ollama fallback)
    4. Parse and validate with Pydantic
    """

    def __init__(self):
        self.retriever = get_retriever()

    async def _get_ai(self):
        """Resolve AI provider: Gemini (primary) → Ollama (fallback)."""
        return await get_ai_service()

    # ── Quiz ──────────────────────────────────────────────────────────────────

    async def generate_quiz(self, request: QuizRequest) -> QuizData:
        loop = asyncio.get_event_loop()
        rag_result = await loop.run_in_executor(
            _rag_executor,
            lambda: self.retriever.retrieve_for_lesson_plan(
                request.grade, request.subject, request.topic,
                user_id=request.user_id, use_user_resources=bool(request.user_id),
            ),
        )
        curriculum_ctx = rag_result.get("curriculum_context", "")[:800]

        ai = await self._get_ai()
        if not await ai.is_available():
            raise RuntimeError("AI model unavailable. Please check your GEMINI_API_KEY.")

        prompt = build_quiz_prompt(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            difficulty=request.difficulty,
            num_mcq=request.num_mcq,
            num_short_answer=request.num_short_answer,
            num_structured=request.num_structured,
            learning_objectives=request.learning_objectives or "",
            curriculum_context=curriculum_ctx,
        )

        raw = await ai.generate_json(prompt=prompt, system_prompt=QUIZ_SYSTEM_PROMPT)
        return QuizData(**raw)

    # ── Exam ──────────────────────────────────────────────────────────────────

    async def generate_exam(self, request: ExamRequest) -> ExamData:
        loop = asyncio.get_event_loop()
        rag_result = await loop.run_in_executor(
            _rag_executor,
            lambda: self.retriever.retrieve_for_lesson_plan(
                request.grade, request.subject, request.topic,
                user_id=request.user_id, use_user_resources=bool(request.user_id),
            ),
        )
        curriculum_ctx = rag_result.get("curriculum_context", "")[:800]

        ai = await self._get_ai()
        if not await ai.is_available():
            raise RuntimeError("AI model unavailable. Please check your GEMINI_API_KEY.")

        prompt = build_exam_prompt(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            exam_type=request.exam_type,
            term=request.term,
            total_marks=request.total_marks,
            duration_minutes=request.duration_minutes,
            include_marking_scheme=request.include_marking_scheme,
            learning_objectives=request.learning_objectives or "",
            curriculum_context=curriculum_ctx,
        )

        raw = await ai.generate_json(prompt=prompt, system_prompt=EXAM_SYSTEM_PROMPT)
        return ExamData(**raw)

    # ── Marking Scheme ────────────────────────────────────────────────────────

    async def generate_marking_scheme(self, request: MarkingSchemeRequest) -> MarkingSchemeData:
        loop = asyncio.get_event_loop()
        rag_result = await loop.run_in_executor(
            _rag_executor,
            lambda: self.retriever.retrieve_for_lesson_plan(
                request.grade, request.subject, request.topic,
                user_id=request.user_id, use_user_resources=bool(request.user_id),
            ),
        )
        curriculum_ctx = rag_result.get("curriculum_context", "")[:800]

        ai = await self._get_ai()
        if not await ai.is_available():
            raise RuntimeError("AI model unavailable. Please check your GEMINI_API_KEY.")

        prompt = build_marking_scheme_prompt(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            exam_type=request.exam_type,
            term=request.term,
            total_marks=request.total_marks,
            duration_minutes=request.duration_minutes,
            learning_objectives=request.learning_objectives or "",
            curriculum_context=curriculum_ctx,
        )

        raw = await ai.generate_json(prompt=prompt, system_prompt=MARKING_SCHEME_SYSTEM_PROMPT)
        return MarkingSchemeData(**raw)


def get_assessment_service() -> AssessmentService:
    return AssessmentService()
