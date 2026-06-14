"""
Educom AI Backend — Assessment Intelligence Routes
Quiz Generator, Exam Paper Generator, Marking Scheme Generator.
"""

import logging
from fastapi import APIRouter, HTTPException, status

from models.assessment_intelligence import (
    QuizRequest, QuizData,
    ExamRequest, ExamData,
    MarkingSchemeRequest, MarkingSchemeData,
)
from services.assessment_service import get_assessment_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["Assessment Intelligence"])


@router.post(
    "/generate-quiz",
    response_model=QuizData,
    status_code=status.HTTP_200_OK,
    summary="Generate a curriculum-aligned quiz",
    description=(
        "Generates a complete quiz with MCQs, True/False, Short Answer, and Structured questions. "
        "Aligned with ECZ standards and the Zambian CBC curriculum."
    ),
)
async def generate_quiz(request: QuizRequest) -> QuizData:
    """
    Generate a quiz with answer key.

    Difficulty levels: easy | medium | hard | mixed
    Supports custom question counts per type.
    """
    try:
        service = get_assessment_service()
        return await service.generate_quiz(request)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error(f"Quiz generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz: {str(e)}",
        )


@router.post(
    "/generate-exam",
    response_model=ExamData,
    status_code=status.HTTP_200_OK,
    summary="Generate an ECZ-style examination paper",
    description=(
        "Generates a complete examination paper following ECZ structure. "
        "Supports End of Term, Mid-Term, Mock, and Continuous Assessment formats."
    ),
)
async def generate_exam(request: ExamRequest) -> ExamData:
    """
    Generate a full examination paper with Section A, B, and C.

    Exam types: End of Term | Mid-Term Test | Mock Examination | Continuous Assessment | Topic Test
    """
    try:
        service = get_assessment_service()
        return await service.generate_exam(request)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error(f"Exam generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate exam: {str(e)}",
        )


@router.post(
    "/generate-marking-scheme",
    response_model=MarkingSchemeData,
    status_code=status.HTTP_200_OK,
    summary="Generate an examiner-quality marking scheme",
    description=(
        "Generates a detailed marking scheme with expected responses, "
        "alternative acceptable answers, mark allocations, and examiner guidance notes."
    ),
)
async def generate_marking_scheme(request: MarkingSchemeRequest) -> MarkingSchemeData:
    """
    Generate a marking scheme with rubrics.

    Includes:
    - Expected responses per question
    - Alternative acceptable responses
    - Mark allocation breakdowns
    - Examiner guidance notes
    - General marking rubric
    """
    try:
        service = get_assessment_service()
        return await service.generate_marking_scheme(request)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        logger.error(f"Marking scheme generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate marking scheme: {str(e)}",
        )
