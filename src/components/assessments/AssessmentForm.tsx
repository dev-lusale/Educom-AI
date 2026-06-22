"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2, Plus, X } from "lucide-react";

// -- Grade groups --------------------------------------------------------------

const ALL_GRADE_GROUPS = [
  { label: "Early Childhood Education", grades: ["ECE Level 1", "ECE Level 2", "ECE Level 3", "ECE Level 4"] },
  { label: "Lower Primary (Grades 1–4)",  grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4"] },
  { label: "Upper Primary (Grades 5–7)",  grades: ["Grade 5", "Grade 6", "Grade 7"] },
  { label: "Junior Secondary",            grades: ["Form 1", "Form 2"] },
  { label: "Senior Secondary",            grades: ["Form 3", "Form 4"] },
  { label: "Sixth Form",                  grades: ["Form 5", "Form 6"] },
];

// Exam / marking scheme: all grades from ECE through Sixth Form
const SECONDARY_GRADE_GROUPS = [
  { label: "Early Childhood Education", grades: ["ECE Level 1", "ECE Level 2", "ECE Level 3", "ECE Level 4"] },
  { label: "Lower Primary (Grades 1–4)",  grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4"] },
  { label: "Upper Primary (Grades 5–7)",  grades: ["Grade 5", "Grade 6", "Grade 7"] },
  { label: "Junior Secondary",            grades: ["Form 1", "Form 2"] },
  { label: "Senior Secondary",            grades: ["Form 3", "Form 4"] },
  { label: "Sixth Form",                  grades: ["Form 5", "Form 6"] },
];

// -- Subjects ------------------------------------------------------------------

const SUBJECTS = [
  "Mathematics", "English Language", "Science", "Social Studies",
  "Additional Mathematics", "Literature in English", "Civic Education",
  "Religious Education", "Physical Education", "Chemistry", "Physics",
  "Creative and Technology Studies", "Home Economics", "Agriculture",
  "Commerce", "Accounting", "Design and Technology", "Home Management",
  "Business Studies", "History", "Geography", "Biology", "Fashion and Fabrics",
  "Food and Nutrition", "Technical Drawing", "Music", "Art and Design",
  "Computer Studies", "French",
];

// -- Assessment type cards -----------------------------------------------------

const ASSESSMENT_TYPES = [
  {
    id: "quiz",
    label: "Quiz Generator",
    description: "MCQs, True/False, Short Answer with answer keys",
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    id: "exam",
    label: "Exam Generator",
    description: "ECZ-style examination papers with Section A, B & C",
    color: "#007531",
    bg: "#e6f4ec",
  },
  {
    id: "marking_scheme",
    label: "Marking Scheme",
    description: "Examiner-quality marking guides with rubrics",
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
];

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard", "mixed"];

const EXAM_TYPES = [
  "End of Term Examination",
  "Mid-Term Test",
  "Mock Examination",
  "Continuous Assessment",
  "Topic Test",
];

const TERMS = ["Term 1", "Term 2", "Term 3"];

// -- Types ---------------------------------------------------------------------

export interface AssessmentFormValues {
  assessment_type: "quiz" | "exam" | "marking_scheme";
  grade: string;
  subject: string;
  topic: string;
  learning_objectives?: string;
  // quiz-specific
  difficulty?: string;
  num_mcq?: number;
  num_short_answer?: number;
  num_structured?: number;
  // exam / marking_scheme specific
  exam_type?: string;
  term?: string;
  total_marks?: number;
  duration_minutes?: number;
  include_marking_scheme?: boolean;
}

interface Props {
  onGenerate: (values: AssessmentFormValues) => void;
  loading: boolean;
  isPremium: boolean;
  defaultTeacherName?: string;
}

// -- Component -----------------------------------------------------------------

export default function AssessmentForm({ onGenerate, loading, isPremium }: Props) {
  const [assessmentType, setAssessmentType] = useState<AssessmentFormValues["assessment_type"]>("quiz");

  // Shared fields
  const [grade, setGrade]   = useState("");
  const [subject, setSubject] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");

  // Quiz: single topic
  const [quizTopic, setQuizTopic] = useState("");

  // Exam / Marking Scheme: multi-topic
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics]         = useState<string[]>([]);
  const topicInputRef = useRef<HTMLInputElement>(null);

  // Quiz options
  const [difficulty,    setDifficulty]    = useState("mixed");
  const [numMcq,        setNumMcq]        = useState(10);
  const [numShort,      setNumShort]      = useState(5);
  const [numStructured, setNumStructured] = useState(2);

  // Exam / marking scheme options
  const [examType,             setExamType]             = useState("End of Term Examination");
  const [term,                 setTerm]                 = useState("Term 1");
  const [totalMarks,           setTotalMarks]           = useState(100);
  const [durationMinutes,      setDurationMinutes]      = useState(120);
  const [includeMarkingScheme, setIncludeMarkingScheme] = useState(true);

  // -- Topic helpers ------------------------------------------------------------

  function addTopic() {
    const t = topicInput.trim();
    if (!t) return;
    setTopics((prev) => [...prev, t]);
    setTopicInput("");
    topicInputRef.current?.focus();
  }

  function removeTopic(idx: number) {
    setTopics((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleTopicKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addTopic(); }
  }

  // -- Derived topic string sent to the API -------------------------------------
  // For exam/marking_scheme: join all topics; fall back to topicInput if list is empty
  const examTopicString = topics.length > 0
    ? topics.join(", ")
    : topicInput.trim();

  // -- Submit -------------------------------------------------------------------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const isExamType = assessmentType === "exam" || assessmentType === "marking_scheme";
    const effectiveTopic = isExamType ? examTopicString : quizTopic.trim();

    if (!grade || !subject || !effectiveTopic) return;

    const base: AssessmentFormValues = {
      assessment_type: assessmentType,
      grade,
      subject,
      topic: effectiveTopic,
      learning_objectives: learningObjectives,
    };

    if (assessmentType === "quiz") {
      onGenerate({ ...base, difficulty, num_mcq: numMcq, num_short_answer: numShort, num_structured: numStructured });
    } else if (assessmentType === "exam") {
      onGenerate({ ...base, exam_type: examType, term, total_marks: totalMarks, duration_minutes: durationMinutes, include_marking_scheme: includeMarkingScheme });
    } else {
      onGenerate({ ...base, exam_type: examType, term, total_marks: totalMarks, duration_minutes: durationMinutes });
    }
  }

  const isExamOrScheme = assessmentType === "exam" || assessmentType === "marking_scheme";
  const gradeGroups    = isExamOrScheme ? SECONDARY_GRADE_GROUPS : ALL_GRADE_GROUPS;
  const effectiveTopic = isExamOrScheme ? examTopicString : quizTopic.trim();
  const canSubmit      = !loading && !!grade && !!subject && !!effectiveTopic && isPremium;

  const inp = "drib-input";
  const lbl = "block text-xs font-medium text-[--text-secondary] mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="drib-card p-6 space-y-6">

      {/* -- Assessment Type Selector -- */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 rounded-full bg-[#00A344] shrink-0" />
          <p className="text-[--text-primary] text-sm font-semibold">Assessment Type</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ASSESSMENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setAssessmentType(t.id as AssessmentFormValues["assessment_type"]);
                // Reset grade when switching between quiz and exam/scheme
                setGrade("");
              }}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl p-4 border-2 text-left transition-all",
                assessmentType === t.id
                  ? "border-[#00A344] bg-[#e6f4ec]/40"
                  : "border-[--border] bg-[--bg-surface] hover:border-[--border-hover]"
              )}
            >
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: t.color, backgroundColor: t.bg }}
              >
                {t.label}
              </span>
              <span className="text-[--text-secondary] text-xs leading-snug">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[--border]" />

      {/* -- Curriculum Details -- */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 rounded-full bg-[#007531] shrink-0" />
          <p className="text-[--text-primary] text-sm font-semibold">Curriculum Details</p>
        </div>

        <div className="space-y-4">

          {/* Grade + Subject row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>
                Grade <span className="text-[#00A344]">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className={cn(inp, "cursor-pointer")}
              >
                <option value="" disabled>
                  {isExamOrScheme ? "Select subject form" : "Select grade / form"}
                </option>
                {gradeGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.grades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>
                Subject <span className="text-[#00A344]">*</span>
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className={cn(inp, "cursor-pointer")}
              >
                <option value="" disabled>Select subject</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* -- Quiz: single topic -- */}
          {assessmentType === "quiz" && (
            <div>
              <label className={lbl}>
                Topic <span className="text-[#00A344]">*</span>
              </label>
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                required
                placeholder="e.g. Photosynthesis"
                className={inp}
              />
            </div>
          )}

          {/* -- Exam / Marking Scheme: multi-topic -- */}
          {isExamOrScheme && (
            <div>
              <label className={lbl}>
                Topics Included{" "}
                <span className="text-[--text-secondary] font-normal">(Select Multiple)</span>
              </label>

              {/* Input + Add button */}
              <div className="flex gap-2">
                <input
                  ref={topicInputRef}
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={handleTopicKeyDown}
                  placeholder={`Topic #${topics.length + 1} *`}
                  className={cn(inp, "flex-1 min-w-0")}
                />
                <button
                  type="button"
                  onClick={addTopic}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007531] text-white text-sm font-semibold hover:bg-[#005e27] active:scale-[0.98] transition-all shrink-0"
                >
                  <Plus size={14} /> Add Topic
                </button>
              </div>

              {/* Topic list */}
              {topics.length > 0 && (
                <div className="mt-2 border border-[--border] rounded-xl overflow-hidden">
                  {topics.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-3 bg-[--bg-surface] border-b border-[--border] last:border-b-0"
                    >
                      <span className="text-[--text-primary] text-sm">
                        Topic #{i + 1}: {t}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTopic(i)}
                        className="w-6 h-6 rounded-full bg-[#e6f4ec] flex items-center justify-center text-[#00A344] hover:bg-[#bbf7d0] transition-colors shrink-0 ml-3"
                        aria-label={`Remove topic ${i + 1}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {/* Add Topic Section footer */}
                  <button
                    type="button"
                    onClick={() => topicInputRef.current?.focus()}
                    className="w-full flex items-center justify-center gap-1.5 py-3 text-[--text-secondary] text-sm hover:bg-[--bg-canvas] transition-colors"
                  >
                    <Plus size={13} /> Add Topic Section
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Detailed Learning Objectives */}
          <div>
            <label className={lbl}>
              Detailed Learning Objectives{" "}
              <span className="text-[--text-muted] font-normal">
                (optional, use if needed for specific topics)
              </span>
            </label>
            <textarea
              value={learningObjectives}
              onChange={(e) => setLearningObjectives(e.target.value)}
              placeholder="e.g. Learners should be able to explain the process of photosynthesis and identify the reactants and products…"
              rows={3}
              className={cn(inp, "resize-none")}
            />
          </div>

        </div>
      </div>

      <div className="border-t border-[--border]" />

      {/* -- Quiz-specific options -- */}
      {assessmentType === "quiz" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-4 rounded-full bg-[#3b82f6] shrink-0" />
            <p className="text-[--text-primary] text-sm font-semibold">Quiz Options</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-4">
              <label className={lbl}>Difficulty</label>
              <div className="flex gap-2 flex-wrap">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all border",
                      difficulty === d
                        ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                        : "bg-[--bg-surface] text-[--text-secondary] border-[--border] hover:border-[#3b82f6]/40"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>MCQs</label>
              <input type="number" min={0} max={30} value={numMcq}
                onChange={(e) => setNumMcq(+e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Short Answer</label>
              <input type="number" min={0} max={20} value={numShort}
                onChange={(e) => setNumShort(+e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Structured</label>
              <input type="number" min={0} max={10} value={numStructured}
                onChange={(e) => setNumStructured(+e.target.value)} className={inp} />
            </div>
            <div className="flex items-end pb-1">
              <p className="text-[--text-muted] text-xs">
                Total: <strong className="text-[--text-primary]">{numMcq + numShort + numStructured}</strong> questions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -- Exam / Marking Scheme options -- */}
      {isExamOrScheme && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className={cn(
              "w-1.5 h-4 rounded-full shrink-0",
              assessmentType === "exam" ? "bg-[#007531]" : "bg-[#8b5cf6]"
            )} />
            <p className="text-[--text-primary] text-sm font-semibold">
              {assessmentType === "exam" ? "Examination Options" : "Marking Scheme Options"}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={lbl}>Examination Type</label>
              <select value={examType} onChange={(e) => setExamType(e.target.value)} className={cn(inp, "cursor-pointer")}>
                {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className={cn(inp, "cursor-pointer")}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Total Marks</label>
              <input type="number" min={20} max={200} step={10} value={totalMarks}
                onChange={(e) => setTotalMarks(+e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Duration (minutes)</label>
              <input type="number" min={30} max={240} step={15} value={durationMinutes}
                onChange={(e) => setDurationMinutes(+e.target.value)} className={inp} />
            </div>
            {assessmentType === "exam" && (
              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="include_ms"
                  checked={includeMarkingScheme}
                  onChange={(e) => setIncludeMarkingScheme(e.target.checked)}
                  className="w-4 h-4 accent-[#00A344] cursor-pointer"
                />
                <label htmlFor="include_ms" className="text-xs text-[--text-secondary] cursor-pointer">
                  Include marking scheme
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- Submit -- */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
          !canSubmit
            ? "bg-[--bg-elevated] text-[--text-muted] cursor-not-allowed"
            : "bg-[#00A344] text-white hover:bg-[#007531] active:scale-[0.99]"
        )}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generating {assessmentType === "quiz" ? "Quiz" : assessmentType === "exam" ? "Exam" : "Marking Scheme"}…
          </>
        ) : !isPremium ? (
          "Premium Required — Upgrade to Generate"
        ) : (
          `Generate ${assessmentType === "quiz" ? "Quiz" : assessmentType === "exam" ? "Exam Paper" : "Marking Scheme"}`
        )}
      </button>
    </form>
  );
}
