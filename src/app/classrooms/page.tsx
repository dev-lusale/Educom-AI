import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Users2, BookOpen, Plus, Crown, Sparkles,
  GraduationCap, ArrowRight, Users,
  BarChart2, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getUserSubscriptionInfo } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const GRADE_GROUPS = [
  {
    label: "Early Childhood Education",
    accent: "#ec4899",
    accentBg: "#fdf2f8",
    accentBorder: "#fbcfe8",
    grades: ["ECE Level 1", "ECE Level 2", "ECE Level 3", "ECE Level 4"],
  },
  {
    label: "Lower Primary",
    accent: "#3b82f6",
    accentBg: "#eff6ff",
    accentBorder: "#bfdbfe",
    grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4"],
  },
  {
    label: "Upper Primary",
    accent: "#007531",
    accentBg: "#e6f4ec",
    accentBorder: "#bbf7d0",
    grades: ["Grade 5", "Grade 6", "Grade 7"],
  },
  {
    label: "Junior Secondary",
    accent: "#ea4c89",
    accentBg: "#fce4ef",
    accentBorder: "#f5b8d4",
    grades: ["Form 1", "Form 2"],
  },
  {
    label: "Senior Secondary",
    accent: "#8b5cf6",
    accentBg: "#f5f3ff",
    accentBorder: "#ddd6fe",
    grades: ["Form 3", "Form 4"],
  },
  {
    label: "Sixth Form",
    accent: "#f59e0b",
    accentBg: "#fef3c7",
    accentBorder: "#fde68a",
    grades: ["Form 5", "Form 6"],
  },
];

