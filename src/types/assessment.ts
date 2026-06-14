// ── Assessment Types ─────────────────────────────────────────────

export type AssessmentType = "quiz" | "exam" | "marking_scheme";

export interface MCQOption {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

export interface AssessmentQuestion {
  number: number;
  type: "mcq" | "true_false" | "short_answer" | "structured";
  question: string;
  marks: number;
  options?: MCQOption[];        // MCQ only
  answer?: string;              // answer key value
  answer_guide?: string;        // marking notes
  section?: "A" | "B" | "C";   // exam section
}

// ── Quiz Output ──────────────────────────────────────────────────

export interface QuizData {
  grade: string;
  subject: string;
  topic: string;
  duration: string;
  total_marks: number;
  instructions: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  sections: {
    name: string;
    description: string;
    questions: AssessmentQuestion[];
    section_marks: number;
  }[];
  answer_key: {
    question_number: number;
    answer: string;
    marks: number;
  }[];
  learning_objectives: string[];
}

// ── Exam Output ──────────────────────────────────────────────────

export interface ExamData {
  grade: string;
  subject: string;
  topic: string;
  exam_type: string;  // "End of Term" | "Mid-Term" | "Mock" | "Continuous Assessment"
  duration: string;
  total_marks: number;
  year: string;
  term: string;
  instructions_to_candidates: string[];
  sections: {
    label: string;         // "SECTION A"
    title: string;         // "Multiple Choice Questions"
    instructions: string;
    marks: number;
    questions: AssessmentQuestion[];
  }[];
  examiner_notes?: string;
}

// ── Marking Scheme Output ────────────────────────────────────────

export interface MarkingSchemeData {
  grade: string;
  subject: string;
  topic: string;
  exam_type: string;
  total_marks: number;
  sections: {
    label: string;
    questions: {
      number: number;
      question: string;
      marks: number;
      expected_response: string;
      alternative_responses: string[];
      examiner_notes: string;
      mark_allocation: string;
    }[];
  }[];
  general_examiner_notes: string[];
  marking_rubric?: string;
}

export type AssessmentOutput = QuizData | ExamData | MarkingSchemeData;
