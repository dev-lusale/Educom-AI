import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import CommunityFeed from "@/components/community/CommunityFeed";
import { Users, BookOpen, Heart, Share2, Crown, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const session = await auth().catch(() => null);
  const isPremium = session?.user?.plan === "PREMIUM";

  // Wrap all DB calls — if DATABASE_URL is missing or DB is down, show zeros
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
    // DB unavailable — page still renders with empty stats
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 bg-[#fce4ef] rounded-full px-3 py-1.5 text-xs font-medium text-[#ea4c89] mb-4">
          <Users size={12} />
          Teacher Community
        </div>
        <h1 className="text-2xl font-bold text-[#0d0d0d] mb-1 tracking-tight">
          Community Plans
        </h1>
        <p className="text-[#6b6b76] text-sm max-w-xl">
          Browse lesson plans shared by fellow Zambian teachers. Cover absent colleagues instantly
          or find inspiration for your next lesson.
        </p>

        {/* Live stats */}
        <div className="flex flex-wrap gap-5 mt-5">
          <div className="flex items-center gap-2 text-sm text-[#6b6b76]">
            <BookOpen size={14} className="text-[#ea4c89]" />
            <span><strong className="text-[#0d0d0d] font-semibold">{totalShared.toLocaleString()}</strong> plans shared</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#6b6b76]">
            <Users size={14} className="text-[#007531]" />
            <span><strong className="text-[#0d0d0d] font-semibold">{totalTeachers.toLocaleString()}</strong> educators</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#6b6b76]">
            <Heart size={14} className="text-red-400" />
            <span><strong className="text-[#0d0d0d] font-semibold">{totalLikes.toLocaleString()}</strong> likes</span>
          </div>
        </div>
      </div>

      {/* ── Share / Upsell banner ── */}
      {session && (
        isPremium ? (
          <div className="drib-card p-5 mb-7 flex items-center gap-4 border-l-4 border-l-[#007531]">
            <div className="w-9 h-9 bg-[#e6f4ec] rounded-xl flex items-center justify-center shrink-0">
              <Share2 size={16} className="text-[#007531]" />
            </div>
            <div className="flex-1">
              <p className="text-[#0d0d0d] font-semibold text-sm">Share your lesson plans</p>
              <p className="text-[#6b6b76] text-xs mt-0.5">
                Open any saved plan from your dashboard and click Share to contribute to the community.
              </p>
            </div>
            <Link href="/dashboard" className="text-[#ea4c89] text-xs hover:text-[#d6437a] font-medium shrink-0 transition-colors">
              Go to Dashboard →
            </Link>
          </div>
        ) : (
          <div className="drib-card p-5 mb-7 flex items-center gap-4 border-l-4 border-l-[#ea4c89]">
            <div className="w-9 h-9 bg-[#fce4ef] rounded-xl flex items-center justify-center shrink-0">
              <Crown size={16} className="text-[#ea4c89]" />
            </div>
            <div className="flex-1">
              <p className="text-[#0d0d0d] font-semibold text-sm">Share with the community</p>
              <p className="text-[#6b6b76] text-xs mt-0.5">
                Upgrade to Premium to share plans and help colleagues cover absent teachers.
              </p>
            </div>
            <Link href="/payment" className="drib-btn-primary text-xs px-4 py-2 shrink-0">
              Upgrade
            </Link>
          </div>
        )
      )}

      {/* ── Trending subjects ── */}
      {topSubjects.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} className="text-[#ea4c89]" />
            <h2 className="text-[#0d0d0d] font-semibold text-sm">Trending Subjects</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {topSubjects.map((s) => (
              <span
                key={s.subject}
                className="px-3 py-1.5 bg-white border border-[#e8e8e8] rounded-full text-xs text-[#6b6b76] hover:text-[#0d0d0d] hover:border-[#d4d4d4] transition-colors cursor-default shadow-card"
              >
                {s.subject}
                <span className="ml-1.5 text-[#ea4c89] font-semibold">{s._count.subject}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <CommunityFeed userId={session?.user.id} isPremium={isPremium} />
    </main>
  );
}
