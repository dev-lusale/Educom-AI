"""
Educom AI Backend — Lesson Plan Pydantic Models
Defines request/response schemas that match the frontend's TypeScript types exactly.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ── Request Models ───────────────────────────────────────────────────────────

class LessonPlanRequest(BaseModel):
    """
    Request body for generating a lesson plan.
    Matches the frontend's generate-lesson-plan API contract.
    """
    grade: str = Field(..., description="Grade level e.g. 'Grade 7', 'Grade 12'")
    subject: str = Field(..., description="Subject name e.g. 'Mathematics', 'Biology'")
    topic: str = Field(..., description="Specific lesson topic")
    duration: str = Field(default="40", description="Lesson duration in minutes")
    school: Optional[str] = Field(default="", description="School name")
    department: Optional[str] = Field(default="", description="Department name")
    teacher_name: Optional[str] = Field(default="", alias="teacherName", description="Teacher's name")
    enrollment: Optional[str] = Field(default="", description="Number of learners")
    date: Optional[str] = Field(default="", description="Lesson date (YYYY-MM-DD)")
    # Teacher's uploaded resources integration
    user_id: Optional[str] = Field(default=None, description="Teacher's user ID for personal resource retrieval")
    use_user_resources: bool = Field(default=False, description="Whether to include teacher's uploaded resources in RAG context")

    model_config = {"populate_by_name": True}


class SchemeOfWorkRequest(BaseModel):
    """Request body for generating a scheme of work (term plan)."""
    grade: str = Field(..., description="Grade level")
    subject: str = Field(..., description="Subject name")
    term: str = Field(default="Term 1", description="School term e.g. 'Term 1'")
    weeks: int = Field(default=13, ge=1, le=16, description="Number of weeks in term")
    school: Optional[str] = Field(default="", description="School name")
    teacher_name: Optional[str] = Field(default="", alias="teacherName")

    model_config = {"populate_by_name": True}


class AssessmentRequest(BaseModel):
    """Request body for generating an assessment."""
    grade: str = Field(..., description="Grade level")
    subject: str = Field(..., description="Subject name")
    topic: str = Field(..., description="Topic being assessed")
    assessment_type: str = Field(
        default="class_test",
        description="Type: class_test, homework, exam, quiz",
    )
    num_questions: int = Field(default=10, ge=1, le=50, description="Number of questions")
    marks_per_question: int = Field(default=2, ge=1, le=20, description="Marks per question")
    duration_minutes: int = Field(default=40, ge=10, le=180, description="Assessment duration")


class HomeworkRequest(BaseModel):
    """Request body for generating homework."""
    grade: str = Field(..., description="Grade level")
    subject: str = Field(..., description="Subject name")
    topic: str = Field(..., description="Topic for homework")
    difficulty: str = Field(
        default="medium",
        description="Difficulty level: easy, medium, hard",
    )


class LearningOutcomesRequest(BaseModel):
    """Request body for generating learning outcomes."""
    grade: str = Field(..., description="Grade level")
    subject: str = Field(..., description="Subject name")
    topic: str = Field(..., description="Topic")
    num_outcomes: int = Field(default=5, ge=1, le=10, description="Number of outcomes")


class CurriculumSearchRequest(BaseModel):
    """Request body for semantic curriculum search."""
    query: str = Field(..., min_length=3, description="Search query")
    grade: Optional[str] = Field(default=None, description="Filter by grade")
    subject: Optional[str] = Field(default=None, description="Filter by subject")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of results")


# ── Response Models ──────────────────────────────────────────────────────────

class LessonStep(BaseModel):
    """A single step in the 3-step lesson plan model."""
    stepNumber: Literal[1, 2, 3]
    title: str
    duration: str
    competencies: List[str] = []
    teacherActivities: List[str]
    learnerActivities: List[str]
    teachingAids: Optional[List[str]] = None


class HomeworkData(BaseModel):
    """Homework section of a lesson plan."""
    description: str
    eczAlignment: str


class CompetenciesData(BaseModel):
    """CBC competencies breakdown."""
    criticalThinking: List[str]
    communication: List[str]
    cooperation: List[str]


class LessonPlanData(BaseModel):
    """
    Complete lesson plan response.
    Matches the frontend's LessonPlanData TypeScript interface exactly.
    """
    # School & Teacher Info
    school: str
    department: str
    teacherName: str

    # Class Info
    grade: str
    subject: str
    topic: str
    lesson: str
    duration: str
    enrollment: str
    date: str
    references: str
    objectives: str

    # Competencies
    competencies: CompetenciesData

    # Teaching Aids
    teachingAids: List[str]

    # 3-Step Lesson Table
    steps: List[LessonStep]

    # Homework
    homework: HomeworkData

    # Metadata (not in frontend type but useful for debugging)
    ai_generated: bool = True
    rag_context_used: bool = False


class SchemeWeek(BaseModel):
    """A single week entry in a scheme of work."""
    week: int
    topic: str
    subtopics: List[str]
    competencies: List[str]
    teaching_methods: List[str]
    resources: List[str]
    assessment: str


class SchemeOfWorkData(BaseModel):
    """Complete scheme of work response."""
    grade: str
    subject: str
    term: str
    school: str
    teacher_name: str
    total_weeks: int
    weeks: List[SchemeWeek]


class AssessmentQuestion(BaseModel):
    """A single assessment question."""
    number: int
    question: str
    marks: int
    answer_guide: Optional[str] = None


class AssessmentData(BaseModel):
    """Complete assessment response."""
    grade: str
    subject: str
    topic: str
    assessment_type: str
    total_marks: int
    duration: str
    instructions: str
    questions: List[AssessmentQuestion]
    marking_guide: Optional[str] = None


class CurriculumSearchResult(BaseModel):
    """A single curriculum search result."""
    content: str
    source: str
    relevance_score: float
    grade: Optional[str] = None
    subject: Optional[str] = None


class CurriculumSearchResponse(BaseModel):
    """Curriculum search response."""
    query: str
    results: List[CurriculumSearchResult]
    total_found: int


class DocumentUploadResponse(BaseModel):
    """Response after uploading a curriculum document."""
    filename: str
    file_type: str
    chunks_created: int
    embeddings_stored: int
    collection: str
    message: str


class HealthResponse(BaseModel):
    """Health check response — kept for backward compatibility. See routes/health.py for the full version."""
    status: str
    ollama_connected: bool = False
    ollama_model: str = ""
    chroma_connected: bool = False
    embeddings_loaded: bool = False
    version: str = "1.0.0"
