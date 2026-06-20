"""
Educom AI Backend — Lesson Plan Service
Orchestrates the full RAG + AI generation pipeline for lesson plans.
Primary AI: OpenRouter. Falls back to template builder if AI is unavailable.
"""

import logging
from datetime import datetime
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

from models.lesson_plan import (
    LessonPlanRequest,
    LessonPlanData,
    LessonStep,
    HomeworkData,
    CompetenciesData,
    SchemeOfWorkRequest,
    SchemeOfWorkData,
    AssessmentRequest,
    AssessmentData,
    HomeworkRequest,
    LearningOutcomesRequest,
)
from services.ai_provider import get_ai_service
from services.prompts import (
    LESSON_PLAN_SYSTEM_PROMPT,
    SCHEME_OF_WORK_SYSTEM_PROMPT,
    ASSESSMENT_SYSTEM_PROMPT,
    build_lesson_plan_prompt,
    build_scheme_of_work_prompt,
    build_assessment_prompt,
    build_homework_prompt,
    build_learning_outcomes_prompt,
)
from rag.retriever import get_retriever
from services.fallback_builder import build_fallback_lesson_plan

logger = logging.getLogger(__name__)

# Thread pool for running synchronous RAG/ChromaDB operations
_rag_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="rag")


class LessonPlanService:
    """
    Main service for AI-powered lesson plan generation.

    Pipeline:
    1. Retrieve relevant curriculum context (RAG)
    2. Build the AI prompt with context injected
    3. Generate with Ollama
    4. Parse and validate the response
    5. Fall back to template builder if AI fails
    """

    def __init__(self):
        self.retriever = get_retriever()

    async def _get_ai(self):
        """Resolve AI provider: OpenRouter (primary) or Ollama (fallback)."""
        return await get_ai_service()

    async def generate_lesson_plan(self, request: LessonPlanRequest) -> LessonPlanData:
        """Generate a complete lesson plan using RAG + EduCom AI (OpenRouter)."""
        grade = request.grade
        subject = request.subject
        topic = request.topic
        duration = request.duration or "40"
        school = request.school or ""
        department = request.department or ""
        teacher_name = request.teacher_name or ""
        enrollment = request.enrollment or ""
        date_str = request.date or datetime.now().strftime("%Y-%m-%d")

        # Format date for display
        formatted_date = self._format_date(date_str)

        # Step 1: Retrieve RAG context (run in thread pool — ChromaDB is synchronous)
        logger.info(f"Retrieving RAG context for: {grade} {subject} - {topic}")
        loop = asyncio.get_event_loop()
        rag_result = await loop.run_in_executor(
            _rag_executor,
            lambda: self.retriever.retrieve_for_lesson_plan(
                grade,
                subject,
                topic,
                user_id=request.user_id,
                use_user_resources=request.use_user_resources,
            ),
        )

        # Step 2: Resolve AI provider (OpenRouter → Ollama fallback)
        ai = await self._get_ai()
        ai_available = await ai.is_available()

        if not ai_available:
            logger.warning("AI provider not available. Using fallback template builder.")
            return build_fallback_lesson_plan(
                grade=grade,
                subject=subject,
                topic=topic,
                duration=duration,
                school=school,
                department=department,
                teacher_name=teacher_name,
                enrollment=enrollment,
                date=formatted_date,
            )

        # Step 3: Build prompt with RAG context
        # OpenRouter models have large context windows — use generous RAG allowances
        curriculum_ctx = rag_result.get("curriculum_context", "")[:3000]
        example_ctx    = rag_result.get("example_context", "")[:800]
        user_ctx       = rag_result.get("user_context", "")[:600]

        prompt = build_lesson_plan_prompt(
            grade=grade,
            subject=subject,
            topic=topic,
            duration=duration,
            school=school,
            department=department,
            teacher_name=teacher_name,
            enrollment=enrollment,
            date=formatted_date,
            curriculum_context=curriculum_ctx,
            example_context=example_ctx,
            user_context=user_ctx,
        )
        logger.info(f"Prompt built: {len(prompt)} chars")

        # Step 4: Generate with AI provider
        try:
            logger.info(f"Generating lesson plan with AI for: {grade} {subject} - {topic}")
            raw_data = await ai.generate_json(
                prompt=prompt,
                system_prompt=LESSON_PLAN_SYSTEM_PROMPT,
            )

            # Step 5: Parse and validate the response
            plan = self._parse_lesson_plan_response(
                raw_data,
                grade=grade,
                subject=subject,
                topic=topic,
                duration=duration,
                school=school,
                department=department,
                teacher_name=teacher_name,
                enrollment=enrollment,
                date=formatted_date,
                rag_used=rag_result.get("has_context", False),
            )

            logger.info(f"Lesson plan generated successfully for: {grade} {subject} - {topic}")
            return plan

        except Exception as e:
            logger.error(f"AI generation failed: {e}. Falling back to template builder.")
            return build_fallback_lesson_plan(
                grade=grade,
                subject=subject,
                topic=topic,
                duration=duration,
                school=school,
                department=department,
                teacher_name=teacher_name,
                enrollment=enrollment,
                date=formatted_date,
            )

    def _parse_lesson_plan_response(
        self,
        data: dict,
        grade: str,
        subject: str,
        topic: str,
        duration: str,
        school: str,
        department: str,
        teacher_name: str,
        enrollment: str,
        date: str,
        rag_used: bool,
    ) -> LessonPlanData:
        """
        Parse and validate the AI-generated lesson plan JSON.
        Fills in defaults for any missing fields.
        """
        total_mins = int(duration) if duration.isdigit() else 40

        # Parse steps
        steps = []
        raw_steps = data.get("steps", [])
        for i, step_data in enumerate(raw_steps[:3], 1):
            steps.append(
                LessonStep(
                    stepNumber=step_data.get("stepNumber", i),
                    title=step_data.get("title", f"Step {i}"),
                    duration=step_data.get("duration", ""),
                    competencies=step_data.get("competencies", []),
                    teacherActivities=step_data.get("teacherActivities", []),
                    learnerActivities=step_data.get("learnerActivities", []),
                    teachingAids=step_data.get("teachingAids", None),
                )
            )

        # Ensure we always have 3 steps
        if len(steps) < 3:
            fallback = build_fallback_lesson_plan(
                grade, subject, topic, duration, school, department,
                teacher_name, enrollment, date
            )
            steps = fallback.steps

        # Parse competencies
        comp_data = data.get("competencies", {})
        competencies = CompetenciesData(
            criticalThinking=comp_data.get("criticalThinking", [
                f"Analyse key concepts of {topic}.",
                f"Apply {topic} to solve problems.",
            ]),
            communication=comp_data.get("communication", [
                f"Explain {topic} using correct {subject} vocabulary.",
                "Present findings clearly to the class.",
            ]),
            cooperation=comp_data.get("cooperation", [
                "Work respectfully in groups.",
                "Share resources equitably.",
            ]),
        )

        # Parse homework
        hw_data = data.get("homework", {})
        homework = HomeworkData(
            description=hw_data.get("description", f"Complete exercises on {topic} in your exercise book."),
            eczAlignment=hw_data.get("eczAlignment", f"Aligned with ECZ {subject} examination format."),
        )

        return LessonPlanData(
            school=data.get("school", school or "Zambian School"),
            department=data.get("department", department or f"{subject} Department"),
            teacherName=data.get("teacherName", teacher_name or "Class Teacher"),
            grade=data.get("grade", grade),
            subject=data.get("subject", subject),
            topic=data.get("topic", topic),
            lesson=data.get("lesson", topic),
            duration=data.get("duration", f"{total_mins} minutes"),
            enrollment=data.get("enrollment", enrollment or "40 learners"),
            date=data.get("date", date),
            references=data.get("references", f"{subject} Textbook — {grade}"),
            objectives=data.get("objectives", f"Having been introduced to {topic}, learners should be able to (PSBAT) explain, apply, and demonstrate understanding of key concepts."),
            competencies=competencies,
            teachingAids=data.get("teachingAids", ["Chalkboard & chalk", "Exercise books", "Textbooks"]),
            steps=steps,
            homework=homework,
            ai_generated=True,
            rag_context_used=rag_used,
        )

    async def generate_scheme_of_work(self, request: SchemeOfWorkRequest) -> SchemeOfWorkData:
        """Generate a term scheme of work."""
        ai = await self._get_ai()
        if not await ai.is_available():
            raise RuntimeError("AI model is not available. Check your OPENROUTER_API_KEY.")

        prompt = build_scheme_of_work_prompt(
            grade=request.grade,
            subject=request.subject,
            term=request.term,
            weeks=request.weeks,
            school=request.school or "",
            teacher_name=request.teacher_name or "",
        )

        raw_data = await ai.generate_json(
            prompt=prompt,
            system_prompt=SCHEME_OF_WORK_SYSTEM_PROMPT,
        )

        return SchemeOfWorkData(**raw_data)

    async def generate_assessment(self, request: AssessmentRequest) -> AssessmentData:
        """Generate an assessment with questions and marking guide."""
        ai = await self._get_ai()
        if not await ai.is_available():
            raise RuntimeError("AI model is not available. Check your OPENROUTER_API_KEY.")

        prompt = build_assessment_prompt(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            assessment_type=request.assessment_type,
            num_questions=request.num_questions,
            marks_per_question=request.marks_per_question,
            duration_minutes=request.duration_minutes,
        )

        raw_data = await ai.generate_json(
            prompt=prompt,
            system_prompt=ASSESSMENT_SYSTEM_PROMPT,
        )

        return AssessmentData(**raw_data)

    async def generate_homework(self, request: HomeworkRequest) -> dict:
        """Generate a homework assignment."""
        ai = await self._get_ai()
        if not await ai.is_available():
            raise RuntimeError("AI model is not available.")

        prompt = build_homework_prompt(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            difficulty=request.difficulty,
        )

        return await ai.generate_json(prompt=prompt)

    async def generate_learning_outcomes(self, request: LearningOutcomesRequest) -> dict:
        """Generate learning outcomes for a topic."""
        ai = await self._get_ai()
        if not await ai.is_available():
            raise RuntimeError("AI model is not available.")

        prompt = build_learning_outcomes_prompt(
            grade=request.grade,
            subject=request.subject,
            topic=request.topic,
            num_outcomes=request.num_outcomes,
        )

        return await ai.generate_json(prompt=prompt)

    def _format_date(self, date_str: str) -> str:
        """Format a date string to Zambian locale format."""
        if not date_str:
            return datetime.now().strftime("%A, %d %B %Y")
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            return dt.strftime("%A, %d %B %Y")
        except ValueError:
            return date_str


def get_lesson_plan_service() -> LessonPlanService:
    """Returns a LessonPlanService instance."""
    return LessonPlanService()
