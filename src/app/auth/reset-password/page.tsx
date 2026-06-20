"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordsMatch = confirm.length === 0 || password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!token) {
      toast.error("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }

      setDone(true);
      toast.success("Password updated successfully.");
      setTimeout(() => router.push("/auth/signin"), 2500);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-8 shadow-card text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-[#fef0f0] rounded-full flex items-center justify-center">
                <AlertCircle size={28} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-[--text-primary]">Invalid reset link</h2>
            <p className="text-[--text-secondary] text-sm">
              This password reset link is missing or malformed.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block drib-btn-primary px-6 py-2.5 text-sm"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-6">
            <div className="w-10 h-10 bg-[#ea4c89] rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-[--text-primary] tracking-tight">Educom</span>
          </Link>
          <h1 className="text-2xl font-bold text-[--text-primary] mb-1.5">Set a new password</h1>
          <p className="text-[--text-secondary] text-sm">Choose a strong password for your account.</p>
        </div>

        <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-8 shadow-card">
          {done ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-[#fce4ef] rounded-full flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-[#ea4c89]" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[--text-primary] mb-2">Password updated!</h2>
                <p className="text-[--text-secondary] text-sm">
                  Your password has been changed. Redirecting you to sign in…
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* New password */}
              <div>
                <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min. 8 characters"
                    className="drib-input pl-10 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary] transition-colors"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <CheckCircle2
                      size={12}
                      className={password.length >= 8 ? "text-[#007531]" : "text-[#e8e8e8]"}
                    />
                    <span className={`text-xs ${password.length >= 8 ? "text-[#007531]" : "text-[--text-muted]"}`}>
                      At least 8 characters
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Re-enter your password"
                    className="drib-input pl-10 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary] transition-colors"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirm.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1.5">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordsMatch || password.length < 8}
                className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Updating…</>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          )}
        </div>

        {!done && (
          <p className="text-center text-sm text-[--text-secondary] mt-5">
            Remembered it?{" "}
            <Link href="/auth/signin" className="text-[#ea4c89] hover:text-[#d6437a] transition-colors font-semibold">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#ea4c89]" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
