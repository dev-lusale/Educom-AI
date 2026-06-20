"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LessonPlanForm, { type FormValues } from "@/components/lesson-planner/LessonPlanForm";
import LessonPlanOutput from "@/components/lesson-planner/LessonPlanOutput";
import type { LessonPlanData } from "@/types/lesson-plan";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function LessonPlannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [lessonPlan, setLessonPlan] = useState<LessonPlanData | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Auth gate ─────────────────────────────────────────────────────────────
  // Show a full-page spinner while NextAuth hydrates the session.
  // Once resolved, redirect unauthenticated visitors to sign-in.
  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#ea4c89]" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.replace("/auth/signin?callbackUrl=/lesson-planner");
    // Return spinner while redirect fires — prevents flash of content
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#ea4c89]" />
      </div>
    );
  }
  // ── End auth gate ─────────────────────────────────────────────────────────

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

      // Auto-save to the user's library
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 print:hidden">
        <h1 className="text-2xl font-bold text-[--text-primary] mb-1 tracking-tight">
          Lesson Plan Generator
        </h1>
        <p className="text-[--text-secondary] text-sm">
          Fill in the details below and get a complete, CBC-aligned lesson plan in seconds.
        </p>
      </div>

      {/* Form */}
      <div className="print:hidden">
        <LessonPlanForm
          onGenerate={handleGenerate}
          loading={loading}
          defaultTeacherName={session?.user.name ?? ""}
          defaultSchool={session?.user.school ?? ""}
        />
      </div>

      {/* Error */}
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
          isLoggedIn={true}
        />
      )}
    </main>
  );
}
