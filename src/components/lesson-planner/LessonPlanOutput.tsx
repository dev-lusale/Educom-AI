"use client";

import { useState } from "react";
import { Printer, Share2, Crown, CheckCircle2, Loader2, FileDown, BookOpen, X } from "lucide-react";
import type { LessonPlanData } from "@/types/lesson-plan";
import toast from "react-hot-toast";
import Link from "next/link";

interface Props {
  plan: LessonPlanData;
  savedPlanId: string | null;
  isPremium: boolean;
  isLoggedIn: boolean;
}

export default function LessonPlanOutput({ plan, savedPlanId, isPremium, isLoggedIn }: Props) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [description, setDescription] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleShare() {
    if (!savedPlanId) return;
    setSharing(true);
    const res = await fetch("/api/community/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonPlanId: savedPlanId, description }),
    });
    setSharing(false);
    if (res.ok) {
      setShared(true);
      setShowShareModal(false);
      toast.success("Plan shared with the community!");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to share.");
    }
  }

  /** Server-side PDF export via the FastAPI PDF service. Falls back to browser print. */
  async function handleSaveAsPdf() {
    setExportingPdf(true);
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lesson_plan", data: plan }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        const contentDisposition = res.headers.get("Content-Disposition") ?? "";
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        a.href     = url;
        a.download = filenameMatch?.[1] ?? `Lesson_Plan_${plan.grade}_${plan.subject}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded successfully.");
      } else {
        // Backend unavailable — fall back to browser print
        const prev = document.title;
        document.title = `Lesson Plan - ${plan.lessonTitle || plan.topic} - ${plan.grade}`;
        window.print();
        document.title = prev;
      }
    } catch {
      // Final fallback
      const prev = document.title;
      document.title = `Lesson Plan - ${plan.lessonTitle || plan.topic} - ${plan.grade}`;
      window.print();
      document.title = prev;
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="mt-8 animate-fade-in">

      {/* ── Action bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:hidden">
        <p className="text-sm">
          {isLoggedIn ? (
            <span className="flex items-center gap-1.5 text-[#007531] font-medium">
              <CheckCircle2 size={14} /> Saved to your library
            </span>
          ) : (
            <Link href="/auth/signin" className="text-[#00A344] hover:underline font-medium">
              Sign in to save this plan
            </Link>
          )}
        </p>

        <div className="flex gap-2 flex-wrap">
          {/* Share */}
          {isLoggedIn && savedPlanId && !shared && (
            isPremium ? (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#e6f4ec] text-[#007531] border border-[#007531]/20 hover:bg-[#bbf7d0]/40 transition-all font-medium"
              >
                <Share2 size={14} /> Share with Community
              </button>
            ) : (
              <Link
                href="/payment"
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#e6f4ec] text-[#00A344] border border-[#00A344]/20 hover:bg-[#bbf7d0]/40 transition-all font-medium"
              >
                <Crown size={14} /> Upgrade to Share
              </Link>
            )
          )}
          {shared && (
            <span className="flex items-center gap-1.5 text-sm text-[#007531] font-medium bg-[#e6f4ec] px-3 py-2 rounded-xl">
              <CheckCircle2 size={14} /> Shared with community
            </span>
          )}

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[--bg-surface] border border-[--border] text-[--text-secondary] hover:border-[--border-hover] hover:text-[--text-primary] transition-all"
          >
            <Printer size={14} /> Print
          </button>

          {/* Save as PDF */}
          <button
            onClick={handleSaveAsPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#eff6ff] text-[#3b82f6] border border-[#3b82f6]/20 hover:bg-blue-100/60 transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {exportingPdf ? "Generating PDF…" : "Save as PDF"}
          </button>
        </div>
      </div>

      {/* ── Share Modal ── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 print:hidden">
          <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[--text-primary] font-semibold text-base">Share with Community</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-canvas] transition-all"
              >
                <X size={15} />
              </button>
            </div>
            <p className="text-[--text-secondary] text-sm mb-4">
              Your plan for <strong className="text-[--text-primary]">{plan.lessonTitle || plan.topic}</strong>{" "}
              ({plan.grade} · {plan.subject}) will be visible to all teachers.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note for your colleagues (optional)…"
              rows={3}
              className="drib-input resize-none mb-4 text-sm"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowShareModal(false)} className="drib-btn-outline flex-1 py-2.5 text-sm">
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 drib-btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {sharing ? <Loader2 size={15} className="animate-spin" /> : <><Share2 size={14} /> Share</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LESSON PLAN DOCUMENT
          ── Screen: Dribbble white card design
          ── Print/PDF: pure white A4, pixel-perfect Zambian school format
          ══════════════════════════════════════════════════════════════════ */}
      <div id="lesson-plan-print" className="lp-doc">

        {/* ── Screen header — green accent bar ── */}
        <div className="bg-[#00A344] px-6 py-5 rounded-t-2xl print:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen size={14} className="text-white/70" />
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  CBC Lesson Plan · Educom
                </p>
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
                {plan.lessonTitle || plan.topic}
              </h2>
              {plan.topic && plan.lessonTitle && (
                <p className="text-white/70 text-sm mt-0.5">Topic: {plan.topic}</p>
              )}
              {plan.school && plan.school !== "—" && (
                <p className="text-white/70 text-sm mt-1">{plan.school}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-bold text-lg leading-tight">{plan.grade}</p>
              <p className="text-white/70 text-sm">{plan.subject}</p>
            </div>
          </div>
        </div>

        {/* ── Print header ── */}
        <div className="lp-print-header">
          {plan.school && plan.school !== "—"
            ? <p className="lp-school-name">{plan.school.toUpperCase()}</p>
            : <p className="lp-school-name">SCHOOL NAME</p>
          }
          {plan.department && plan.department !== "—" && (
            <p className="lp-dept-name">{plan.department.toUpperCase()}</p>
          )}
          <p className="lp-section-name">{plan.subject.toUpperCase()} SECTION</p>
        </div>

        {/* ── Document body ── */}
        <div className="lp-body">

          {/* ── SCREEN: info cards grid ── */}
          <div className="print:hidden grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: "Teacher",         value: plan.teacherName !== "—" ? plan.teacherName : "—" },
              { label: "School",          value: plan.school !== "—" ? plan.school : "—" },
              { label: "Department",      value: plan.department !== "—" ? plan.department : "—" },
              { label: "Grade / Class",   value: plan.grade },
              { label: "Subject",         value: plan.subject },
              { label: "Lesson Title",    value: plan.lessonTitle || plan.topic },
              { label: "Topic",           value: plan.topic },
              { label: "Duration",        value: plan.duration },
              { label: "No. of Learners", value: plan.enrollment },
              { label: "Date",            value: plan.date },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[--bg-canvas] border border-[--border] rounded-xl p-3">
                <p className="text-[--text-muted] text-xs mb-1 font-medium">{label}</p>
                <p className="text-[--text-primary] font-semibold text-sm leading-tight">{value}</p>
              </div>
            ))}
          </div>

          {/* ── PRINT: meta fields ── */}
          <div className="lp-meta">
            <div className="lp-field-row">
              <span className="lp-field-label">NAME</span>
              <span className="lp-field-sep">:</span>
              <span className="lp-field-value">{plan.teacherName !== "—" ? plan.teacherName : ""}</span>
            </div>
            <div className="lp-two-col">
              <div className="lp-field-row">
                <span className="lp-field-label">CLASS</span>
                <span className="lp-field-sep">:</span>
                <span className="lp-field-value">{plan.grade}</span>
              </div>
              <div className="lp-field-row">
                <span className="lp-field-label">DATE</span>
                <span className="lp-field-sep">:</span>
                <span className="lp-field-value">{plan.date}</span>
              </div>
            </div>
            <div className="lp-two-col">
              <div className="lp-field-row">
                <span className="lp-field-label">SUBJECT</span>
                <span className="lp-field-sep">:</span>
                <span className="lp-field-value">{plan.subject}</span>
              </div>
              <div className="lp-field-row">
                <span className="lp-field-label">Duration</span>
                <span className="lp-field-sep">:</span>
                <span className="lp-field-value">{plan.duration}</span>
              </div>
            </div>
            <div className="lp-two-col">
              <div className="lp-field-row">
                <span className="lp-field-label">TOPIC</span>
                <span className="lp-field-sep">:</span>
                <span className="lp-field-value">{plan.topic}</span>
              </div>
              <div className="lp-field-row">
                <span className="lp-field-label">No of Learners</span>
                <span className="lp-field-sep">:</span>
                <span className="lp-field-value">{plan.enrollment !== "—" ? plan.enrollment : ""}</span>
              </div>
            </div>
            <div className="lp-field-row">
              <span className="lp-field-label">LESSON</span>
              <span className="lp-field-sep">:</span>
              <span className="lp-field-value">{plan.lessonTitle || plan.lesson || plan.topic}</span>
            </div>
            <div className="lp-field-row">
              <span className="lp-field-label">REFERENCES</span>
              <span className="lp-field-sep">:</span>
              <span className="lp-field-value">{plan.references}</span>
            </div>
            <div className="lp-field-row lp-field-row--top">
              <span className="lp-field-label">OBJECTIVES</span>
              <span className="lp-field-sep">:</span>
              <span className="lp-field-value">{plan.objectives}</span>
            </div>
          </div>

          {/* ── SCREEN: Competencies ── */}
          <div className="print:hidden mb-6">
            <SectionHeading title="Competencies" accent="#8b5cf6" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CompCard
                title="Critical Thinking"
                items={plan.competencies.criticalThinking}
                accent="#00A344"
                bg="#e6f4ec"
              />
              <CompCard
                title="Communication"
                items={plan.competencies.communication}
                accent="#007531"
                bg="#e6f4ec"
              />
              <CompCard
                title="Cooperation"
                items={plan.competencies.cooperation}
                accent="#3b82f6"
                bg="#eff6ff"
              />
            </div>
          </div>

          {/* ── SCREEN: Teaching Aids ── */}
          <div className="print:hidden mb-6">
            <SectionHeading title="Teaching Aids" accent="#00A344" />
            <div className="flex flex-wrap gap-2">
              {plan.teachingAids.map((aid, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-[--bg-surface] border border-[--border] rounded-full text-[--text-secondary] text-xs font-medium shadow-card"
                >
                  {aid}
                </span>
              ))}
            </div>
          </div>

          {/* ── SCREEN: 3-Step Plan ── */}
          <div className="print:hidden mb-6">
            <SectionHeading title="The 3-Step Lesson Plan" accent="#00A344" />
            <div className="space-y-4">
              {plan.steps.map((step) => {
                const stepColors = [
                  { accent: "#00A344", bg: "#e6f4ec", border: "#86efac" },
                  { accent: "#007531", bg: "#dcfce7", border: "#bbf7d0" },
                  { accent: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
                ];
                const col = stepColors[(step.stepNumber - 1) % stepColors.length];
                return (
                  <div key={step.stepNumber} className="bg-[--bg-surface] border border-[--border] rounded-2xl overflow-hidden shadow-card">
                    {/* Step header */}
                    <div
                      className="flex items-center justify-between px-5 py-3 border-b border-[--border]"
                      style={{ backgroundColor: col.bg }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: col.accent }}
                        >
                          {step.stepNumber}
                        </span>
                        <span className="font-semibold text-sm" style={{ color: col.accent }}>
                          {step.title}
                        </span>
                      </div>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ color: col.accent, backgroundColor: "white", border: `1px solid ${col.border}` }}
                      >
                        {step.duration}
                      </span>
                    </div>

                    {/* Teacher / Learner split */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f0f0]">
                      <ActivityColumn title="Teacher Activities" items={step.teacherActivities} />
                      <ActivityColumn title="Learner Activities" items={step.learnerActivities} />
                    </div>

                    {/* Competencies footer */}
                    {step.competencies && step.competencies.length > 0 && (
                      <div
                        className="px-5 py-2.5 border-t border-[--border] text-xs"
                        style={{ backgroundColor: col.bg }}
                      >
                        <span className="font-semibold" style={{ color: col.accent }}>Competencies: </span>
                        <span className="text-[--text-secondary]">{step.competencies.join(" · ")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SCREEN: Homework ── */}
          <div className="print:hidden">
            <SectionHeading title="Homework & ECZ Alignment" accent="#00A344" />
            <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-5 shadow-card">
              <p className="text-[--text-primary] leading-relaxed whitespace-pre-line text-sm mb-4">
                {plan.homework.description}
              </p>
              <div className="pt-4 border-t border-[--border]">
                <p className="text-xs text-[--text-secondary]">
                  <span className="font-semibold text-[#00A344]">ECZ Alignment: </span>
                  {plan.homework.eczAlignment}
                </p>
              </div>
            </div>
          </div>

          {/* ── PRINT: 4-column table (untouched — perfect for A4) ── */}
          <div className="lp-table-wrap print:block">
            <table className="lp-table">
              <thead>
                <tr>
                  <th className="lp-th lp-th-stage">STAGE AND<br />TIME</th>
                  <th className="lp-th lp-th-teacher">TEACHER ACTIVITY</th>
                  <th className="lp-th lp-th-pupil">PUPIL ACTIVITY</th>
                  <th className="lp-th lp-th-aids">TEACHING TECHNIQUE / LEARNING AND TEACHING AIDS</th>
                </tr>
              </thead>
              <tbody>
                {plan.steps.map((step) => {
                  const stageLabel =
                    step.stepNumber === 1 ? "INTRODUCTION" :
                    step.stepNumber === 2 ? "DEVELOPMENT" :
                    "CONCLUSION";
                  const aids = step.teachingAids && step.teachingAids.length > 0
                    ? step.teachingAids
                    : plan.teachingAids.slice(0, 5);
                  return (
                    <tr key={step.stepNumber} className="lp-tr">
                      <td className="lp-td lp-td-stage">
                        <p className="lp-stage-label">{stageLabel}</p>
                        {step.competencies && step.competencies.length > 0 && (
                          <ul className="lp-stage-situations">
                            {step.competencies.slice(0, 2).map((c, i) => (
                              <li key={i}>• {c}</li>
                            ))}
                          </ul>
                        )}
                        <p className="lp-stage-time">{step.duration}</p>
                      </td>
                      <td className="lp-td">
                        <ul className="lp-bullet-list">
                          {step.teacherActivities.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </td>
                      <td className="lp-td">
                        <ul className="lp-bullet-list">
                          {step.learnerActivities.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </td>
                      <td className="lp-td">
                        <ul className="lp-bullet-list">
                          {aids.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </td>
                    </tr>
                  );
                })}
                {/* Homework row */}
                <tr className="lp-tr">
                  <td className="lp-td lp-td-stage">
                    <p className="lp-stage-label">HOMEWORK</p>
                  </td>
                  <td className="lp-td" colSpan={3}>
                    <p className="lp-hw-text">{plan.homework.description}</p>
                    <p className="lp-ecz-text">
                      <strong>ECZ Alignment:</strong> {plan.homework.eczAlignment}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Print footer ── */}
          <div className="lp-footer">
            Generated by Educom &nbsp;·&nbsp; educom.zm &nbsp;·&nbsp; CBC-aligned lesson planning for Zambian educators
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Screen helper components ─────────────────────────────── */

function SectionHeading({ title, accent }: { title: string; accent: string }) {
  return (
    <h2 className="text-[--text-primary] font-semibold text-base mb-3 flex items-center gap-2.5">
      <span className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
      {title}
    </h2>
  );
}

function CompCard({ title, items, accent, bg }: {
  title: string; items: string[]; accent: string; bg: string;
}) {
  return (
    <div className="bg-[--bg-surface] border border-[--border] rounded-xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <h3 className="font-semibold text-sm" style={{ color: accent }}>{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-[--text-secondary] text-xs flex gap-2 leading-relaxed">
            <span className="shrink-0 mt-0.5" style={{ color: accent }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-4">
      <h4 className="font-semibold text-[--text-muted] text-[10px] uppercase tracking-wider mb-3">{title}</h4>
      <ol className="space-y-2 list-decimal list-inside">
        {items.map((item, i) => (
          <li key={i} className="text-[--text-secondary] text-xs leading-relaxed">{item}</li>
        ))}
      </ol>
    </div>
  );
}
