"""
Educom AI Backend — PDF Export Routes
Converts generated assessment and lesson plan data into professional PDF documents.

Endpoints:
  POST /api/pdf/export-quiz          → quiz PDF
  POST /api/pdf/export-exam          → examination paper PDF
  POST /api/pdf/export-marking-scheme → marking scheme PDF
  POST /api/pdf/export-lesson-plan   → lesson plan PDF

Security: all endpoints require a valid session token passed in the X-User-Id header.
PDF is returned as an application/pdf streaming response.
"""

import logging
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response

from services.pdf_service import (
    generate_quiz_pdf,
    generate_exam_pdf,
    generate_marking_scheme_pdf,
    generate_lesson_plan_pdf,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pdf", tags=["PDF Export"])


def _safe_filename(grade: str, subject: str, suffix: str) -> str:
    """Build a safe ASCII filename from grade/subject."""
    safe = f"{grade}_{subject}_{suffix}".replace(" ", "_").replace("/", "-")
    return "".join(c for c in safe if c.isalnum() or c in ("_", "-", "."))


@router.post(
    "/export-quiz",
    status_code=status.HTTP_200_OK,
    summary="Export quiz as PDF",
    description=(
        "Accepts a QuizData JSON body and returns a professionally formatted "
        "quiz PDF ready for printing."
    ),
    response_class=Response,
)
async def export_quiz_pdf(quiz_data: dict) -> Response:
    """Generate and return a quiz PDF."""
    try:
        pdf_bytes = generate_quiz_pdf(quiz_data)
        filename = _safe_filename(
            quiz_data.get("grade", "Grade"),
            quiz_data.get("subject", "Subject"),
            "Quiz.pdf",
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except ImportError as e:
        logger.error(f"PDF library not installed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF generation library not installed. Run: pip install reportlab",
        )
    except Exception as e:
        logger.error(f"Quiz PDF export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate quiz PDF: {str(e)}",
        )


@router.post(
    "/export-exam",
    status_code=status.HTTP_200_OK,
    summary="Export examination paper as PDF",
    description=(
        "Accepts an ExamData JSON body and returns a professionally formatted "
        "ECZ-style examination paper PDF."
    ),
    response_class=Response,
)
async def export_exam_pdf(exam_data: dict) -> Response:
    """Generate and return an examination paper PDF."""
    try:
        pdf_bytes = generate_exam_pdf(exam_data)
        filename = _safe_filename(
            exam_data.get("grade", "Grade"),
            exam_data.get("subject", "Subject"),
            f"{exam_data.get('exam_type', 'Exam').replace(' ', '_')}.pdf",
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except ImportError as e:
        logger.error(f"PDF library not installed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF generation library not installed. Run: pip install reportlab",
        )
    except Exception as e:
        logger.error(f"Exam PDF export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate exam PDF: {str(e)}",
        )


@router.post(
    "/export-marking-scheme",
    status_code=status.HTTP_200_OK,
    summary="Export marking scheme as PDF",
    description=(
        "Accepts a MarkingSchemeData JSON body and returns a professional "
        "ECZ-style examiner marking scheme PDF."
    ),
    response_class=Response,
)
async def export_marking_scheme_pdf(ms_data: dict) -> Response:
    """Generate and return a marking scheme PDF."""
    try:
        pdf_bytes = generate_marking_scheme_pdf(ms_data)
        filename = _safe_filename(
            ms_data.get("grade", "Grade"),
            ms_data.get("subject", "Subject"),
            "Marking_Scheme.pdf",
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except ImportError as e:
        logger.error(f"PDF library not installed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF generation library not installed. Run: pip install reportlab",
        )
    except Exception as e:
        logger.error(f"Marking scheme PDF export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate marking scheme PDF: {str(e)}",
        )


@router.post(
    "/export-lesson-plan",
    status_code=status.HTTP_200_OK,
    summary="Export lesson plan as PDF",
    description=(
        "Accepts a LessonPlanData JSON body and returns a professionally formatted "
        "CBC lesson plan PDF ready for printing."
    ),
    response_class=Response,
)
async def export_lesson_plan_pdf(plan_data: dict) -> Response:
    """Generate and return a lesson plan PDF."""
    try:
        pdf_bytes = generate_lesson_plan_pdf(plan_data)
        filename = _safe_filename(
            plan_data.get("grade", "Grade"),
            plan_data.get("subject", "Subject"),
            f"{plan_data.get('topic', 'Lesson_Plan').replace(' ', '_')}_Plan.pdf",
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except ImportError as e:
        logger.error(f"PDF library not installed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF generation library not installed. Run: pip install reportlab",
        )
    except Exception as e:
        logger.error(f"Lesson plan PDF export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate lesson plan PDF: {str(e)}",
        )
