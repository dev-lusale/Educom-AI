from .health import router as health_router
from .lesson_plans import router as lesson_plans_router
from .assessments import router as assessments_router
from .assessment_intelligence import router as assessment_intelligence_router
from .curriculum import router as curriculum_router
from .chat import router as chat_router
from .pdf_export import router as pdf_export_router

__all__ = [
    "health_router",
    "lesson_plans_router",
    "assessments_router",
    "assessment_intelligence_router",
    "curriculum_router",
    "chat_router",
    "pdf_export_router",
]
