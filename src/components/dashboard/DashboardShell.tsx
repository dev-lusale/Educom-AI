"use client";

import { useState } from "react";
import { GraduationCap, Menu, X } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import NotificationBell from "@/components/dashboard/NotificationBell";
import ThemeToggle from "@/components/dashboard/ThemeToggle";

interface Props {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[--bg-canvas] flex flex-col md:flex-row w-full overflow-x-hidden transition-colors duration-200">

      {/* ── Mobile top bar ── */}
      <header className="md:hidden sticky top-0 z-50 h-14 bg-[--bg-surface] border-b border-[--border] flex items-center justify-between px-4 shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#00A344] rounded-lg flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-[--text-primary] text-base tracking-tight">Educom</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="w-8 h-8 bg-[--bg-canvas] border border-[--border] rounded-lg flex items-center justify-center transition-colors"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? (
              <X size={17} className="text-[--text-primary]" />
            ) : (
              <Menu size={17} className="text-[--text-primary]" />
            )}
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <main className="flex-1 overflow-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
