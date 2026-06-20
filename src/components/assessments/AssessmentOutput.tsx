"use client";

import { useState } from "react";
import {
  Printer, FileDown, CheckCircle2, Trash2, BookOpen,
  ClipboardCheck, FileText, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { QuizData, ExamData, MarkingSchemeData } from "@/types/assessment";
import { cn } from "@/lib/utils";

type AnyAssessment = QuizData | ExamData | MarkingSchemeData;

function isQuiz(a: AnyAssessment): a is QuizData {
  return "answer_key" in a;
}
function isExam(a: AnyAssessment): a is ExamData {
  return "instructions_to_candidates" in a;
}

interface Props {
  assessment: AnyAssessment;
  assessmentType: "quiz" | "exam" | "marking_scheme";
  savedId: string | null;
  onDelete?: () => void;
}

export default function AssessmentOutput({ assessment, assessmentType, savedId, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleDelete() {
    if (!savedId) return;
    setDeleting(true);
    const res = await fetch(`/api/assessments/${savedId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success("Assessment deleted.");
      onDelete?.();
    } else {
      toast.error("Failed to delete.");
    }
  }

  function handlePrint() {
    window.print();
  }

  /** Server-side PDF export via the FastAPI PDF service. Falls back to browser print. */
  async function handleSaveAsPdf() {
    setExportingPdf(true);
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: assessmentType, data: assessment }),
      });

      if (res.ok) {
        // Trigger download
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        const contentDisposition = res.headers.get("Content-Disposition") ?? "";
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        a.href     = url;
        a.download = filenameMatch?.[1] ?? `${assessmentType}-${assessment.grade}-${assessment.subject}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded successfully.");
      } else {
        const err = await res.json().catch(() => ({}));
        if (err?.premium_required) {
          toast.error("PDF export requires a Premium subscription.");
        } else if (res.status === 503) {
          // Backend not available — fall back to browser print
          toast("AI backend unavailable — using browser print instead.", { icon: "ℹ️" });
          const typeLabel = assessmentType === "quiz" ? "Quiz" : assessmentType === "exam" ? "Exam" : "Marking-Scheme";
          const prev = document.title;
          document.title = `${typeLabel}-${assessment.grade}-${assessment.subject}-${assessment.topic}`;
          window.print();
          document.title = prev;
        } else {
          throw new Error(err?.error ?? "PDF generation failed.");
        }
      }
    } catch (err) {
      console.error("[PDF Export]", err);
      // Final fallback: browser print
      toast("Falling back to browser print.", { icon: "ℹ️" });
      window.print();
    } finally {
      setExportingPdf(false);
    }
  }

  const typeConfig = {
    quiz:           { icon: BookOpen,      color: "#3b82f6", bg: "#eff6ff",  label: "Quiz" },
    exam:           { icon: ClipboardCheck, color: "#007531", bg: "#e6f4ec", label: "Exam Paper" },
    marking_scheme: { icon: FileText,      color: "#8b5cf6", bg: "#f5f3ff",  label: "Marking Scheme" },
  }[assessmentType];

  const TypeIcon = typeConfig.icon;

  return (
    <div className="mt-8 animate-fade-in">
      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <span className="flex items-center gap-1.5 text-[#007531] font-medium text-sm">
          <CheckCircle2 size={14} />
          {savedId ? "Saved to your library" : "Generated"}
        </span>

        <div className="flex gap-2 flex-wrap">
          {isQuiz(assessment) && (
            <button
              onClick={() => setShowAnswerKey((p) => !p)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all border",
                showAnswerKey
                  ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                  : "bg-[#eff6ff] text-[#3b82f6] border-[#3b82f6]/20 hover:bg-blue-100/60"
              )}
            >
              <BookOpen size={13} />
              {showAnswerKey ? "Hide Answer Key" : "Show Answer Key"}
            </button>
          )}

          {savedId && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-all font-medium"
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Delete
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[--bg-surface] border border-[--border] text-[--text-secondary] hover:border-[--border-hover] hover:text-[--text-primary] transition-all"
          >
            <Printer size={13} /> Print
          </button>

          <button
            onClick={handleSaveAsPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#eff6ff] text-[#3b82f6] border border-[#3b82f6]/20 hover:bg-blue-100/60 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            {exportingPdf ? "Generating PDF…" : "Save as PDF"}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ASSESSMENT DOCUMENT
          ── Screen: Dribbble card design
          ── Print/PDF: clean A4 ECZ-style format
          ══════════════════════════════════════════════════════════════ */}
      <div id="assessment-print" className="assess-doc">

        {/* ── Screen header ── */}
        <div className="print:hidden px-6 py-5 rounded-t-2xl" style={{ backgroundColor: typeConfig.color }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <TypeIcon size={14} className="text-white/70" />
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  {typeConfig.label} · Educom AI
                </p>
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
                {assessment.topic}
              </h2>
              <p className="text-white/70 text-sm mt-0.5">
                {assessment.grade} · {assessment.subject}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-bold text-lg">{assessment.total_marks} marks</p>
              {"duration" in assessment && (
                <p className="text-white/70 text-sm">{(assessment as { duration: string }).duration}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Print header ── */}
        <div className="assess-print-header">
          <p className="assess-school-name">EXAMINATIONS COUNCIL OF ZAMBIA STYLE</p>
          <p className="assess-dept-name">
            {assessment.grade.toUpperCase()} {assessment.subject.toUpperCase()}
          </p>
          {"exam_type" in assessment && (
            <p className="assess-section-name">
              {(assessment as { exam_type: string }).exam_type.toUpperCase()}
            </p>
          )}
        </div>

        {/* ── Document body ── */}
        <div className="assess-body">

          {/* ────────────────── QUIZ ────────────────── */}
          {isQuiz(assessment) && <QuizDocument quiz={assessment} showAnswerKey={showAnswerKey} />}

          {/* ────────────────── EXAM ────────────────── */}
          {isExam(assessment) && <ExamDocument exam={assessment} />}

          {/* ────────────────── MARKING SCHEME ────────────────── */}
          {!isQuiz(assessment) && !isExam(assessment) && (
            <MarkingSchemeDocument scheme={assessment as MarkingSchemeData} />
          )}

          {/* ── Print footer ── */}
          <div className="assess-footer">
            Generated by Educom AI &nbsp;·&nbsp; ECZ-aligned assessment tools for Zambian educators
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quiz Document ─────────────────────────────────────────────────

function QuizDocument({ quiz, showAnswerKey }: { quiz: QuizData; showAnswerKey: boolean }) {
  return (
    <>
      {/* Meta info */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Grade",       value: quiz.grade },
          { label: "Subject",     value: quiz.subject },
          { label: "Topic",       value: quiz.topic },
          { label: "Duration",    value: quiz.duration },
          { label: "Total Marks", value: String(quiz.total_marks) },
          { label: "Difficulty",  value: quiz.difficulty },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[--bg-canvas] border border-[--border] rounded-xl p-3">
            <p className="text-[--text-muted] text-xs mb-1">{label}</p>
            <p className="text-[--text-primary] font-semibold text-sm capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Print meta */}
      <div className="assess-meta">
        <div className="assess-field-row">
          <span className="assess-field-label">Subject</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{quiz.subject}</span>
          <span className="assess-field-label ml-8">Grade</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{quiz.grade}</span>
        </div>
        <div className="assess-field-row">
          <span className="assess-field-label">Topic</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{quiz.topic}</span>
        </div>
        <div className="assess-field-row">
          <span className="assess-field-label">Duration</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{quiz.duration}</span>
          <span className="assess-field-label ml-8">Total Marks</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{quiz.total_marks}</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="print:hidden mb-6">
        <SectionHeading title="Instructions" color="#3b82f6" />
        <p className="text-[--text-secondary] text-sm bg-[#eff6ff] border border-[#3b82f6]/20 rounded-xl px-4 py-3">
          {quiz.instructions}
        </p>
      </div>

      {/* Sections */}
      {quiz.sections.map((section) => (
        <div key={section.name} className="mb-8">
          <div className="print:hidden mb-4">
            <SectionHeading title={section.name} color="#3b82f6" />
            <p className="text-[--text-muted] text-xs mb-4">{section.description}</p>
          </div>
          <div className="assess-section-heading print:block hidden">
            <strong>{section.name}</strong> ({section.section_marks} marks) — {section.description}
          </div>

          <div className="space-y-4">
            {section.questions.map((q) => (
              <QuestionCard key={q.number} question={q} showAnswer={showAnswerKey} />
            ))}
          </div>
        </div>
      ))}

      {/* Answer Key (screen only, toggled) */}
      {showAnswerKey && quiz.answer_key && quiz.answer_key.length > 0 && (
        <div className="print:hidden mt-6 pt-6 border-t border-[--border]">
          <SectionHeading title="Answer Key" color="#007531" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quiz.answer_key.map((a) => (
              <div key={a.question_number}
                className="bg-[#e6f4ec] border border-[#007531]/20 rounded-xl p-3">
                <p className="text-[--text-muted] text-xs mb-0.5">Q{a.question_number}</p>
                <p className="text-[#007531] font-bold text-sm">{a.answer}</p>
                <p className="text-[--text-muted] text-xs">{a.marks} mark{a.marks !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Exam Document ─────────────────────────────────────────────────

function ExamDocument({ exam }: { exam: ExamData }) {
  return (
    <>
      {/* Screen meta */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Grade",    value: exam.grade },
          { label: "Subject",  value: exam.subject },
          { label: "Type",     value: exam.exam_type },
          { label: "Term",     value: exam.term },
          { label: "Duration", value: exam.duration },
          { label: "Marks",    value: String(exam.total_marks) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[--bg-canvas] border border-[--border] rounded-xl p-3">
            <p className="text-[--text-muted] text-xs mb-1">{label}</p>
            <p className="text-[--text-primary] font-semibold text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Print meta */}
      <div className="assess-meta">
        <div className="assess-field-row">
          <span className="assess-field-label">Subject</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{exam.subject} — {exam.exam_type}</span>
        </div>
        <div className="assess-field-row">
          <span className="assess-field-label">Grade</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{exam.grade}</span>
          <span className="assess-field-label ml-8">Year</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{exam.year}</span>
        </div>
        <div className="assess-field-row">
          <span className="assess-field-label">Time Allowed</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{exam.duration}</span>
          <span className="assess-field-label ml-8">Total Marks</span>
          <span className="assess-field-sep">:</span>
          <span className="assess-field-value">{exam.total_marks}</span>
        </div>
      </div>

      {/* Instructions to candidates */}
      <div className="print:hidden mb-6">
        <SectionHeading title="Instructions to Candidates" color="#007531" />
        <div className="bg-[#e6f4ec] border border-[#007531]/20 rounded-xl p-4">
          <ol className="space-y-1.5 list-decimal list-inside">
            {exam.instructions_to_candidates.map((ins, i) => (
              <li key={i} className="text-[--text-secondary] text-sm">{ins}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* Print instructions */}
      <div className="assess-instructions hidden print:block">
        <p className="assess-instructions-heading">INSTRUCTIONS TO CANDIDATES</p>
        <ol className="assess-instructions-list">
          {exam.instructions_to_candidates.map((ins, i) => (
            <li key={i}>{ins}</li>
          ))}
        </ol>
      </div>

      {/* Sections */}
      {exam.sections.map((section) => (
        <div key={section.label} className="mb-8">
          <div className="print:hidden mb-4">
            <div className="flex items-center justify-between mb-2">
              <SectionHeading title={`${section.label} — ${section.title}`} color="#007531" />
              <span className="text-[#007531] text-xs font-semibold bg-[#e6f4ec] px-3 py-1 rounded-full">
                {section.marks} marks
              </span>
            </div>
            <p className="text-[--text-muted] text-xs">{section.instructions}</p>
          </div>
          <div className="assess-section-heading hidden print:block">
            <strong>{section.label}: {section.title}</strong> ({section.marks} marks)<br />
            <em className="font-normal">{section.instructions}</em>
          </div>

          <div className="space-y-4">
            {section.questions.map((q) => (
              <QuestionCard key={q.number} question={q} showAnswer={false} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Marking Scheme Document ──────────────────────────────────────

function MarkingSchemeDocument({ scheme }: { scheme: MarkingSchemeData }) {
  return (
    <>
      {/* Screen meta */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Grade",    value: scheme.grade },
          { label: "Subject",  value: scheme.subject },
          { label: "Topic",    value: scheme.topic },
          { label: "Type",     value: scheme.exam_type },
          { label: "Marks",    value: String(scheme.total_marks) },
          ...(scheme.term ? [{ label: "Term", value: scheme.term }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="bg-[--bg-canvas] border border-[--border] rounded-xl p-3">
            <p className="text-[--text-muted] text-xs mb-1">{label}</p>
            <p className="text-[--text-primary] font-semibold text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* General examiner notes */}
      {scheme.general_examiner_notes?.length > 0 && (
        <div className="print:hidden mb-6">
          <SectionHeading title="General Examiner Notes" color="#8b5cf6" />
          <div className="bg-[#f5f3ff] border border-[#8b5cf6]/20 rounded-xl p-4">
            <ul className="space-y-1.5">
              {scheme.general_examiner_notes.map((note, i) => (
                <li key={i} className="text-[--text-secondary] text-sm flex gap-2">
                  <span className="text-[#8b5cf6] shrink-0">•</span>{note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Sections */}
      {scheme.sections?.map((section) => (
        <div key={section.label} className="mb-8">
          <div className="print:hidden mb-4">
            <SectionHeading
              title={section.title ? `${section.label} — ${section.title}` : section.label}
              color="#8b5cf6"
            />
          </div>
          <div className="assess-section-heading hidden print:block">
            <strong>{section.label}{section.title ? ` — ${section.title}` : ""}</strong>
          </div>

          <div className="space-y-4">
            {section.questions?.map((q) => (
              <MarkingSchemeQuestionCard key={q.number} question={q} />
            ))}
          </div>
        </div>
      ))}

      {/* Print general notes */}
      {scheme.general_examiner_notes?.length > 0 && (
        <div className="hidden print:block mt-6 pt-4 border-t">
          <p className="font-bold text-sm mb-2">GENERAL EXAMINER NOTES</p>
          <ol className="list-decimal list-inside space-y-1">
            {scheme.general_examiner_notes.map((note, i) => (
              <li key={i} className="text-sm">{note}</li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

function MarkingSchemeQuestionCard({ question: q }: { question: import("@/types/assessment").MarkingSchemeQuestion }) {
  // Determine display values — handles both OpenRouter shape and legacy FastAPI shape
  const marks       = q.marks ?? q.total_marks ?? 0;
  const modelAns    = q.model_answer ?? q.expected_response ?? "";
  const markPoints  = q.mark_points ?? [];
  const altAccepts  = q.accept_alternatives ?? q.alternative_responses ?? [];
  const examNote    = q.examiner_note ?? q.examiner_notes ?? "";
  const markAlloc   = q.mark_allocation ?? "";
  const questionTxt = q.question ?? "";

  // Section A MCQ answer key style
  const isMCQKey = !q.sub_questions && !q.mark_points && !q.model_answer && !q.expected_response && q.answer;

  if (isMCQKey) {
    return (
      <div className="bg-[--bg-surface] border border-[--border] rounded-xl p-4 shadow-sm">
        <div className="print:hidden flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] font-bold text-xs shrink-0">
              {q.number}
            </span>
            {questionTxt && <p className="text-[--text-secondary] text-sm">{questionTxt}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[#007531] font-bold text-sm bg-[#e6f4ec] px-3 py-1 rounded-full">
              {q.answer}
            </span>
            <span className="text-xs text-[--text-muted]">{marks} mark{marks !== 1 ? "s" : ""}</span>
          </div>
        </div>
        {q.explanation && (
          <p className="print:hidden text-[--text-muted] text-xs mt-2 ml-10">{q.explanation}</p>
        )}
        {/* Print */}
        <div className="hidden print:flex justify-between text-sm">
          <span><strong>Q{q.number}.</strong>{questionTxt ? ` ${questionTxt}` : ""}</span>
          <span><strong>{q.answer}</strong> ({marks} mark{marks !== 1 ? "s" : ""})</span>
        </div>
      </div>
    );
  }

  // Section B/C structured or sub-question style
  return (
    <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-5 shadow-sm">
      {/* Screen */}
      <div className="print:hidden">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-[#f5f3ff] flex items-center justify-center text-[#8b5cf6] font-bold text-xs shrink-0 mt-0.5">
              {q.number}
            </span>
            {questionTxt && <p className="text-[--text-primary] text-sm font-medium leading-relaxed">{questionTxt}</p>}
          </div>
          <span className="text-xs font-semibold text-[#8b5cf6] bg-[#f5f3ff] px-2.5 py-1 rounded-full shrink-0">
            {marks} marks
          </span>
        </div>

        {/* Sub-questions */}
        {q.sub_questions && q.sub_questions.length > 0 ? (
          <div className="space-y-3 ml-10">
            {q.sub_questions.map((sub) => (
              <div key={sub.part} className="bg-[#fafafa] border border-[--border] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#8b5cf6] font-bold text-xs uppercase">Part ({sub.part})</span>
                  <span className="text-[--text-muted] text-xs">{sub.marks} marks</span>
                </div>
                {sub.model_answer && (
                  <p className="text-[--text-primary] text-sm mb-2"><strong>Model:</strong> {sub.model_answer}</p>
                )}
                {sub.mark_points && sub.mark_points.length > 0 && (
                  <ul className="space-y-1">
                    {sub.mark_points.map((pt, i) => (
                      <li key={i} className="text-[--text-secondary] text-xs flex gap-1.5">
                        <span className="text-[#8b5cf6] shrink-0">▸</span>{pt}
                      </li>
                    ))}
                  </ul>
                )}
                {sub.accept_alternatives && sub.accept_alternatives.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[--border]">
                    <p className="text-[--text-muted] text-xs"><strong>Also accept:</strong> {sub.accept_alternatives.join("; ")}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#f5f3ff] rounded-xl p-4 mt-1 border border-[#8b5cf6]/20 ml-10">
            {modelAns && (
              <>
                <p className="text-[#8b5cf6] text-xs font-semibold mb-2 uppercase tracking-wide">Model Answer</p>
                <p className="text-[--text-primary] text-sm leading-relaxed whitespace-pre-line mb-3">{modelAns}</p>
              </>
            )}
            {markPoints.length > 0 && (
              <div className={modelAns ? "pt-3 border-t border-[#8b5cf6]/20" : ""}>
                <p className="text-[#8b5cf6] text-xs font-semibold mb-2 uppercase tracking-wide">Mark Points</p>
                <ul className="space-y-1">
                  {markPoints.map((pt, i) => (
                    <li key={i} className="text-[--text-secondary] text-sm flex gap-2">
                      <span className="text-[#8b5cf6] shrink-0">▸</span>{pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {altAccepts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#8b5cf6]/20">
                <p className="text-[--text-muted] text-xs font-semibold mb-1">Also accept:</p>
                <ul className="space-y-0.5">
                  {altAccepts.map((alt, i) => (
                    <li key={i} className="text-[--text-secondary] text-xs">• {alt}</li>
                  ))}
                </ul>
              </div>
            )}
            {examNote && (
              <div className="mt-3 pt-3 border-t border-[#8b5cf6]/20">
                <p className="text-[--text-muted] text-xs font-semibold mb-1">Examiner Note:</p>
                <p className="text-[--text-secondary] text-xs">{examNote}</p>
              </div>
            )}
            {markAlloc && (
              <p className="text-[--text-muted] text-xs mt-2">Mark allocation: {markAlloc}</p>
            )}
          </div>
        )}
      </div>

      {/* Print */}
      <div className="hidden print:block">
        <p className="assess-ms-q">
          <strong>Q{q.number}.</strong>{questionTxt ? ` ${questionTxt}` : ""} <em>({marks} marks)</em>
        </p>
        {q.sub_questions?.map((sub) => (
          <div key={sub.part} className="ml-4 mb-2">
            <p className="font-semibold text-sm">({sub.part}) — {sub.marks} marks</p>
            {sub.model_answer && <p className="text-sm">Model: {sub.model_answer}</p>}
            {sub.mark_points?.map((pt, i) => <p key={i} className="text-sm">• {pt}</p>)}
          </div>
        ))}
        {!q.sub_questions && modelAns && <p className="assess-ms-ans"><strong>Expected:</strong> {modelAns}</p>}
        {!q.sub_questions && markPoints.map((pt, i) => <p key={i} className="assess-ms-ans">• {pt}</p>)}
        {altAccepts.length > 0 && (
          <p className="assess-ms-alt"><strong>Also accept:</strong> {altAccepts.join("; ")}</p>
        )}
        {examNote && <p className="assess-ms-note"><strong>Note:</strong> {examNote}</p>}
        {markAlloc && <p className="assess-ms-alloc">Marks: {markAlloc}</p>}
      </div>
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────────────

function QuestionCard({ question: q, showAnswer }: { question: import("@/types/assessment").AssessmentQuestion; showAnswer: boolean }) {
  return (
    <div className="bg-[--bg-surface] border border-[--border] rounded-xl p-4 shadow-sm">
      {/* Screen */}
      <div className="print:hidden">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-[--bg-canvas] border border-[--border] flex items-center justify-center text-[--text-secondary] font-bold text-xs shrink-0 mt-0.5">
              {q.number}
            </span>
            <p className="text-[--text-primary] text-sm leading-relaxed">{q.question}</p>
          </div>
          <span className="text-xs text-[--text-muted] font-medium shrink-0 mt-1">[{q.marks} mark{q.marks !== 1 ? "s" : ""}]</span>
        </div>

        {/* MCQ options */}
        {q.type === "mcq" && q.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-10 mt-2">
            {q.options.map((opt) => (
              <div key={opt.letter}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                  showAnswer && opt.letter === q.answer
                    ? "bg-[#e6f4ec] text-[#007531] font-medium"
                    : "bg-[--bg-canvas] text-[--text-secondary]"
                )}>
                <span className="font-semibold w-5">{opt.letter}.</span>
                {opt.text}
                {showAnswer && opt.letter === q.answer && (
                  <CheckCircle2 size={12} className="ml-auto text-[#007531] shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* True/False */}
        {q.type === "true_false" && (
          <div className="flex gap-3 ml-10 mt-2">
            {["True", "False"].map((v) => (
              <span key={v}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium",
                  showAnswer && q.answer?.toLowerCase() === v.toLowerCase()
                    ? "bg-[#e6f4ec] text-[#007531]"
                    : "bg-[--bg-canvas] text-[--text-muted]"
                )}>
                {v}
              </span>
            ))}
          </div>
        )}

        {/* Answer guide */}
        {showAnswer && q.answer_guide && (
          <div className="mt-3 ml-10 p-3 bg-[#fffbf0] border border-[#f6d860]/50 rounded-lg">
            <p className="text-[--text-muted] text-xs font-semibold mb-1">Marking Guide:</p>
            <p className="text-[--text-secondary] text-xs">{q.answer_guide}</p>
          </div>
        )}
      </div>

      {/* Print */}
      <div className="hidden print:block">
        <p className="assess-question">
          <strong>{q.number}.</strong> {q.question}
          <span className="assess-marks"> [{q.marks} mark{q.marks !== 1 ? "s" : ""}]</span>
        </p>
        {q.type === "mcq" && q.options && (
          <div className="assess-options">
            {q.options.map((opt) => (
              <p key={opt.letter} className="assess-option">
                <strong>{opt.letter}.</strong> {opt.text}
              </p>
            ))}
          </div>
        )}
        {q.type === "short_answer" && (
          <div className="assess-answer-line" />
        )}
      </div>
    </div>
  );
}

function SectionHeading({ title, color }: { title: string; color: string }) {
  return (
    <h3 className="text-[--text-primary] font-semibold text-sm flex items-center gap-2.5">
      <span className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {title}
    </h3>
  );
}
