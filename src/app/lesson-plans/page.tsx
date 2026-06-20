import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import AllPlansClient from "./AllPlansClient";

export default async function LessonPlansPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin?callbackUrl=/lesson-plans");

  const plans = await prisma.lessonPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { sharedPlan: { select: { id: true } } },
  });

  const serialised = plans.map((p) => ({
    id: p.id,
    topic: p.topic,
    grade: p.grade,
    subject: p.subject,
    duration: p.duration,
    date: p.date,
    createdAt: p.createdAt.toISOString(),
    isShared: !!p.sharedPlan,
  }));

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight mb-1">
            My Lesson Plans
          </h1>
          <p className="text-[--text-secondary] text-sm">
            {serialised.length === 0
              ? "No plans yet — create your first one."
              : `${serialised.length} plan${serialised.length !== 1 ? "s" : ""} in your library`}
          </p>
        </div>
        <Link href="/lesson-planner" className="drib-btn-primary inline-flex items-center gap-2">
          <Plus size={15} /> New Plan
        </Link>
      </div>

      <AllPlansClient
        plans={serialised}
        isPremium={session.user.plan === "PREMIUM"}
      />
    </main>
  );
}
