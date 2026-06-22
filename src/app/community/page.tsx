import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CommunityFeed from "@/components/community/CommunityFeed";
import { Users, BookOpen, Heart, Share2, Crown, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  // -- Auth gate � must be signed in to view community ----------------------
  const session = await auth().catch(() => null);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/community");
  }
  // -- End auth gate ---------------------------------------------------------

  const isPremium = session.user?.plan === "PREMIUM";

  // Wrap all DB calls � if DB is unavailable, render with zeros
  let totalShared = 0, totalTeachers = 0, totalLikes = 0;
  let topSubjects: { subject: string; _count: { subject: number } }[] = [];

  try {
    [totalShared, totalTeachers, totalLikes, topSubjects] = await Promise.all([
      prisma.sharedPlan.count({ where: { isPublic: true } }),
      prisma.user.count(),
      prisma.planLike.count(),
      prisma.sharedPlan.groupBy({
        by: ["subject"],
        where: { isPublic: true },
        _count: { subject: true },
        orderBy: { _count: { subject: "desc" } },
        take: 8,
      }),
    ]);
  } catch {
    // DB unavailable � page still renders with empty stats
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">

      {/* -- Header -- */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 bg-[#e6f4ec] rounded-full px-3 py-1.5 text-xs font-medium text-[#00A344] mb-4">
          <Users size={12} />
          Teacher Community
        </div>
        <h1 className="text-2xl font-bold text-[--text-primary] mb-1 tracking-tight">
          Community Plans
        </h1>
        <p className="text-[--text-secondary] text-sm max-w-xl">
          Browse lesson plans shared by fellow Zambian teachers. Cover absent colleagues instantly
          or find inspiration for your next lesson.
        </p>

        {/* Live stats */}
        <div className="flex flex-wrap gap-5 mt-5">
          <div className="flex items-center gap-2 text-sm text-[--text-secondary]">
            <BookOpen size={14} className="text-[#00A344]" />
            <span>
              <strong className="text-[--text-primary] font-semibold">{totalShared.toLocaleString()}</strong> plans shared
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[--text-secondary]">
            <Users size={14} className="text-[#007531]" />
            <span>
              <strong className="text-[--text-primary] font-semibold">{totalTeachers.toLocaleString()}</strong> educators
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[--text-secondary]">
            <Heart size={14} className="text-red-400" />
            <span>
              <strong className="text-[--text-primary] font-semibold">{totalLikes.toLocaleString()}</strong> likes
            </span>
          </div>
        </div>
      </div>

      {/* -- Share / Upsell banner -- */}
      {isPremium ? (
        <div className="drib-card p-5 mb-7 flex items-center gap-4 border-l-4 border-l-[#007531]">
          <div className="w-9 h-9 bg-[#e6f4ec] rounded-xl flex items-center justify-center shrink-0">
            <Share2 size={16} className="text-[#007531]" />
          </div>
          <div className="flex-1">
            <p className="text-[--text-primary] font-semibold text-sm">Share your lesson plans</p>
            <p className="text-[--text-secondary] text-xs mt-0.5">
              Open any saved plan from your dashboard and click Share to contribute to the community.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-[#00A344] text-xs hover:text-[#007531] font-medium shrink-0 transition-colors"
          >
            Go to Dashboard ?
          </Link>
        </div>
      ) : (
        <div className="drib-card p-5 mb-7 flex items-center gap-4 border-l-4 border-l-[#00A344]">
          <div className="w-9 h-9 bg-[#e6f4ec] rounded-xl flex items-center justify-center shrink-0">
            <Crown size={16} className="text-[#00A344]" />
          </div>
          <div className="flex-1">
            <p className="text-[--text-primary] font-semibold text-sm">Share with the community</p>
            <p className="text-[--text-secondary] text-xs mt-0.5">
              Upgrade to Premium to share plans and help colleagues cover absent teachers.
            </p>
          </div>
          <Link href="/payment" className="drib-btn-primary text-xs px-4 py-2 shrink-0">
            Upgrade
          </Link>
        </div>
      )}

      {/* -- Trending subjects -- */}
      {topSubjects.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-[#00A344]" />
            <h2 className="text-[--text-primary] font-semibold text-sm">Trending Subjects</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {topSubjects.map((s) => (
              <span
                key={s.subject}
                className="px-3 py-1.5 bg-[--bg-surface] border border-[--border] rounded-full text-xs text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-hover] transition-colors cursor-default shadow-card"
              >
                {s.subject}
                <span className="ml-1.5 text-[#00A344] font-semibold">{s._count.subject}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <CommunityFeed userId={session.user.id} isPremium={isPremium} />
    </main>
  );
}
