"use client";

import { useState, useTransition } from "react";
import { X, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

const ZAMBIA_PROVINCES = [
  "Central",
  "Copperbelt",
  "Eastern",
  "Luapula",
  "Lusaka",
  "Muchinga",
  "Northern",
  "North-Western",
  "Southern",
  "Western",
];

interface ProfileEditModalProps {
  current: {
    name: string | null;
    school: string | null;
    province: string | null;
  };
  onClose: () => void;
}

export default function ProfileEditModal({ current, onClose }: ProfileEditModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: current.name ?? "",
    school: current.school ?? "",
    province: current.province ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Full name is required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            school: form.school,
            province: form.province,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to save. Please try again.");
          return;
        }

        setSuccess(true);
        // Refresh the server component so profile card shows new values
        setTimeout(() => {
          router.refresh();
          onClose();
        }, 800);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[--bg-surface] rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[--text-muted] hover:text-[--text-primary] transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3 className="text-[--text-primary] font-semibold text-base mb-1">Edit Profile</h3>
        <p className="text-[--text-muted] text-xs mb-5">
          Complete your profile so we can personalise your experience.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-[--text-muted] text-xs mb-1.5" htmlFor="name">
              Full Name <span className="text-[#00A344]">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Moono Rundy"
              className="w-full border border-[--border] rounded-xl px-3.5 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-[#00A344]/30 focus:border-[#00A344] transition"
              autoComplete="name"
            />
          </div>

          {/* School */}
          <div>
            <label className="block text-[--text-muted] text-xs mb-1.5" htmlFor="school">
              School
            </label>
            <input
              id="school"
              name="school"
              type="text"
              value={form.school}
              onChange={handleChange}
              placeholder="e.g. Munali Secondary School"
              className="w-full border border-[--border] rounded-xl px-3.5 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-[#00A344]/30 focus:border-[#00A344] transition"
              autoComplete="organization"
            />
          </div>

          {/* Province */}
          <div>
            <label className="block text-[--text-muted] text-xs mb-1.5" htmlFor="province">
              Province
            </label>
            <select
              id="province"
              name="province"
              value={form.province}
              onChange={handleChange}
              className="w-full border border-[--border] rounded-xl px-3.5 py-2.5 text-sm text-[--text-primary] focus:outline-none focus:ring-2 focus:ring-[#00A344]/30 focus:border-[#00A344] transition bg-[--bg-surface] appearance-none"
            >
              <option value="">Select province�</option>
              {ZAMBIA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 drib-btn-outline text-sm py-2.5"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || success}
              className="flex-1 drib-btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
            >
              {success ? (
                <>
                  <Check size={14} /> Saved
                </>
              ) : isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving�
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
