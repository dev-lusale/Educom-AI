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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e8e8e8]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo — goes to /dashboard if logged in, / if not */}
        <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-[#ea4c89] rounded-lg flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-[#0d0d0d] group-hover:text-[#ea4c89] transition-colors tracking-tight">
            Educom
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/#pricing" className="text-[#6b6b76] hover:text-[#0d0d0d] text-sm transition-colors font-medium">
            Pricing
          </Link>
          <Link href="/community" className="text-[#6b6b76] hover:text-[#0d0d0d] text-sm transition-colors font-medium">
            Community
          </Link>
          {!session ? (
            <div className="flex items-center gap-3">
              <Link href="/auth/signin" className="text-[#6b6b76] hover:text-[#0d0d0d] text-sm transition-colors font-medium">
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
                className="flex items-center gap-2 bg-[#f8f8f8] border border-[#e8e8e8] rounded-xl px-3 py-2 hover:border-[#d4d4d4] transition-all"
              >
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#ea4c89] flex items-center justify-center text-white text-xs font-bold">
                    {session.user.name?.[0]?.toUpperCase() ?? "T"}
                  </div>
                )}
                <span className="text-sm text-[#0d0d0d] max-w-[120px] truncate font-medium">{session.user.name}</span>
                {session.user.plan === "PREMIUM" && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#fce4ef] text-[#ea4c89]">PRO</span>
                )}
                <ChevronDown size={14} className={cn("text-[#9e9ea7] transition-transform", userMenuOpen && "rotate-180")} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#e8e8e8] rounded-xl shadow-card-hover overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#f0f0f0]">
                    <p className="text-[#0d0d0d] text-sm font-semibold truncate">{session.user.name}</p>
                    <p className="text-[#9e9ea7] text-xs truncate">{session.user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#6b6b76] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-colors">
                      <LayoutDashboard size={14} /> Dashboard
                    </Link>
                    <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#6b6b76] hover:text-[#0d0d0d] hover:bg-[#f8f8f8] transition-colors">
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
          className="md:hidden text-[#6b6b76] hover:text-[#0d0d0d] transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#e8e8e8] px-4 py-4 space-y-2">
          <Link href="/#pricing" onClick={() => setMobileOpen(false)}
            className="block text-[#6b6b76] hover:text-[#0d0d0d] py-2.5 text-sm font-medium">Pricing</Link>
          <Link href="/community" onClick={() => setMobileOpen(false)}
            className="block text-[#6b6b76] hover:text-[#0d0d0d] py-2.5 text-sm font-medium">Community</Link>
          {!session ? (
            <>
              <Link href="/auth/signin" onClick={() => setMobileOpen(false)}
                className="block text-[#6b6b76] hover:text-[#0d0d0d] py-2.5 text-sm font-medium">Sign In</Link>
              <Link href="/auth/signup" onClick={() => setMobileOpen(false)}
                className="drib-btn-primary block text-center text-sm py-2.5 mt-2">Get Started</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                className="block text-[#6b6b76] hover:text-[#0d0d0d] py-2.5 text-sm font-medium">Dashboard</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="block text-red-500 py-2.5 text-sm font-medium w-full text-left">Sign Out</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
