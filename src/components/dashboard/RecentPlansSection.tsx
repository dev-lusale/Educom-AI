"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Clock, Plus, MoreVertical,
  Pencil, Share2, Trash2, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Plan {
  id: string;
  topic: string;
  grade: string;
  subject: string;
  createdAt: string;
  isShared: boolean;
}

interface Props {
  plans: Plan[];
  isPremium: boolean;
}

export default function RecentPlansSection({ plans: initialPlans, isPremium }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Close menu when clicking outside
  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Keep open if click is inside a menu or its trigger button
      if (target.closest("[data-menu-container]")) return;
      closeMenu();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId, closeMenu]);

  async function handleDelete(id: string) {
    setOpenMenuId(null); // close menu first
    // Small delay so the menu closes before the confirm dialog opens
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
      console.error("[handleDelete]", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShare(plan: Plan) {
    if (!isPremium) {
      toast.error("Sharing requires a Premium subscription.");
      return;
    }
    if (plan.isShared) {
      toast("This plan is already shared to the community.");
      return;
    }
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
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isShared: true } : p))
      );
      toast.success("Plan shared to the community!");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to share.");
    } finally {
      setSharingId(null);
    }
  }

  if (plans.length === 0) {
    return (
      <div className="drib-card p-12 text-center">
        <div className="w-12 h-12 bg-[#fce4ef] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BookOpen size={22} className="text-[#ea4c89]" />
        </div>
        <p className="text-[#0d0d0d] font-semibold text-sm mb-1">No lesson plans yet</p>
        <p className="text-[#9e9ea7] text-xs mb-5">
          Create your first CBC-aligned lesson plan in seconds.
        </p>
        <Link
          href="/lesson-planner"
          className="drib-btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Plus size={15} /> Create your first plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {plans.map((plan) => {
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
            <div className="w-10 h-10 bg-[#fce4ef] rounded-xl flex items-center justify-center shrink-0">
              <BookOpen size={17} className="text-[#ea4c89]" />
            </div>

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-[#0d0d0d] font-semibold text-sm truncate">{plan.topic}</p>
              <p className="text-[#9e9ea7] text-xs mt-0.5">
                {plan.grade} · {plan.subject}
              </p>
            </div>

            {/* Date */}
            <div className="hidden sm:flex items-center gap-1.5 text-[#9e9ea7] text-xs shrink-0">
              <Clock size={11} />
              {new Date(plan.createdAt).toLocaleDateString("en-ZM", {
                day: "numeric",
                month: "short",
              })}
            </div>

            {/* Status badge */}
            <span
              className={
                plan.isShared
                  ? "shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e6f4ec] text-[#007531]"
                  : "shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f8f8f8] text-[#6b6b76]"
              }
            >
              {plan.isShared ? "Published" : "Draft"}
            </span>

            {/* Three-dot menu — each item has its own data-menu-container */}
            <div className="relative shrink-0" data-menu-container>
              <button
                onClick={() => setOpenMenuId(isMenuOpen ? null : plan.id)}
                disabled={isDeleting || isSharing}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9e9ea7] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-all disabled:opacity-40"
                aria-label="Plan actions"
              >
                {isDeleting || isSharing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <MoreVertical size={14} />
                )}
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white border border-[#e8e8e8] rounded-xl shadow-card-hover overflow-hidden">
                  <Link
                    href={`/lesson-planner?edit=${plan.id}`}
                    onClick={() => setOpenMenuId(null)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#6b6b76] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-colors"
                  >
                    <Pencil size={13} className="text-[#ea4c89]" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleShare(plan)}
                    disabled={plan.isShared}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#6b6b76] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Share2 size={13} className="text-[#007531]" />
                    {plan.isShared ? "Shared" : "Share"}
                  </button>
                  <div className="h-px bg-[#f0f0f0] mx-3" />
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
  );
}
