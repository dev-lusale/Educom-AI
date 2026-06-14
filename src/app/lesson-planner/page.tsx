"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import LessonPlanForm, { type FormValues } from "@/components/lesson-planner/LessonPlanForm";
import LessonPlanOutput from "@/components/lesson-planner/LessonPlanOutput";
import type { LessonPlanData } from "@/types/lesson-plan";
import { Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LessonPlannerPage() {
  const { data: session } = useSession();
  const [lessonPlan, setLessonPlan] = useState<LessonPlanData | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(values: FormValues) {
    setLoading(true);
    setError(null);
    setLessonPlan(null);
    setSavedPlanId(null);

    try {
      const res = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate lesson plan.");
      }

      const data: LessonPlanData = await res.json();
      setLessonPlan(data);

      // Auto-save if logged in
      if (session) {
        const saveRes = await fetch("/api/lesson-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, planData: data }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json();
          setSavedPlanId(saved.id);
          toast.success("Lesson plan saved to your library.");
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
      {/* Header — hidden on print */}
      <div className="mb-8 print:hidden">
        <h1 className="text-2xl font-bold text-[#0d0d0d] mb-1 tracking-tight">
          Lesson Plan Generator
        </h1>
        <p className="text-[#6b6b76] text-sm">
          Fill in the details below and get a complete, CBC-aligned lesson plan in seconds.
        </p>
        {!session && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#6b6b76] bg-white border border-[#e8e8e8] rounded-xl px-4 py-2.5 shadow-card">
            <Lock size={13} className="text-[#ea4c89]" />
            <span>
              <Link href="/auth/signin" className="text-[#ea4c89] hover:text-[#d6437a] font-medium">Sign in</Link>
              {" "}to save plans and share with colleagues
            </span>
          </div>
        )}
      </div>

      {/* Form — hidden on print */}
      <div className="print:hidden">
        <LessonPlanForm
          onGenerate={handleGenerate}
          loading={loading}
          defaultTeacherName={session?.user.name ?? ""}
          defaultSchool={session?.user.school ?? ""}
        />
      </div>

      {/* Error — hidden on print */}
      {error && (
        <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm print:hidden">
          {error}
        </div>
      )}

      {/* Output */}
      {lessonPlan && (
        <LessonPlanOutput
          plan={lessonPlan}
          savedPlanId={savedPlanId}
          isPremium={session?.user.plan === "PREMIUM"}
          isLoggedIn={!!session}
        />
      )}
    </main>
  );
}
