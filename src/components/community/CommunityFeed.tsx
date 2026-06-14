"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Bookmark, BookOpen, User, Filter, Search, Crown } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const GRADES = [
  "All Grades",
  "ECE Level 1", "ECE Level 2", "ECE Level 3", "ECE Level 4",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7",
  "Form 1", "Form 2",
  "Form 3", "Form 4",
  "Form 5", "Form 6",
];
const SUBJECTS = [
  "All Subjects",
  "Mathematics", "English Language", "Science", "Social Studies",
  "Additional Mathematics", "Literature in English", "Civic Education",
  "Religious Education", "Physical Education", "Chemistry", "Physics",
  "Creative and Technology Studies", "Home Economics", "Agriculture",
  "Commerce", "Accounting", "Design and Technology", "Home Management",
  "Business Studies", "History", "Geography", "Biology", "Fashion and Fabrics",
  "Chinese", "Food and Nutrition", "Technical Drawing", "Music", "Art and Design",
  "Drama and Performing Arts", "Computer Studies", "French",
  "Bemba", "Nyanja", "Tonga", "Lozi", "Lunda", "Kaonde", "Luvale", "Silozi",
];

interface SharedPlan {
  id: string;
  title: string;
  description: string | null;
  grade: string;
  subject: string;
  topic: string;
  createdAt: string;
  user: { name: string | null; image: string | null; school: string | null };
  _count: { likes: number; saves: number };
  likes?: { id: string }[];
  saves?: { id: string }[];
}

interface Props {
  userId?: string;
  isPremium?: boolean;
}

export default function CommunityFeed({ userId, isPremium }: Props) {
  const [plans, setPlans] = useState<SharedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState("All Grades");
  const [subject, setSubject] = useState("All Subjects");
  const [search, setSearch] = useState("");

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (grade !== "All Grades") params.set("grade", grade);
    if (subject !== "All Subjects") params.set("subject", subject);
    const res = await fetch(`/api/community/plans?${params}`);
    if (res.ok) { const data = await res.json(); setPlans(data.plans); }
    setLoading(false);
  }, [grade, subject]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  async function handleLike(planId: string) {
    if (!userId) { toast.error("Sign in to like plans."); return; }
    const res = await fetch("/api/community/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sharedPlanId: planId }),
    });
    if (res.ok) {
      const { liked } = await res.json();
      setPlans((prev) => prev.map((p) =>
        p.id === planId
          ? { ...p, _count: { ...p._count, likes: p._count.likes + (liked ? 1 : -1) }, likes: liked ? [{ id: "temp" }] : [] }
          : p
      ));
    }
  }

  const filtered = plans.filter((p) =>
    search === "" ||
    p.topic.toLowerCase().includes(search.toLowerCase()) ||
    p.subject.toLowerCase().includes(search.toLowerCase()) ||
    p.grade.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Filters */}
      <div className="drib-card p-4 mb-7 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9ea7]" />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic, subject, grade…"
            className="drib-input pl-10"
          />
        </div>
        <div className="flex gap-2.5">
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9ea7]" />
            <select value={grade} onChange={(e) => setGrade(e.target.value)}
              className="drib-input pl-8 cursor-pointer pr-3">
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}
            className="drib-input cursor-pointer">
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Premium CTA for free users */}
      {userId && !isPremium && (
        <div className="drib-card p-5 mb-7 flex items-center gap-4 border-l-4 border-l-[#ea4c89]">
          <div className="w-9 h-9 bg-[#fce4ef] rounded-xl flex items-center justify-center shrink-0">
            <Crown size={16} className="text-[#ea4c89]" />
          </div>
          <div className="flex-1">
            <p className="text-[#0d0d0d] font-semibold text-sm">Share your lesson plans</p>
            <p className="text-[#6b6b76] text-xs mt-0.5">Upgrade to Premium to share plans and help colleagues cover absent teachers.</p>
          </div>
          <Link href="/payment" className="drib-btn-primary text-xs px-4 py-2 shrink-0">Upgrade</Link>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="drib-card p-5 animate-pulse">
              <div className="h-4 bg-[#f0f0f0] rounded mb-3 w-3/4" />
              <div className="h-3 bg-[#f8f8f8] rounded mb-2 w-1/2" />
              <div className="h-3 bg-[#f8f8f8] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={44} className="text-[#e8e8e8] mx-auto mb-4" />
          <p className="text-[#9e9ea7] text-sm">No plans found. Be the first to share!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isLiked={!!(plan.likes && plan.likes.length > 0)}
              onLike={() => handleLike(plan.id)}
              isLoggedIn={!!userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, isLiked, onLike, isLoggedIn }: {
  plan: SharedPlan; isLiked: boolean; onLike: () => void; isLoggedIn: boolean;
}) {
  return (
    <div className="drib-card-hover p-5 flex flex-col group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[#0d0d0d] font-semibold text-sm leading-snug truncate group-hover:text-[#ea4c89] transition-colors">
            {plan.topic}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 bg-[#fce4ef] text-[#ea4c89] rounded-full font-medium">{plan.grade}</span>
            <span className="text-xs px-2 py-0.5 bg-[#f0f0f0] text-[#6b6b76] rounded-full">{plan.subject}</span>
          </div>
        </div>
        <BookOpen size={16} className="text-[#e8e8e8] shrink-0 mt-0.5" />
      </div>

      {/* Description */}
      {plan.description && (
        <p className="text-[#9e9ea7] text-xs leading-relaxed mb-3 line-clamp-2">{plan.description}</p>
      )}

      {/* Author */}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-[#f0f0f0]">
        {plan.user.image ? (
          <img src={plan.user.image} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[#e6f4ec] flex items-center justify-center">
            <User size={11} className="text-[#007531]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[#0d0d0d] text-xs font-semibold truncate">{plan.user.name ?? "Teacher"}</p>
          {plan.user.school && <p className="text-[#9e9ea7] text-[10px] truncate">{plan.user.school}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLike}
            className={cn("flex items-center gap-1 text-xs transition-colors", isLiked ? "text-red-500" : "text-[#9e9ea7] hover:text-red-500")}
          >
            <Heart size={13} className={isLiked ? "fill-red-500" : ""} />
            {plan._count.likes}
          </button>
          <button
            onClick={() => !isLoggedIn && toast.error("Sign in to save plans.")}
            className="flex items-center gap-1 text-xs text-[#9e9ea7] hover:text-[#ea4c89] transition-colors"
          >
            <Bookmark size={13} />
            {plan._count.saves}
          </button>
        </div>
      </div>
    </div>
  );
}
