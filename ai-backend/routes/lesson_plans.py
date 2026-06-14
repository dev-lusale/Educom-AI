"""
Educom AI Backend — Lesson Plan Routes
Handles all lesson plan generation endpoints.
These are the primary endpoints consumed by the Educom Next.js frontend.
"""

import logging
from fastapi import APIRouter, HTTPException, status

from models.lesson_plan import (
    LessonPlanRequest,
    LessonPlanData,
    SchemeOfWorkRequest,
    SchemeOfWorkData,
    LearningOutcomesRequest,
)
from services.lesson_plan_service import get_lesson_plan_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["Lesson Plans"])


@router.post(
    "/generate-lesson-plan",
    response_model=LessonPlanData,
    status_code=status.HTTP_200_OK,
    summary="Generate a complete lesson plan",
    description=(
        "Generates a CBC-aligned lesson plan using RAG + Ollama. "
        "Falls back to template generation if Ollama is unavailable. "
        "This endpoint is called by the Educom Next.js frontend."
    ),
)
async def generate_lesson_plan(request: LessonPlanRequest) -> LessonPlanData:
    """
    Generate a complete, professional lesson plan.

    The pipeline:
    1. Retrieve relevant curriculum context from ChromaDB (RAG)
    2. Build an AI prompt with the context injected
    3. Generate with Ollama (phi3 or mistral)
    4. Parse and validate the structured response
    5. Fall back to template builder if AI is unavailable

    **Required fields:** grade, subject, topic
    """
    if not request.grade or not request.subject or not request.topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="grade, subject, and topic are required fields.",
        )

    try:
        service = get_lesson_plan_service()
        plan = await service.generate_lesson_plan(request)
        return plan

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lesson plan generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate lesson plan: {str(e)}",
        )


@router.post(
    "/generate-scheme-of-work",
    response_model=SchemeOfWorkData,
    status_code=status.HTTP_200_OK,
    summary="Generate a term scheme of work",
    description="Generates a full term scheme of work aligned with the Zambia CBC framework.",
)
async def generate_scheme_of_work(request: SchemeOfWorkRequest) -> SchemeOfWorkData:
    """
    Generate a complete scheme of work for a term.

    Includes weekly topic sequences, teaching methods, resources, and assessment strategies.
    """
    try:
        service = get_lesson_plan_service()
        scheme = await service.generate_scheme_of_work(request)
        return scheme

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Scheme of work generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate scheme of work: {str(e)}",
        )


@router.post(
    "/generate-learning-outcomes",
    status_code=status.HTTP_200_OK,
    summary="Generate learning outcomes",
    description="Generates Bloom's Taxonomy-aligned learning outcomes for a topic.",
)
async def generate_learning_outcomes(request: LearningOutcomesRequest) -> dict:
    """
    Generate specific, measurable learning outcomes.

    Uses Bloom's Taxonomy action verbs and aligns with CBC competencies.
    """
    try:
        service = get_lesson_plan_service()
        outcomes = await service.generate_learning_outcomes(request)
        return outcomes

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Learning outcomes generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate learning outcomes: {str(e)}",
        )
