"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Mail, Lock, User, Building2, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const PROVINCES = [
  "Central", "Copperbelt", "Eastern", "Luapula",
  "Lusaka", "Muchinga", "Northern", "North-Western",
  "Southern", "Western",
];

function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") ?? "free";

  const [form, setForm] = useState({ name: "", email: "", password: "", school: "", province: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) { toast.error(data.error ?? "Registration failed."); setLoading(false); return; }

    const signInRes = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    setLoading(false);

    if (signInRes?.ok) {
      toast.success("Account created! Welcome to Educom.");
      router.push("/dashboard");
    } else {
      toast.success("Account created! Please sign in.");
      router.push("/auth/signin");
    }
  }

  async function handleGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      await signIn("google", {
        callbackUrl: plan === "premium" ? "/payment" : "/dashboard",
        redirect: true,
      });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-5">
            <div className="w-10 h-10 bg-[#00A344] rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-[--text-primary] tracking-tight">Educom</span>
          </Link>
          <h1 className="text-2xl font-bold text-[--text-primary] mb-1.5">Create your account</h1>
          <p className="text-[--text-secondary] text-sm">
            {plan === "premium"
              ? <span className="text-[#00A344] font-semibold">Starting with Premium Plan ?</span>
              : "Free forever. Upgrade anytime."
            }
          </p>
        </div>

        <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-7 shadow-card space-y-5">

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-[--bg-surface] border border-[--border] rounded-xl py-3 text-sm text-[--text-primary] hover:bg-[--bg-canvas] hover:border-[--border-hover] active:bg-[--bg-elevated] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {googleLoading ? (
              <>
                <Loader2 size={18} className="animate-spin text-[--text-muted]" />
                <span>Connecting to Google�</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[--bg-elevated]" />
            <span className="text-[--text-muted] text-xs">or register with email</span>
            <div className="flex-1 h-px bg-[--bg-elevated]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { field: "name", icon: User, label: "Full name", placeholder: "Mr. John Banda", type: "text" },
              { field: "email", icon: Mail, label: "Email address", placeholder: "teacher@school.edu.zm", type: "email" },
              { field: "school", icon: Building2, label: "School (optional)", placeholder: "e.g. Kabulonga Boys Secondary", type: "text", optional: true },
            ].map(({ field, icon: Icon, label, placeholder, type, optional }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                  <input
                    type={type} value={(form as Record<string, string>)[field]}
                    onChange={(e) => update(field, e.target.value)}
                    required={!optional} placeholder={placeholder}
                    className="drib-input pl-10"
                  />
                </div>
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                <input
                  type={showPass ? "text" : "password"} value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required placeholder="Min. 8 characters"
                  className="drib-input pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary] transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <CheckCircle2 size={12} className={form.password.length >= 8 ? "text-[#007531]" : "text-[#e8e8e8]"} />
                  <span className={`text-xs ${form.password.length >= 8 ? "text-[#007531]" : "text-[--text-muted]"}`}>
                    At least 8 characters
                  </span>
                </div>
              )}
            </div>

            {/* Province */}
            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Province (optional)</label>
              <select value={form.province} onChange={(e) => update("province", e.target.value)}
                className="drib-input cursor-pointer">
                <option value="">Select province</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <button type="submit" disabled={loading} className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading ? <Loader2 size={17} className="animate-spin" /> : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs text-[--text-muted]">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="text-[--text-secondary] hover:text-[--text-primary]">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-[--text-secondary] hover:text-[--text-primary]">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-[--text-secondary]">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-[#00A344] hover:text-[#007531] transition-colors font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#00A344]" />
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}
