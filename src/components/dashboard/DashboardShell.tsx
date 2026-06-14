"use client";

import { useState } from "react";
import { GraduationCap, Menu, X, Bell } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

interface Props {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Dribbble-style: pure white sidebar + off-white #f8f8f8 canvas
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col md:flex-row w-full overflow-x-hidden">

      {/* ── Mobile top bar ── */}
      <header className="md:hidden sticky top-0 z-50 h-14 bg-white border-b border-[#e8e8e8] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#ea4c89] rounded-lg flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-[#0d0d0d] text-base tracking-tight">Educom</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="relative w-8 h-8 bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg flex items-center justify-center">
            <Bell size={15} className="text-[#6b6b76]" />
          </button>
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="w-8 h-8 bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg flex items-center justify-center"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? (
              <X size={17} className="text-[#0d0d0d]" />
            ) : (
              <Menu size={17} className="text-[#0d0d0d]" />
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
