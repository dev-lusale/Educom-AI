"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }

      setSent(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-6">
            <div className="w-10 h-10 bg-[#00A344] rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-[--text-primary] tracking-tight">Educom</span>
          </Link>
          <h1 className="text-2xl font-bold text-[--text-primary] mb-1.5">Forgot your password?</h1>
          <p className="text-[--text-secondary] text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-8 shadow-card">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-[#e6f4ec] rounded-full flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-[#00A344]" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary] mb-2">Check your inbox</h2>
                <p className="text-[--text-secondary] text-sm leading-relaxed">
                  If an account with <strong>{email}</strong> exists, we've sent a password reset link.
                  The link will expire in 1 hour.
                </p>
              </div>
              <p className="text-xs text-[--text-muted] pt-2">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-[#00A344] hover:text-[#007531] font-medium transition-colors"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="teacher@school.edu.zm"
                    className="drib-input pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Sending link…</>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[--text-secondary] mt-5">
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-1.5 text-[#00A344] hover:text-[#007531] transition-colors font-semibold"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
