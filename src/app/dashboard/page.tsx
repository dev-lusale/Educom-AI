import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  BookOpen, Users, Plus, ArrowRight, Clock,
  Crown, AlertTriangle, RefreshCw, Calendar,
  CreditCard, ClipboardCheck, BarChart2, Sparkles, Bell,
} from "lucide-react";
import { getUserSubscriptionInfo } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import RecentPlansSection from "@/components/dashboard/RecentPlansSection";

const METHOD_LABELS: Record<string, string> = {
  MTN_MOMO: "MTN MoMo",
  AIRTEL_MONEY: "Airtel Money",
  ZAMTEL_MONEY: "Zamtel Money",
  BANK_TRANSFER: "Bank Transfer",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const userId = session.user.id;

  const [planCount, , recentPlansRaw, subInfo, recentPlansForStats] =
    await Promise.all([
      prisma.lessonPlan.count({ where: { userId } }),
      prisma.sharedPlan.count({ where: { userId } }),
      prisma.lessonPlan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { sharedPlan: { select: { id: true } } },
      }),
      getUserSubscriptionInfo(userId),
      prisma.lessonPlan.findMany({
        where: { userId },
        select: { grade: true, subject: true, enrollment: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

  const classMap = new Map<string, number>();
  for (const plan of recentPlansForStats) {
    if (!plan.enrollment) continue;
    const classKey = `${plan.grade}::${plan.subject}`;
    const size = parseInt(plan.enrollment.replace(/\D/g, ""), 10);
    if (!isNaN(size) && size > 0) {
      const existing = classMap.get(classKey) ?? 0;
      if (size > existing) classMap.set(classKey, size);
    }
  }
  const studentCount = Array.from(classMap.values()).reduce((sum, n) => sum + n, 0);

  const assessmentCount = new Set(
    recentPlansForStats.map((p) => `${p.subject}::${p.grade}`)
  ).size;

  const plansWithEnrollment = recentPlansForStats.filter(
    (p) => p.enrollment && p.enrollment !== "—" && p.enrollment.trim() !== ""
  ).length;
  const completionRate =
    planCount > 0
      ? Math.min(Math.round((plansWithEnrollment / Math.min(planCount, 50)) * 100), 100)
      : 0;

  const isPremium = subInfo.plan === "PREMIUM";
  const FREE_LIMIT = 5;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthlyCount = isPremium
    ? 0
    : await prisma.lessonPlan.count({
        where: { userId, createdAt: { gte: startOfMonth } },
      });
  const usagePercent = isPremium ? 0 : Math.min((monthlyCount / FREE_LIMIT) * 100, 100);

  const recentPlans = recentPlansRaw.map((p) => ({
    id: p.id,
    topic: p.topic,
    grade: p.grade,
    subject: p.subject,
    createdAt: p.createdAt.toISOString(),
    isShared: !!p.sharedPlan,
  }));

  const firstName = session.user.name ?? "Teacher";

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d0d0d] mb-1 tracking-tight">
            Good to see you, {firstName} 
          </h1>
          <p className="text-[#6b6b76] text-sm">
            Here&apos;s your teaching overview for today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/lesson-planner"
            className="drib-btn-primary inline-flex items-center gap-2"
          >
            <Plus size={15} /> New Plan
          </Link>
          <button className="relative w-10 h-10 bg-white border border-[#e8e8e8] rounded-xl flex items-center justify-center hover:border-[#d4d4d4] transition-all shadow-card">
            <Bell size={16} className="text-[#6b6b76]" />
          </button>
        </div>
      </div>

      {/* ── Subscription banners ── */}
      {isPremium && subInfo.status === "EXPIRING_SOON" && subInfo.daysRemaining !== null && (
        <div className="drib-card p-4 mb-6 flex items-center gap-4 border-l-4 border-l-yellow-400">
          <div className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-yellow-600" />
          </div>
          <div className="flex-1">
            <p className="text-[#0d0d0d] font-semibold text-sm">
              Subscription expires in {subInfo.daysRemaining} day{subInfo.daysRemaining !== 1 ? "s" : ""}
            </p>
            <p className="text-[#6b6b76] text-xs mt-0.5">Renew now to keep uninterrupted access.</p>
          </div>
          <Link href="/payment" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600 transition-colors shrink-0">
            <RefreshCw size={13} /> Renew
          </Link>
        </div>
      )}

      {subInfo.status === "EXPIRED" && (
        <div className="drib-card p-4 mb-6 flex items-center gap-4 border-l-4 border-l-red-400">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-[#0d0d0d] font-semibold text-sm">Your Premium subscription has expired</p>
            <p className="text-[#6b6b76] text-xs mt-0.5">You&apos;ve been moved to the Free plan.</p>
          </div>
          <Link href="/payment" className="drib-btn-primary inline-flex items-center gap-1.5 text-xs px-4 py-2 shrink-0">
            <Crown size={13} /> Renew
          </Link>
        </div>
      )}

      {/* ── 4-stat grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={BookOpen}
          label="Lesson Plans"
          value={planCount}
          accent="#ea4c89"
          accentBg="#fce4ef"
        />
        <StatCard
          icon={Users}
          label="Students Managed"
          value={studentCount || "—"}
          accent="#007531"
          accentBg="#e6f4ec"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Subjects Covered"
          value={assessmentCount}
          accent="#3b82f6"
          accentBg="#eff6ff"
        />
        <StatCard
          icon={BarChart2}
          label="Completion Rate"
          value={planCount > 0 ? `${completionRate}%` : "—"}
          accent="#8b5cf6"
          accentBg="#f5f3ff"
          isText
        />
      </div>

      {/* ── Premium status card ── */}
      {isPremium && subInfo.endDate && (
        <div className="drib-card p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-[#fce4ef] rounded-xl flex items-center justify-center">
              <Crown size={16} className="text-[#ea4c89]" />
            </div>
            <div>
              <p className="text-[#0d0d0d] font-semibold text-sm">Premium Subscription Active</p>
              <p className="text-[#9e9ea7] text-xs">Full access to all features</p>
            </div>
            <div className="ml-auto">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold",
                subInfo.status === "EXPIRING_SOON"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-[#e6f4ec] text-[#007531]"
              )}>
                {subInfo.status === "EXPIRING_SOON" ? "Expiring Soon" : "Active"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetaField icon={Calendar} label="Start Date" value={subInfo.startDate ? new Date(subInfo.startDate).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
            <MetaField icon={Calendar} label="Expiry Date" value={new Date(subInfo.endDate).toLocaleDateString("en-ZM", { day: "numeric", month: "short", year: "numeric" })} />
            <div>
              <p className="text-[#9e9ea7] text-xs mb-1 flex items-center gap-1"><Clock size={10} /> Days Remaining</p>
              <p className={cn("font-bold text-xl", subInfo.daysRemaining !== null && subInfo.daysRemaining <= 7 ? "text-yellow-600" : "text-[#0d0d0d]")}>
                {subInfo.daysRemaining ?? "∞"}
              </p>
            </div>
            <MetaField icon={CreditCard} label="Payment" value={subInfo.paymentMethod ? (METHOD_LABELS[subInfo.paymentMethod] ?? subInfo.paymentMethod) : "—"} />
          </div>
          {subInfo.receiptNumber && (
            <div className="mt-3 pt-3 border-t border-[#f0f0f0]">
              <p className="text-[#9e9ea7] text-xs">
                Receipt: <span className="text-[#0d0d0d] font-mono">{subInfo.receiptNumber}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Free plan usage bar ── */}
      {!isPremium && (
        <div className="drib-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[#0d0d0d] font-semibold text-sm">Free Plan Usage</p>
              <p className="text-[#9e9ea7] text-xs mt-0.5">
                {monthlyCount} of {FREE_LIMIT} lesson plans this month
              </p>
            </div>
            <Link href="/payment" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#fce4ef] text-[#ea4c89] hover:bg-[#f5b8d4]/30 transition-all">
              <Crown size={10} /> Upgrade
            </Link>
          </div>
          <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                usagePercent >= 100 ? "bg-red-500" : usagePercent >= 80 ? "bg-yellow-400" : "bg-[#ea4c89]"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {monthlyCount >= FREE_LIMIT && (
            <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
              <AlertTriangle size={11} /> Monthly limit reached. Upgrade to continue.
            </p>
          )}
        </div>
      )}

      {/* ── Main two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Plans — 2 cols */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#0d0d0d] font-semibold text-base">Recent Lesson Plans</h2>
            <Link
              href="/lesson-plans"
              className="text-[#ea4c89] text-xs hover:text-[#d6437a] transition-colors flex items-center gap-1 font-medium"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <RecentPlansSection plans={recentPlans} isPremium={isPremium} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* AI Assistant panel */}
          <div className="rounded-2xl p-5 flex flex-col gap-3 bg-gradient-to-br from-[#1a0a12] to-[#2d1022] border border-[#3d1a2e]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#ea4c89] rounded-lg flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="text-white font-semibold text-sm">AI Assistant</span>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ea4c89]/20 text-[#f082ac] border border-[#ea4c89]/30">
                BETA
              </span>
            </div>
            <p className="text-white/55 text-xs leading-relaxed">
              Hi {firstName}! Ask anything — lesson ideas, CBC guidance, teaching strategies.
            </p>
            <Link
              href="/assistant"
              className="flex items-center justify-between gap-2 text-sm px-4 py-2.5 mt-1 rounded-xl bg-[#ea4c89] text-white font-semibold hover:bg-[#d6437a] transition-colors"
            >
              <span>Open Assistant</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="drib-card p-5">
            <p className="text-[#0d0d0d] font-semibold text-sm mb-3">Quick Actions</p>
            <div className="space-y-1">
              <Link
                href="/lesson-planner"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6b6b76] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-all group"
              >
                <div className="w-7 h-7 bg-[#fce4ef] rounded-lg flex items-center justify-center shrink-0">
                  <Plus size={14} className="text-[#ea4c89]" />
                </div>
                New Lesson Plan
              </Link>
              <Link
                href="/community"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6b6b76] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-all group"
              >
                <div className="w-7 h-7 bg-[#e6f4ec] rounded-lg flex items-center justify-center shrink-0">
                  <Users size={14} className="text-[#007531]" />
                </div>
                Teacher Community
              </Link>
              <Link
                href="/analytics"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#6b6b76] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-all group"
              >
                <div className="w-7 h-7 bg-[#eff6ff] rounded-lg flex items-center justify-center shrink-0">
                  <BarChart2 size={14} className="text-[#3b82f6]" />
                </div>
                View Analytics
              </Link>
              {!isPremium && (
                <Link
                  href="/payment"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#ea4c89] hover:bg-[#fce4ef] transition-all group"
                >
                  <div className="w-7 h-7 bg-[#fce4ef] rounded-lg flex items-center justify-center shrink-0">
                    <Crown size={14} className="text-[#ea4c89]" />
                  </div>
                  Upgrade to Premium
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, accent, accentBg, isText,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
  accentBg: string;
  isText?: boolean;
}) {
  return (
    <div className="drib-card p-4 hover:shadow-card-hover transition-shadow">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: accentBg }}
      >
        <Icon size={18} style={{ color: accent }} />
      </div>
      <p className={cn("font-bold text-2xl leading-tight mb-0.5", isText ? "" : "text-[#0d0d0d]")}
         style={isText ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="text-[#9e9ea7] text-xs">{label}</p>
    </div>
  );
}

function MetaField({
  icon: Icon, label, value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[#9e9ea7] text-xs mb-1 flex items-center gap-1">
        <Icon size={10} /> {label}
      </p>
      <p className="text-[#0d0d0d] font-medium text-sm">{value}</p>
    </div>
  );
}
