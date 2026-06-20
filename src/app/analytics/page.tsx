import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  BarChart2, BookOpen, Users, TrendingUp, Award,
  Clock, CheckCircle2, Star, ArrowUp, ArrowDown,
  Sparkles, Crown, Calendar,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getUserSubscriptionInfo } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const userId = session.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [totalPlans, thisMonthPlans, lastMonthPlans, sharedPlans,
    subInfo, recentPlans, plansBySubject, plansByGrade] = await (async () => {
    try {
      return await Promise.all([
        prisma.lessonPlan.count({ where: { userId } }),
        prisma.lessonPlan.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
        prisma.lessonPlan.count({ where: { userId, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
        prisma.sharedPlan.count({ where: { userId } }),
        getUserSubscriptionInfo(userId),
        prisma.lessonPlan.findMany({
          where: { userId }, orderBy: { createdAt: "desc" }, take: 5,
          select: { id: true, topic: true, subject: true, grade: true, createdAt: true },
        }),
        prisma.lessonPlan.groupBy({
          by: ["subject"], where: { userId }, _count: { subject: true },
          orderBy: { _count: { subject: "desc" } }, take: 6,
        }),
        prisma.lessonPlan.groupBy({
          by: ["grade"], where: { userId }, _count: { grade: true },
          orderBy: { _count: { grade: "desc" } }, take: 6,
        }),
      ]);
    } catch {
      return [0, 0, 0, 0, { plan: "FREE", status: "NONE", endDate: null, startDate: null, daysRemaining: null, paymentMethod: null, receiptNumber: null }, [], [], []];
    }
  })();

  const isPremium = subInfo.plan === "PREMIUM";
  const monthGrowth = lastMonthPlans > 0
    ? Math.round(((thisMonthPlans - lastMonthPlans) / lastMonthPlans) * 100)
    : thisMonthPlans > 0 ? 100 : 0;
  const shareRate = totalPlans > 0 ? Math.round((sharedPlans / totalPlans) * 100) : 0;

  // Canonical Zambian CBC grade order for display
  const GRADE_ORDER = [
    "ECE Level 1", "ECE Level 2", "ECE Level 3", "ECE Level 4",
    "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7",
    "Form 1", "Form 2",
    "Form 3", "Form 4",
    "Form 5", "Form 6",
  ];

  // Migrate old Grade 8–12 labels to the current CBC Form system
  const GRADE_MIGRATION: Record<string, string> = {
    "Grade 8":  "Form 1",
    "Grade 9":  "Form 2",
    "Grade 10": "Form 3",
    "Grade 11": "Form 4",
    "Grade 12": "Form 5",
  };

  // Apply migration: rename legacy labels and merge counts for any duplicates
  const gradeMergeMap = new Map<string, number>();
  for (const g of plansByGrade) {
    const displayGrade = GRADE_MIGRATION[g.grade] ?? g.grade;
    gradeMergeMap.set(displayGrade, (gradeMergeMap.get(displayGrade) ?? 0) + g._count.grade);
  }

  // Sort merged grades by canonical educational order
  const sortedPlansByGrade = Array.from(gradeMergeMap.entries())
    .map(([grade, count]) => ({ grade, _count: { grade: count } }))
    .sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a.grade);
      const bi = GRADE_ORDER.indexOf(b.grade);
      if (ai === -1 && bi === -1) return a.grade.localeCompare(b.grade);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d;
  });
  const dailyCounts = await Promise.all(
    last7Days.map((day) => {
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end = new Date(day); end.setHours(23, 59, 59, 999);
      return prisma.lessonPlan.count({ where: { userId, createdAt: { gte: start, lte: end } } }).catch(() => 0);
    })
  );
  const activityData = last7Days.map((day, i) => ({
    label: day.toLocaleDateString("en-ZM", { weekday: "short" }),
    count: dailyCounts[i],
  }));
  const maxActivity = Math.max(...activityData.map((d) => d.count), 1);

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[--text-primary] mb-1 tracking-tight">Analytics</h1>
          <p className="text-[--text-secondary] text-sm">Track your teaching activity and performance.</p>
        </div>
        {!isPremium && (
          <Link href="/payment" className="drib-btn-primary inline-flex items-center gap-2 text-sm">
            <Crown size={14} /> Unlock Full Analytics
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={BookOpen} label="Total Plans" value={totalPlans}
          accent="#ea4c89" accentBg="#fce4ef"
        />
        <KpiCard
          icon={Calendar} label="This Month" value={thisMonthPlans}
          accent="#007531" accentBg="#e6f4ec"
          badge={monthGrowth !== 0 ? (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              monthGrowth > 0 ? "bg-[#e6f4ec] text-[#007531]" : "bg-red-50 text-red-500"
            )}>
              {monthGrowth > 0 ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
              {Math.abs(monthGrowth)}%
            </span>
          ) : null}
        />
        <KpiCard
          icon={Users} label="Plans Shared" value={sharedPlans}
          accent="#3b82f6" accentBg="#eff6ff"
        />
        <KpiCard
          icon={TrendingUp} label="Share Rate" value={`${shareRate}%`}
          accent="#8b5cf6" accentBg="#f5f3ff" isText
        />
      </div>

      {/* Chart + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 drib-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[--text-primary] font-semibold">Activity — Last 7 Days</h2>
            <span className="text-[--text-muted] text-xs">Plans per day</span>
          </div>
          <div className="flex items-end gap-2 h-36">
            {activityData.map((day) => (
              <div key={day.label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[--text-muted] text-[10px]">{day.count > 0 ? day.count : ""}</span>
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${Math.max((day.count / maxActivity) * 100, day.count > 0 ? 8 : 4)}%`,
                    background: day.count > 0 ? "linear-gradient(to top, #ea4c89, #f082ac)" : "#f0f0f0",
                    minHeight: "4px",
                  }}
                />
                <span className="text-[--text-muted] text-[10px]">{day.label}</span>
              </div>
            ))}
          </div>
          {activityData.every((d) => d.count === 0) && (
            <p className="text-center text-[--text-muted] text-sm mt-4">
              No plans in the last 7 days.{" "}
              <Link href="/lesson-planner" className="text-[#ea4c89] hover:underline">Create one now →</Link>
            </p>
          )}
        </div>

        <div className="drib-card p-5 flex flex-col gap-4">
          <h2 className="text-[--text-primary] font-semibold">Quick Stats</h2>
          <QuickStatRow icon={Star} label="Last Month Plans" value={lastMonthPlans} color="#f59e0b" bg="#fef9c3" />
          <QuickStatRow
            icon={CheckCircle2} label="Avg Plans / Month"
            value={totalPlans > 0 ? Math.round(totalPlans / Math.max(1, Math.ceil((now.getTime() - new Date(recentPlans[recentPlans.length - 1]?.createdAt ?? now).getTime()) / (1000 * 60 * 60 * 24 * 30)))) : 0}
            color="#007531" bg="#e6f4ec"
          />
          <QuickStatRow icon={Award} label="Community Contributions" value={sharedPlans} color="#3b82f6" bg="#eff6ff" />
          <QuickStatRow icon={Sparkles} label="Subjects Covered" value={plansBySubject.length} color="#8b5cf6" bg="#f5f3ff" />
        </div>
      </div>

      {/* Subject & Grade breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="drib-card p-5">
          <h2 className="text-[--text-primary] font-semibold mb-5">Plans by Subject</h2>
          {plansBySubject.length > 0 ? (
            <div className="space-y-3.5">
              {plansBySubject.map((s) => {
                const pct = Math.round((s._count.subject / totalPlans) * 100);
                return (
                  <div key={s.subject}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[--text-primary] text-sm truncate max-w-[70%]">{s.subject}</span>
                      <span className="text-[--text-muted] text-xs font-medium">{s._count.subject} <span className="text-[#c4c4ca]">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-[--bg-elevated] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-[#ea4c89]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-8">
              No plans yet. <Link href="/lesson-planner" className="text-[#ea4c89] hover:underline">Create your first →</Link>
            </p>
          )}
        </div>

        <div className="drib-card p-5">
          <h2 className="text-[--text-primary] font-semibold mb-5">Plans by Grade</h2>
          {sortedPlansByGrade.length > 0 ? (
            <div className="space-y-3.5">
              {sortedPlansByGrade.map((g) => {
                const pct = Math.round((g._count.grade / totalPlans) * 100);
                return (
                  <div key={g.grade}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[--text-primary] text-sm">{g.grade}</span>
                      <span className="text-[--text-muted] text-xs font-medium">{g._count.grade} <span className="text-[#c4c4ca]">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-[--bg-elevated] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-[#007531]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[--text-muted] text-sm text-center py-8">No plans yet.</p>
          )}
        </div>
      </div>

      {/* Recent Plans */}
      <div className="drib-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[--text-primary] font-semibold">Recent Plans</h2>
          <Link href="/lesson-planner" className="text-[#ea4c89] text-xs hover:text-[#d6437a] transition-colors font-medium">
            View all →
          </Link>
        </div>
        {recentPlans.length > 0 ? (
          <div className="space-y-1.5">
            {recentPlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[--bg-canvas] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-[#fce4ef] rounded-lg flex items-center justify-center shrink-0">
                    <BookOpen size={13} className="text-[#ea4c89]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[--text-primary] text-sm font-medium truncate">{plan.topic}</p>
                    <p className="text-[--text-muted] text-xs">{plan.subject} · {plan.grade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[--text-muted] text-xs shrink-0 ml-4">
                  <Clock size={11} />
                  {new Date(plan.createdAt).toLocaleDateString("en-ZM", { day: "numeric", month: "short" })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <BookOpen size={28} className="text-[#e8e8e8] mx-auto mb-3" />
            <p className="text-[--text-muted] text-sm mb-4">No lesson plans yet.</p>
            <Link href="/lesson-planner" className="drib-btn-primary inline-flex items-center gap-2 text-sm">
              <Sparkles size={13} /> Create Your First Plan
            </Link>
          </div>
        )}
      </div>

      {/* Premium upsell */}
      {!isPremium && (
        <div className="mt-6 drib-card p-6 flex items-center gap-5 border-[#f5b8d4] bg-gradient-to-r from-[#fce4ef]/50 to-white">
          <div className="w-11 h-11 bg-[#fce4ef] rounded-xl flex items-center justify-center shrink-0">
            <Crown size={20} className="text-[#ea4c89]" />
          </div>
          <div className="flex-1">
            <p className="text-[--text-primary] font-semibold mb-1">Unlock Advanced Analytics</p>
            <p className="text-[--text-secondary] text-sm">Get performance trends, engagement metrics, and exportable reports.</p>
          </div>
          <Link href="/payment" className="drib-btn-primary inline-flex items-center gap-2 text-sm shrink-0">
            <Crown size={13} /> Upgrade
          </Link>
        </div>
      )}
    </main>
  );
}

function KpiCard({ icon: Icon, label, value, accent, accentBg, isText, badge }: {
  icon: React.ElementType; label: string; value: number | string;
  accent: string; accentBg: string; isText?: boolean; badge?: React.ReactNode;
}) {
  return (
    <div className="drib-card p-4 hover:shadow-card-hover transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: accentBg }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="flex items-center gap-2 mb-0.5">
        <p className="font-bold text-2xl leading-tight text-[--text-primary]" style={isText ? { color: accent } : undefined}>{value}</p>
        {badge}
      </div>
      <p className="text-[--text-muted] text-xs">{label}</p>
    </div>
  );
}

function QuickStatRow({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: number; color: string; bg: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="flex-1">
        <p className="text-[--text-secondary] text-xs">{label}</p>
      </div>
      <p className="text-[--text-primary] font-bold text-lg">{value}</p>
    </div>
  );
}
