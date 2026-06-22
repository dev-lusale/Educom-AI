"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { GraduationCap, Lock, Mail, Loader2, Shield } from "lucide-react";

export default function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Login failed."); return; }
      toast.success("Welcome back, Admin.");
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[--bg-canvas] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-13 h-13 bg-[#00A344] rounded-2xl mb-4 w-14 h-14">
            <GraduationCap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight">Educom Admin</h1>
          <p className="text-[--text-secondary] text-sm mt-1">Secure administrator access</p>
        </div>

        {/* Card */}
        <div className="bg-[--bg-surface] border border-[--border] rounded-2xl p-8 shadow-card">
          <div className="flex items-center gap-2 mb-6 px-3 py-2.5 bg-[--accent-pale] rounded-xl">
            <Shield size={14} className="text-[#00A344] shrink-0" />
            <span className="text-[#00A344] text-xs font-medium">Admin credentials required</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@educom.zm"
                  className="drib-input pl-10"
                  required autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-muted]" />
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="��������"
                  className="drib-input pl-10"
                  required autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="drib-btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in�</>
                : <><Shield size={16} /> Sign In to Admin Panel</>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-[--text-muted] text-xs mt-5">
          This area is restricted to authorised administrators only.
        </p>
      </div>
    </div>
  );
}
