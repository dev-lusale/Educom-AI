"""
Educom AI Backend — Assessment Routes
Handles assessment, homework, and quiz generation endpoints.
"""

import logging
from fastapi import APIRouter, HTTPException, status

from models.lesson_plan import (
    AssessmentRequest,
    AssessmentData,
    HomeworkRequest,
)
from services.lesson_plan_service import get_lesson_plan_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["Assessments"])


@router.post(
    "/generate-assessment",
    response_model=AssessmentData,
    status_code=status.HTTP_200_OK,
    summary="Generate an assessment",
    description=(
        "Generates a professional assessment aligned with ECZ examination standards. "
        "Supports class tests, homework, exams, and quizzes."
    ),
)
async def generate_assessment(request: AssessmentRequest) -> AssessmentData:
    """
    Generate a complete assessment with questions and marking guide.

    Assessment types:
    - `class_test` — Standard classroom test
    - `homework` — Take-home assignment
    - `exam` — End of term examination
    - `quiz` — Quick knowledge check
    """
    try:
        service = get_lesson_plan_service()
        assessment = await service.generate_assessment(request)
        return assessment

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Assessment generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate assessment: {str(e)}",
        )


@router.post(
    "/generate-homework",
    status_code=status.HTTP_200_OK,
    summary="Generate homework",
    description="Generates a homework assignment aligned with ECZ examination style.",
)
async def generate_homework(request: HomeworkRequest) -> dict:
    """
    Generate a homework assignment.

    Difficulty levels: `easy`, `medium`, `hard`

    Homework is designed to be achievable without internet access,
    making it suitable for both rural and urban Zambian learners.
    """
    try:
        service = get_lesson_plan_service()
        homework = await service.generate_homework(request)
        return homework

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Homework generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate homework: {str(e)}",
        )
