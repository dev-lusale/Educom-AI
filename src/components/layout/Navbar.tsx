"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { GraduationCap, Menu, X, ChevronDown, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[--bg-surface] border-b border-[--border]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo � goes to /dashboard if logged in, / if not */}
        <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-[#00A344] rounded-lg flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-[--text-primary] group-hover:text-[#00A344] transition-colors tracking-tight">
            Educom
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/#pricing" className="text-[--text-secondary] hover:text-[--text-primary] text-sm transition-colors font-medium">
            Pricing
          </Link>
          <Link href="/community" className="text-[--text-secondary] hover:text-[--text-primary] text-sm transition-colors font-medium">
            Community
          </Link>
          {!session ? (
            <div className="flex items-center gap-3">
              <Link href="/auth/signin" className="text-[--text-secondary] hover:text-[--text-primary] text-sm transition-colors font-medium">
                Sign In
              </Link>
              <Link href="/auth/signup" className="drib-btn-primary py-2 px-5 text-sm">
                Get Started
              </Link>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 bg-[--bg-canvas] border border-[--border] rounded-xl px-3 py-2 hover:border-[--border-hover] transition-all"
              >
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#00A344] flex items-center justify-center text-white text-xs font-bold">
                    {session.user.name?.[0]?.toUpperCase() ?? "T"}
                  </div>
                )}
                <span className="text-sm text-[--text-primary] max-w-[120px] truncate font-medium">{session.user.name}</span>
                {session.user.plan === "PREMIUM" && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ec] text-[#00A344]">PRO</span>
                )}
                <ChevronDown size={14} className={cn("text-[--text-muted] transition-transform", userMenuOpen && "rotate-180")} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-[--bg-surface] border border-[--border] rounded-xl shadow-card-hover overflow-hidden">
                  <div className="px-4 py-3 border-b border-[--border]">
                    <p className="text-[--text-primary] text-sm font-semibold truncate">{session.user.name}</p>
                    <p className="text-[--text-muted] text-xs truncate">{session.user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-canvas] transition-colors">
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-canvas] transition-colors">
                      <Settings size={14} /> Settings
                    </Link>
                    <button onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[--bg-surface] border-t border-[--border] px-4 py-4 space-y-2">
          <Link href="/#pricing" onClick={() => setMobileOpen(false)}
            className="block text-[--text-secondary] hover:text-[--text-primary] py-2.5 text-sm font-medium">Pricing</Link>
          <Link href="/community" onClick={() => setMobileOpen(false)}
            className="block text-[--text-secondary] hover:text-[--text-primary] py-2.5 text-sm font-medium">Community</Link>
          {!session ? (
            <>
              <Link href="/auth/signin" onClick={() => setMobileOpen(false)}
                className="block text-[--text-secondary] hover:text-[--text-primary] py-2.5 text-sm font-medium">Sign In</Link>
              <Link href="/auth/signup" onClick={() => setMobileOpen(false)}
                className="drib-btn-primary block text-center text-sm py-2.5 mt-2">Get Started</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                className="block text-[--text-secondary] hover:text-[--text-primary] py-2.5 text-sm font-medium">Dashboard</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="block text-red-500 py-2.5 text-sm font-medium w-full text-left">Sign Out</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
