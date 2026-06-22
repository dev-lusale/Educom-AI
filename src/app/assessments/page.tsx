"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import AssessmentForm, { type AssessmentFormValues } from "@/components/assessments/AssessmentForm";
import AssessmentOutput from "@/components/assessments/AssessmentOutput";
import type { QuizData, ExamData, MarkingSchemeData } from "@/types/assessment";
import {
  ClipboardList, Crown, Lock, BookOpen, ClipboardCheck, FileText,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type AnyAssessment = QuizData | ExamData | MarkingSchemeData;

export default function AssessmentsPage() {
  const { data: session } = useSession();
  const isPremium = session?.user?.plan === "PREMIUM";

  const [assessment, setAssessment] = useState<AnyAssessment | null>(null);
  const [assessmentType, setAssessmentType] = useState<"quiz" | "exam" | "marking_scheme">("quiz");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map assessment type ? dedicated OpenRouter-powered API route
  const ENDPOINT: Record<string, string> = {
    quiz:           "/api/quiz-generator",
    exam:           "/api/exam-generator",
    marking_scheme: "/api/marking-scheme",
  };

  async function handleGenerate(values: AssessmentFormValues) {
    setLoading(true);
    setError(null);
    setAssessment(null);
    setSavedId(null);

    try {
      const endpoint = ENDPOINT[values.assessment_type] ?? "/api/generate-assessment";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.premium_required) {
          setError("Assessment generation requires a Premium subscription.");
        } else {
          throw new Error(data.error || "Failed to generate assessment.");
        }
        setLoading(false);
        return;
      }

      const data: AnyAssessment = await res.json();
      setAssessment(data);
      setAssessmentType(values.assessment_type);

      // Auto-save if premium
      if (session && isPremium) {
        const saveRes = await fetch("/api/assessments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grade: values.grade,
            subject: values.subject,
            topic: values.topic,
            assessmentType: values.assessment_type,
            assessmentData: data,
          }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          setSavedId(saved.id);
          toast.success("Assessment saved to your library.");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      {/* -- Header -- */}
      <div className="mb-8 print:hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-[#e6f4ec] rounded-xl flex items-center justify-center">
            <ClipboardList size={17} className="text-[#00A344]" />
          </div>
          <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight">
            Assessment Intelligence
          </h1>
          {isPremium && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e6f4ec] text-[#00A344] flex items-center gap-1">
              <Crown size={10} /> Premium
            </span>
          )}
        </div>
        <p className="text-[--text-secondary] text-sm">
          Generate ECZ-aligned quizzes, examination papers, and marking schemes in seconds.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { icon: BookOpen,       color: "#3b82f6", bg: "#eff6ff",  label: "Quiz Generator" },
            { icon: ClipboardCheck, color: "#007531", bg: "#e6f4ec",  label: "Exam Papers" },
            { icon: FileText,       color: "#8b5cf6", bg: "#f5f3ff",  label: "Marking Schemes" },
          ].map(({ icon: Icon, color, bg, label }) => (
            <span key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ color, backgroundColor: bg }}>
              <Icon size={11} /> {label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[--bg-canvas] text-[--text-secondary]">
            PDF Export
          </span>
        </div>
      </div>

      {/* -- Premium gate banner -- */}
      {!isPremium && (
        <div className="drib-card p-5 mb-6 flex items-start gap-4 border-l-4 border-l-[#00A344] print:hidden">
          <div className="w-9 h-9 bg-[#e6f4ec] rounded-xl flex items-center justify-center shrink-0">
            <Lock size={16} className="text-[#00A344]" />
          </div>
          <div className="flex-1">
            <p className="text-[--text-primary] font-semibold text-sm">Premium Feature</p>
            <p className="text-[--text-secondary] text-xs mt-0.5">
              Assessment generation requires a Premium subscription. Upgrade to unlock unlimited quizzes, exam papers, marking schemes, and PDF exports.
            </p>
          </div>
          <Link href="/payment"
            className="drib-btn-primary flex items-center gap-1.5 text-xs px-4 py-2 shrink-0">
            <Crown size={12} /> Upgrade
          </Link>
        </div>
      )}

      {/* -- Form -- */}
      <div className="print:hidden">
        <AssessmentForm
          onGenerate={handleGenerate}
          loading={loading}
          isPremium={isPremium}
          defaultTeacherName={session?.user?.name ?? ""}
        />
      </div>

      {/* -- Error -- */}
      {error && (
        <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm print:hidden flex items-start gap-3">
          <span className="text-red-500 shrink-0">?</span>
          <div>
            {error}
            {error.includes("Premium") && (
              <Link href="/payment" className="ml-2 text-[#00A344] font-medium hover:underline">
                Upgrade now ?
              </Link>
            )}
          </div>
        </div>
      )}

      {/* -- Output -- */}
      {assessment && (
        <AssessmentOutput
          assessment={assessment}
          assessmentType={assessmentType}
          savedId={savedId}
          onDelete={() => { setAssessment(null); setSavedId(null); }}
        />
      )}
    </main>
  );
}
