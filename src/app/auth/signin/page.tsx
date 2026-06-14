"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password.");
    } else {
      toast.success("Welcome back!");
      router.push(callbackUrl);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-6">
            <div className="w-10 h-10 bg-[#ea4c89] rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-[#0d0d0d] tracking-tight">Educom</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#0d0d0d] mb-1.5">Welcome back</h1>
          <p className="text-[#6b6b76] text-sm">Sign in to your educator account</p>
        </div>

        <div className="bg-white border border-[#e8e8e8] rounded-2xl p-8 shadow-card space-y-5">

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#e8e8e8] rounded-xl py-2.5 text-sm text-[#0d0d0d] hover:bg-[#f8f8f8] hover:border-[#d4d4d4] transition-all disabled:opacity-50 font-medium"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#f0f0f0]" />
            <span className="text-[#9e9ea7] text-xs">or sign in with email</span>
            <div className="flex-1 h-px bg-[#f0f0f0]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6b6b76] mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9ea7]" />
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required placeholder="teacher@school.edu.zm"
                  className="drib-input pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#6b6b76]">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-[#ea4c89] hover:text-[#d6437a] transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9ea7]" />
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="drib-input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9e9ea7] hover:text-[#0d0d0d] transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading ? <Loader2 size={17} className="animate-spin" /> : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b6b76]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-[#ea4c89] hover:text-[#d6437a] transition-colors font-semibold">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#ea4c89]" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
