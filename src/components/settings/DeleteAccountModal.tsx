"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { X, Loader2, Trash2, AlertTriangle } from "lucide-react";

const REQUIRED_PHRASE = "DELETE MY ACCOUNT";

interface Props {
  userEmail: string;
  onClose: () => void;
}

export default function DeleteAccountModal({ userEmail, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [typed, setTyped]     = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [step, setStep]       = useState<"warn" | "confirm">("warn");

  const isMatch = typed === REQUIRED_PHRASE;

  async function handleDelete() {
    if (!isMatch) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/account", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: REQUIRED_PHRASE }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to delete account. Please try again.");
          return;
        }

        // Sign out and redirect to home — account is gone
        await signOut({ redirect: false });
        router.push("/?deleted=true");
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}
    >
      <div className="bg-[--bg-surface] rounded-2xl shadow-xl w-full max-w-md p-6 relative">

        {/* Close */}
        {!isPending && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[--text-muted] hover:text-[--text-primary] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        {/* Icon */}
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-red-600" />
        </div>

        {step === "warn" && (
          <>
            <h3 className="text-[--text-primary] font-bold text-lg mb-1">Delete your account?</h3>
            <p className="text-[--text-secondary] text-sm mb-5 leading-relaxed">
              This will <strong className="text-[--text-primary]">permanently delete</strong> all of your data, including:
            </p>

            <ul className="space-y-2 mb-6">
              {[
                "All lesson plans and schemes of work",
                "All assessments, quizzes and marking schemes",
                "All uploaded resources",
                "Chat history with EduCom AI",
                "Subscription and payment records",
                "Your profile and account credentials",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[--text-secondary]">
                  <span className="text-red-400 shrink-0 mt-0.5">✕</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-6">
              <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 text-xs leading-relaxed">
                <strong>This action cannot be undone.</strong> Once deleted, your account and all data are gone forever.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 drib-btn-outline text-sm py-2.5">
                Keep my account
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === "confirm" && (
          <>
            <h3 className="text-[--text-primary] font-bold text-lg mb-1">Confirm deletion</h3>
            <p className="text-[--text-secondary] text-sm mb-1">
              You are about to permanently delete:
            </p>
            <p className="text-[--text-primary] font-semibold text-sm mb-5 break-all">{userEmail}</p>

            <label className="block text-[--text-secondary] text-xs mb-2">
              Type{" "}
              <span className="font-mono font-bold text-red-600 select-all">
                {REQUIRED_PHRASE}
              </span>{" "}
              to confirm:
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setError(null); }}
              placeholder={REQUIRED_PHRASE}
              disabled={isPending}
              autoComplete="off"
              className="w-full border border-[--border] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition mb-4 disabled:opacity-50"
            />

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("warn"); setTyped(""); setError(null); }}
                disabled={isPending}
                className="flex-1 drib-btn-outline text-sm py-2.5 disabled:opacity-50"
              >
                Go back
              </button>
              <button
                onClick={handleDelete}
                disabled={!isMatch || isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 size={14} /> Delete account</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
