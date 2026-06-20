"use client";

import { useState } from "react";
import { GraduationCap, Menu, X } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import ThemeToggle from "@/components/dashboard/ThemeToggle";

interface Props {
  adminName: string;
  adminEmail: string;
  children: React.ReactNode;
}

export default function AdminShell({ adminName, adminEmail, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[--bg-canvas] flex flex-col md:flex-row w-full overflow-x-hidden transition-colors duration-200">

      {/* ── Mobile top bar ── */}
      <header className="md:hidden h-14 bg-[--bg-surface] border-b border-[--border] flex items-center justify-between px-4 shrink-0 sticky top-0 z-50 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#ea4c89] rounded-lg flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-[--text-primary] text-sm tracking-tight">Educom</span>
            <p className="text-[#ea4c89] text-[10px] font-semibold">Admin Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle visible on mobile too */}
          <ThemeToggle variant="icon" />

          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="w-9 h-9 bg-[--bg-canvas] border border-[--border] rounded-xl flex items-center justify-center hover:border-[--border-hover] transition-all"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen
              ? <X className="w-4 h-4 text-[--text-primary]" />
              : <Menu className="w-4 h-4 text-[--text-primary]" />}
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <AdminSidebar
        adminName={adminName}
        adminEmail={adminEmail}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <div className="hidden md:block">
          <AdminTopbar adminName={adminName} />
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
