"use client";

import { useState } from "react";
import { GraduationCap, Menu, X } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

interface Props {
  adminName: string;
  adminEmail: string;
  children: React.ReactNode;
}

export default function AdminShell({ adminName, adminEmail, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Dribbble: white sidebar + #f8f8f8 canvas
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col md:flex-row w-full overflow-x-hidden">

      {/* ── Mobile top bar ── */}
      <header className="md:hidden h-14 bg-white border-b border-[#e8e8e8] flex items-center justify-between px-4 shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#ea4c89] rounded-lg flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-[#0d0d0d] text-sm tracking-tight">Educom</span>
            <p className="text-[#ea4c89] text-[10px] font-semibold">Admin Panel</p>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="w-9 h-9 bg-[#f8f8f8] border border-[#e8e8e8] rounded-xl flex items-center justify-center hover:border-[#d4d4d4] transition-all"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          {sidebarOpen
            ? <X className="w-4 h-4 text-[#0d0d0d]" />
            : <Menu className="w-4 h-4 text-[#0d0d0d]" />}
        </button>
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
