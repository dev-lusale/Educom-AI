"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

// ── Google SVG icon ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Safe callbackUrl — only allow relative paths to prevent open redirects
  const rawCallback = params.get("callbackUrl") ?? "/dashboard";
  const callbackUrl = rawCallback.startsWith("/") ? rawCallback : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Google OAuth ────────────────────────────────────────────────────────────
  async function handleGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    setFormError(null);

    try {
      // signIn("google") triggers a full-page redirect to Google.
      // We pass redirect: true (default) so NextAuth handles the OAuth flow.
      // The callbackUrl is where Google sends the user back after consent.
      await signIn("google", {
        callbackUrl,
        redirect: true,
      });
      // Code below only runs if the redirect is somehow blocked
    } catch {
      setFormError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
    // Note: do NOT reset googleLoading here — the page redirects away.
    // If we reset it, there's a flash before the redirect completes.
  }

  // ── Email / password ────────────────────────────────────────────────────────
  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false, // we handle redirect manually so we can show errors
    });

    setLoading(false);

    if (!res) {
      setFormError("An unexpected error occurred. Please try again.");
      return;
    }

    if (res.error) {
      // NextAuth returns "CredentialsSignin" for wrong password
      setFormError("Invalid email or password. Please try again.");
      return;
    }

    // Success
    toast.success("Welcome back!");
    router.push(callbackUrl);
    router.refresh(); // ensure server components re-read the session
  }

  return (
    <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-[#ea4c89] rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-[--text-primary] tracking-tight">Educom</span>
          </Link>
          <h1 className="text-2xl font-bold text-[--text-primary] mb-1.5">Welcome back</h1>
          <p className="text-[--text-secondary] text-sm">Sign in to your educator account</p>
        </div>

        <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-8 shadow-card space-y-5">

          {/* Global error banner */}
          {formError && (
            <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              <AlertCircle size={15} className="shrink-0" />
              {formError}
            </div>
          )}

          {/* ── Google button ─────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-[--bg-surface] border border-[--border] rounded-xl py-3 text-sm text-[--text-primary] hover:bg-[--bg-canvas] hover:border-[--border-hover] active:bg-[--bg-elevated] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {googleLoading ? (
              <>
                <Loader2 size={18} className="animate-spin text-[--text-muted]" />
                <span>Connecting to Google…</span>
              </>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[--bg-elevated]" />
            <span className="text-[--text-muted] text-xs">or sign in with email</span>
            <div className="flex-1 h-px bg-[--bg-elevated]" />
          </div>

          {/* ── Email / password form ──────────────────────────────────────── */}
          <form onSubmit={handleCredentials} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[--text-secondary] mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="teacher@school.edu.zm"
                  className="drib-input pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-[--text-secondary]">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-[#ea4c89] hover:text-[#d6437a] transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] pointer-events-none" />
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="drib-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-primary] transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[--text-secondary]">
            Don&apos;t have an account?{" "}
            <Link
              href={`/auth/signup${callbackUrl !== "/dashboard" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-[#ea4c89] hover:text-[#d6437a] transition-colors font-semibold"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page export ────────────────────────────────────────────────────────────────
export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-[#ea4c89]" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
