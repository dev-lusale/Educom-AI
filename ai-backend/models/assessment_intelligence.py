"""
Educom AI Backend — Assessment Intelligence Pydantic Models
Defines request/response schemas for the full Assessment Intelligence suite.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ── Shared ───────────────────────────────────────────────────────────────────

class MCQOption(BaseModel):
    letter: Literal["A", "B", "C", "D"]
    text: str


class AssessmentQuestion(BaseModel):
    number: int
    type: Literal["mcq", "true_false", "short_answer", "structured"]
    question: str
    marks: int
    options: Optional[List[MCQOption]] = None
    answer: Optional[str] = None
    answer_guide: Optional[str] = None
    section: Optional[Literal["A", "B", "C"]] = None


# ── Quiz Request / Response ───────────────────────────────────────────────────

class QuizRequest(BaseModel):
    grade: str = Field(..., description="Grade level")
    subject: str = Field(..., description="Subject")
    topic: str = Field(..., description="Topic to assess")
    difficulty: str = Field(default="mixed", description="easy | medium | hard | mixed")
    num_mcq: int = Field(default=10, ge=0, le=30)
    num_short_answer: int = Field(default=5, ge=0, le=20)
    num_structured: int = Field(default=2, ge=0, le=10)
    learning_objectives: Optional[str] = Field(default="")
    user_id: Optional[str] = None


class QuizSection(BaseModel):
    name: str
    description: str
    section_marks: int
    questions: List[AssessmentQuestion]


class AnswerKeyEntry(BaseModel):
    question_number: int
    answer: str
    marks: int


class QuizData(BaseModel):
    grade: str
    subject: str
    topic: str
    duration: str
    total_marks: int
    instructions: str
    difficulty: str
    sections: List[QuizSection]
    answer_key: List[AnswerKeyEntry]
    learning_objectives: List[str] = []


# ── Exam Request / Response ───────────────────────────────────────────────────

class ExamRequest(BaseModel):
    grade: str
    subject: str
    topic: str
    exam_type: str = Field(default="End of Term Examination")
    term: str = Field(default="Term 1")
    total_marks: int = Field(default=100, ge=20, le=200)
    duration_minutes: int = Field(default=120, ge=30, le=240)
    include_marking_scheme: bool = Field(default=True)
    learning_objectives: Optional[str] = Field(default="")
    user_id: Optional[str] = None


class ExamSection(BaseModel):
    label: str
    title: str
    instructions: str
    marks: int
    questions: List[AssessmentQuestion]


class ExamData(BaseModel):
    grade: str
    subject: str
    topic: str
    exam_type: str
    duration: str
    total_marks: int
    year: str
    term: str
    instructions_to_candidates: List[str]
    sections: List[ExamSection]
    examiner_notes: Optional[str] = None


# ── Marking Scheme Request / Response ────────────────────────────────────────

class MarkingSchemeRequest(BaseModel):
    grade: str
    subject: str
    topic: str
    exam_type: str = Field(default="End of Term Examination")
    term: str = Field(default="Term 1")
    total_marks: int = Field(default=100, ge=20, le=200)
    duration_minutes: int = Field(default=120, ge=30, le=240)
    learning_objectives: Optional[str] = Field(default="")
    user_id: Optional[str] = None


class MarkingSchemeQuestion(BaseModel):
    number: int
    question: str
    marks: int
    expected_response: str
    alternative_responses: List[str] = []
    examiner_notes: str = ""
    mark_allocation: str = ""


class MarkingSchemeSection(BaseModel):
    label: str
    questions: List[MarkingSchemeQuestion]


class MarkingSchemeData(BaseModel):
    grade: str
    subject: str
    topic: str
    exam_type: str
    total_marks: int
    sections: List[MarkingSchemeSection]
    general_examiner_notes: List[str] = []
    marking_rubric: Optional[str] = None
