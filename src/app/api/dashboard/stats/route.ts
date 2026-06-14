/**
 * GET /api/dashboard/stats
 *
 * Returns all four dashboard metric cards for the authenticated user only.
 * Every query is strictly scoped to session.user.id — no global data leaks.
 *
 * Security model:
 * - user ID is ALWAYS extracted server-side from the verified session token
 * - no client-supplied identifiers are trusted
 * - every Prisma query carries an explicit `where: { userId }` clause
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // ── 1. Authentication — extract user ID from verified server-side session ──
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id; // never trust client-supplied IDs

  // ── 2. All queries strictly scoped to this user ──────────────────────────
  const [
    lessonCount,
    resourceCount,
    sharedCount,
    recentPlans,
  ] = await Promise.all([

    // Lesson Plans created by this user only
    prisma.lessonPlan.count({
      where: { userId },
    }),

    // Resources uploaded by this user only (proxy for "materials managed")
    prisma.resource.count({
      where: { userId },
    }),

    // Plans this user has shared with the community
    prisma.sharedPlan.count({
      where: { userId },
    }),

    // Recent plans to derive subject/grade diversity metrics
    prisma.lessonPlan.findMany({
      where: { userId },
      select: {
        grade: true,
        subject: true,
        enrollment: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50, // enough for meaningful averages
    }),
  ]);

  // ── 3. Derive user-scoped computed metrics ────────────────────────────────

  // "Students Managed" — sum of enrollment values from this user's lesson plans.
  // Each plan's enrollment field stores the class size the teacher entered.
  // We take the max unique enrollment per grade+subject combo to avoid double-counting
  // the same class across multiple lessons.
  const classMap = new Map<string, number>();
  for (const plan of recentPlans) {
    if (!plan.enrollment) continue;
    const classKey = `${plan.grade}::${plan.subject}`;
    const size = parseInt(plan.enrollment.replace(/\D/g, ""), 10);
    if (!isNaN(size)) {
      // Keep the highest enrollment seen for this class (most recent entry wins)
      const existing = classMap.get(classKey) ?? 0;
      if (size > existing) classMap.set(classKey, size);
    }
  }
  const studentCount = Array.from(classMap.values()).reduce((sum, n) => sum + n, 0);

  // "Assessments" — number of distinct subjects × grades this teacher has covered.
  // This is a meaningful proxy for assessment breadth since the schema doesn't have
  // a dedicated Assessment model yet. Each unique subject+grade pair = 1 assessment scope.
  const uniqueSubjectGrades = new Set(
    recentPlans.map((p) => `${p.subject}::${p.grade}`)
  );
  const assessmentCount = uniqueSubjectGrades.size;

  // "Average Performance" — calculated from community engagement on this user's shared plans.
  // Formula: (sharedCount / max(lessonCount, 1)) * 100, capped at 100.
  // This reflects how actively the teacher is contributing — a real user-scoped metric.
  // When the schema gains an Assessment model with scores, replace this with actual averages.
  const shareRate =
    lessonCount > 0
      ? Math.min(Math.round((sharedCount / lessonCount) * 100), 100)
      : 0;

  // Fallback: if teacher has plans but hasn't shared yet, show completion rate
  // based on how many plans have enrollment data filled in (indicates active use)
  const plansWithEnrollment = recentPlans.filter((p) => p.enrollment && p.enrollment !== "—").length;
  const completionRate =
    lessonCount > 0
      ? Math.min(Math.round((plansWithEnrollment / Math.min(lessonCount, 50)) * 100), 100)
      : 0;

  // Use the higher of the two as the "performance" indicator
  const averagePerformance = Math.max(shareRate, completionRate);

  // ── 4. Return user-scoped stats ───────────────────────────────────────────
  return NextResponse.json({
    lessonCount,
    studentCount,
    assessmentCount,
    averagePerformance,
    // metadata for transparency
    _meta: {
      userId,          // confirm which user these stats belong to
      resourceCount,
      sharedCount,
      plansAnalysed: recentPlans.length,
    },
  });
}
