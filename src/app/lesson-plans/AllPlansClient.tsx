"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Clock, Search, Filter, Plus,
  MoreVertical, Pencil, Share2, Trash2, Loader2,
  X, SortAsc, SortDesc,
} from "lucide-react";
import toast from "react-hot-toast";

interface Plan {
  id: string;
  topic: string;
  grade: string;
  subject: string;
  duration: string;
  date: string;
  createdAt: string;
  isShared: boolean;
}

interface Props {
  plans: Plan[];
  isPremium: boolean;
}

type SortKey = "createdAt" | "topic" | "subject" | "grade";
type SortDir = "asc" | "desc";

export default function AllPlansClient({ plans: initialPlans, isPremium }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterGrade, setFilterGrade] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Unique subjects and grades for filter dropdowns
  const subjects = useMemo(
    () => ["All", ...Array.from(new Set(plans.map((p) => p.subject))).sort()],
    [plans]
  );
  const grades = useMemo(
    () => ["All", ...Array.from(new Set(plans.map((p) => p.grade))).sort()],
    [plans]
  );

  // Close dropdown when clicking outside
  const closeMenu = useCallback(() => setOpenMenuId(null), []);
  useEffect(() => {
    if (!openMenuId) return;
    function onMouseDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-plan-menu]")) closeMenu();
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openMenuId, closeMenu]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...plans];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.topic.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          p.grade.toLowerCase().includes(q)
      );
    }
    if (filterSubject !== "All") list = list.filter((p) => p.subject === filterSubject);
    if (filterGrade !== "All") list = list.filter((p) => p.grade === filterGrade);

    list.sort((a, b) => {
      let va = a[sortKey] as string;
      let vb = b[sortKey] as string;
      if (sortKey === "createdAt") {
        va = new Date(va).getTime().toString();
        vb = new Date(vb).getTime().toString();
      }
      const cmp = va.localeCompare(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [plans, search, filterSubject, filterGrade, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(id: string) {
    setOpenMenuId(null);
    await new Promise((r) => setTimeout(r, 50));
    if (!confirm("Delete this lesson plan? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/lesson-plans/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setPlans((prev) => prev.filter((p) => p.id !== id));
      toast.success("Lesson plan deleted.");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShare(plan: Plan) {
    if (!isPremium) { toast.error("Sharing requires a Premium subscription."); return; }
    if (plan.isShared) { toast("This plan is already shared."); return; }

    setSharingId(plan.id);
    setOpenMenuId(null);
    try {
      const res = await fetch("/api/community/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonPlanId: plan.id,
          title: `${plan.grade} ${plan.subject} – ${plan.topic}`,
          grade: plan.grade,
          subject: plan.subject,
          topic: plan.topic,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to share");
      }
      setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, isShared: true } : p));
      toast.success("Plan shared to the community!");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to share.");
    } finally {
      setSharingId(null);
    }
  }

  // -- Empty state --------------------------------------------------
  if (plans.length === 0) {
    return (
      <div className="drib-card p-16 text-center">
        <div className="w-14 h-14 bg-[#e6f4ec] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <BookOpen size={26} className="text-[#00A344]" />
        </div>
        <p className="text-[--text-primary] font-semibold text-base mb-2">No lesson plans yet</p>
        <p className="text-[--text-muted] text-sm mb-6">
          Create your first CBC-aligned lesson plan in seconds.
        </p>
        <Link href="/lesson-planner" className="drib-btn-primary inline-flex items-center gap-2">
          <Plus size={15} /> Create your first plan
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* -- Toolbar -- */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic, subject or grade…"
            className="drib-input pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary] transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Subject filter */}
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="drib-input pl-8 pr-4 cursor-pointer min-w-[140px]"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All Subjects" : s}</option>
            ))}
          </select>
        </div>

        {/* Grade filter */}
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-muted]" />
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="drib-input pl-8 pr-4 cursor-pointer min-w-[130px]"
          >
            {grades.map((g) => (
              <option key={g} value={g}>{g === "All" ? "All Grades" : g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* -- Column headers (sort controls) -- */}
      <div className="hidden sm:grid grid-cols-[1fr_120px_120px_100px_80px_44px] gap-3 px-4 mb-2">
        {(
          [
            { label: "Topic", key: "topic" as SortKey },
            { label: "Subject", key: "subject" as SortKey },
            { label: "Grade", key: "grade" as SortKey },
            { label: "Date", key: "createdAt" as SortKey },
          ] as { label: string; key: SortKey }[]
        ).map(({ label, key }) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className="flex items-center gap-1 text-xs font-semibold text-[--text-muted] hover:text-[--text-primary] transition-colors text-left"
          >
            {label}
            {sortKey === key ? (
              sortDir === "asc" ? (
                <SortAsc size={11} className="text-[#00A344]" />
              ) : (
                <SortDesc size={11} className="text-[#00A344]" />
              )
            ) : null}
          </button>
        ))}
        <div /> {/* Status */}
        <div /> {/* Actions */}
      </div>

      {/* -- Result count -- */}
      {(search || filterSubject !== "All" || filterGrade !== "All") && (
        <p className="text-xs text-[--text-muted] mb-3 px-1">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          {" "}
          <button
            onClick={() => { setSearch(""); setFilterSubject("All"); setFilterGrade("All"); }}
            className="text-[#00A344] hover:text-[#007531] font-medium"
          >
            Clear filters
          </button>
        </p>
      )}

      {/* -- Plan list -- */}
      {filtered.length === 0 ? (
        <div className="drib-card p-10 text-center">
          <p className="text-[--text-primary] font-semibold text-sm mb-1">No plans match your filters</p>
          <p className="text-[--text-muted] text-xs">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((plan) => {
            const isMenuOpen = openMenuId === plan.id;
            const isDeleting = deletingId === plan.id;
            const isSharing = sharingId === plan.id;

            return (
              <div
                key={plan.id}
                className={`drib-card-hover p-4 flex items-center gap-4 relative ${
                  isMenuOpen ? "z-20" : "z-10"
                }`}
              >
                {/* Icon */}
                <div className="w-10 h-10 bg-[#e6f4ec] rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen size={17} className="text-[#00A344]" />
                </div>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-[--text-primary] font-semibold text-sm truncate">{plan.topic}</p>
                  <p className="text-[--text-muted] text-xs mt-0.5">
                    {plan.grade} · {plan.subject}
                    {plan.duration && (
                      <span className="ml-2 text-[#c4c4c8]">· {plan.duration} min</span>
                    )}
                  </p>
                </div>

                {/* Date */}
                <div className="hidden sm:flex items-center gap-1.5 text-[--text-muted] text-xs shrink-0">
                  <Clock size={11} />
                  {new Date(plan.createdAt).toLocaleDateString("en-ZM", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>

                {/* Status badge */}
                <span
                  className={
                    plan.isShared
                      ? "shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e6f4ec] text-[#007531]"
                      : "shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-[--bg-canvas] text-[--text-secondary]"
                  }
                >
                  {plan.isShared ? "Published" : "Draft"}
                </span>

                {/* Three-dot menu */}
                <div className="relative shrink-0" data-plan-menu>
                  <button
                    onClick={() => setOpenMenuId(isMenuOpen ? null : plan.id)}
                    disabled={isDeleting || isSharing}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-canvas] transition-all disabled:opacity-40"
                    aria-label="Plan actions"
                  >
                    {isDeleting || isSharing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MoreVertical size={14} />
                    )}
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-[--bg-surface] border border-[--border] rounded-xl shadow-card-hover overflow-hidden">
                      <Link
                        href={`/lesson-planner?edit=${plan.id}`}
                        onClick={() => setOpenMenuId(null)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-canvas] transition-colors"
                      >
                        <Pencil size={13} className="text-[#00A344]" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleShare(plan)}
                        disabled={plan.isShared}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-canvas] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Share2 size={13} className="text-[#007531]" />
                        {plan.isShared ? "Shared" : "Share"}
                      </button>
                      <div className="h-px bg-[--bg-elevated] mx-3" />
                      <button
                        onClick={() => handleDelete(plan.id)}
                        disabled={isDeleting}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