export default async function ClassroomsPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const userId = session.user.id;

  const [subInfo, plansByGrade, totalPlans, sharedPlans] = await Promise.all([
    getUserSubscriptionInfo(userId),
    prisma.lessonPlan.groupBy({
      by: ["grade"],
      where: { userId },
      _count: { grade: true },
      orderBy: { _count: { grade: "desc" } },
    }),
    prisma.lessonPlan.count({ where: { userId } }),
    prisma.sharedPlan.count({ where: { userId } }),
  ]);

  const isPremium = subInfo.plan === "PREMIUM";

  // Migrate old Grade 8–12 labels to the current CBC Form system
  const GRADE_MIGRATION: Record<string, string> = {
    "Grade 8":  "Form 1",
    "Grade 9":  "Form 2",
    "Grade 10": "Form 3",
    "Grade 11": "Form 4",
    "Grade 12": "Form 5",
  };

  // Apply migration: rename legacy labels and merge counts if duplicates exist
  const mergedGradeMap = new Map<string, number>();
  for (const g of plansByGrade) {
    const displayGrade = GRADE_MIGRATION[g.grade] ?? g.grade;
    mergedGradeMap.set(displayGrade, (mergedGradeMap.get(displayGrade) ?? 0) + g._count.grade);
  }

  // Build gradeMap and activeGrades from the migrated data
  const gradeMap = new Map(plansByGrade.map((g) => {
    const display = GRADE_MIGRATION[g.grade] ?? g.grade;
    return [display, (mergedGradeMap.get(display) ?? 0)];
  }));
  const activeGrades = new Set(
    plansByGrade.map((g) => GRADE_MIGRATION[g.grade] ?? g.grade)
  );

  // Canonical CBC grade order
  const GRADE_ORDER = [
    "ECE Level 1", "ECE Level 2", "ECE Level 3", "ECE Level 4",
    "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7",
    "Form 1", "Form 2",
    "Form 3", "Form 4",
    "Form 5", "Form 6",
  ];

  // Sort merged grades by educational order for the bar chart
  const sortedPlansByGrade = Array.from(mergedGradeMap.entries())
    .map(([grade, count]) => ({ grade, _count: { grade: count } }))
    .sort((a, b) => {
      const ai = GRADE_ORDER.indexOf(a.grade);
      const bi = GRADE_ORDER.indexOf(b.grade);
      if (ai === -1 && bi === -1) return a.grade.localeCompare(b.grade);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const classroomGroups = GRADE_GROUPS.map((group) => ({
    ...group,
    classrooms: group.grades.map((grade) => ({
      grade,
      planCount: gradeMap.get(grade) ?? 0,
      isActive: activeGrades.has(grade),
    })),
  })).filter((g) => g.classrooms.some((c) => c.isActive));

  const totalActiveGrades = activeGrades.size;
  const firstName = session.user.name?.split(" ")[0] ?? "Teacher";

  return (
    <main className="px-6 py-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d0d0d] mb-1 tracking-tight">Classrooms</h1>
          <p className="text-[#6b6b76] text-sm">Your lesson plans organised by grade level.</p>
        </div>
        <Link href="/lesson-planner" className="drib-btn-primary inline-flex items-center gap-2 text-sm">
          <Plus size={15} /> New Lesson Plan
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users2, label: "Active Classrooms", value: totalActiveGrades, accent: "#ea4c89", bg: "#fce4ef" },
          { icon: BookOpen, label: "Total Plans", value: totalPlans, accent: "#007531", bg: "#e6f4ec" },
          { icon: Users, label: "Plans Shared", value: sharedPlans, accent: "#3b82f6", bg: "#eff6ff" },
          { icon: BarChart2, label: "Grades Covered", value: totalActiveGrades, accent: "#8b5cf6", bg: "#f5f3ff" },
        ].map(({ icon: Icon, label, value, accent, bg }) => (
          <div key={label} className="drib-card p-4 hover:shadow-card-hover transition-shadow">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon size={18} style={{ color: accent }} />
            </div>
            <p className="font-bold text-2xl text-[#0d0d0d] leading-tight">{value}</p>
            <p className="text-[#9e9ea7] text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Classroom groups */}
      {classroomGroups.length > 0 ? (
        <div className="space-y-8">
          {classroomGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.accent }} />
                <h2 className="font-semibold text-sm" style={{ color: group.accent }}>{group.label}</h2>
                <div className="flex-1 h-px bg-[#f0f0f0]" />
                <span className="text-[#9e9ea7] text-xs">
                  {group.classrooms.filter((c) => c.isActive).length} active
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.classrooms.filter((c) => c.isActive).map((classroom) => (
                  <Link
                    key={classroom.grade}
                    href={`/lesson-planner?grade=${encodeURIComponent(classroom.grade)}`}
                    className="bg-white rounded-2xl p-5 flex flex-col gap-3 border transition-all duration-200 shadow-card hover:shadow-card-hover hover:scale-[1.01] group"
                    style={{ borderColor: group.accentBorder }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: group.accentBg }}>
                      <GraduationCap size={18} style={{ color: group.accent }} />
                    </div>
                    <div>
                      <p className="text-[#0d0d0d] font-semibold text-sm">{classroom.grade}</p>
                      <p className="text-[#9e9ea7] text-xs mt-0.5">
                        {classroom.planCount} plan{classroom.planCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(classroom.planCount * 10, 100)}%`,
                          backgroundColor: group.accent,
                          opacity: 0.5,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: group.accent }}>
                      Add plan
                      <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="drib-card p-14 text-center">
          <div className="w-14 h-14 bg-[#fce4ef] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <GraduationCap size={24} className="text-[#ea4c89]" />
          </div>
          <h2 className="text-[#0d0d0d] font-semibold text-lg mb-2">No classrooms yet</h2>
          <p className="text-[#6b6b76] text-sm max-w-sm mx-auto mb-6">
            Hi {firstName}! Create your first lesson plan and it will automatically appear here, organised by grade level.
          </p>
          <Link href="/lesson-planner" className="drib-btn-primary inline-flex items-center gap-2 text-sm">
            <Sparkles size={14} /> Create First Lesson Plan
          </Link>
        </div>
      )}

      {/* All grades bar chart */}
      {totalPlans > 0 && (
        <div className="mt-8 drib-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[#0d0d0d] font-semibold">All Grade Levels</h2>
            <span className="text-[#9e9ea7] text-xs">{totalPlans} plans total</span>
          </div>
          <div className="space-y-3">
            {sortedPlansByGrade.map((g) => {
              const pct = Math.round((g._count.grade / totalPlans) * 100);
              return (
                <div key={g.grade} className="flex items-center gap-3">
                  <span className="text-[#6b6b76] text-sm w-24 shrink-0 truncate">{g.grade}</span>
                  <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#ea4c89] transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[#0d0d0d] text-sm font-semibold w-8 text-right shrink-0">
                    {g._count.grade}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 drib-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={15} className="text-[#007531]" />
          <h2 className="text-[#0d0d0d] font-semibold text-sm">How Classrooms Work</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: BookOpen, title: "Auto-organised", desc: "Plans are grouped by the grade you select when creating them.", color: "#ea4c89", bg: "#fce4ef" },
            { icon: Users, title: "Share with colleagues", desc: "Share plans from any classroom to the community for other teachers.", color: "#3b82f6", bg: "#eff6ff" },
            { icon: BarChart2, title: "Track progress", desc: "See which grades you cover most and identify planning gaps.", color: "#8b5cf6", bg: "#f5f3ff" },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: bg }}>
                <Icon size={14} style={{ color }} />
              </div>
              <div>
                <p className="text-[#0d0d0d] font-medium text-sm mb-0.5">{title}</p>
                <p className="text-[#9e9ea7] text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Premium upsell */}
      {!isPremium && (
        <div className="mt-6 drib-card p-6 flex items-center gap-5 bg-gradient-to-r from-[#fce4ef]/40 to-white border-[#f5b8d4]">
          <div className="w-11 h-11 bg-[#fce4ef] rounded-xl flex items-center justify-center shrink-0">
            <Crown size={20} className="text-[#ea4c89]" />
          </div>
          <div className="flex-1">
            <p className="text-[#0d0d0d] font-semibold mb-1">Unlimited Classrooms with Premium</p>
            <p className="text-[#6b6b76] text-sm">
              Free plan is limited to 5 plans per month. Upgrade for unlimited access across all grades.
            </p>
          </div>
          <Link href="/payment" className="drib-btn-primary inline-flex items-center gap-2 text-sm shrink-0">
            <Crown size={13} /> Upgrade
          </Link>
        </div>
      )}
    </main>
  );
}
