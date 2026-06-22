"use client";

import { Bell, Shield } from "lucide-react";
import ThemeToggle from "@/components/dashboard/ThemeToggle";

interface Props {
  adminName: string;
}

export default function AdminTopbar({ adminName }: Props) {
  return (
    <header className="h-14 bg-[--bg-surface] border-b border-[--border] flex items-center justify-between px-6 shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-[#00A344]" />
        <span className="text-[--text-secondary] text-sm font-medium">Admin Dashboard</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle — light/dark/system */}
        <ThemeToggle variant="icon" />

        {/* Bell */}
        <button className="w-8 h-8 bg-[--bg-canvas] border border-[--border] rounded-lg flex items-center justify-center hover:border-[--border-hover] transition-all">
          <Bell size={14} className="text-[--text-secondary]" />
        </button>

        {/* Admin badge */}
        <div className="flex items-center gap-2 bg-[--bg-canvas] border border-[--border] rounded-xl px-3 py-1.5">
          <div className="w-6 h-6 rounded-full bg-[#00A344] flex items-center justify-center text-white text-xs font-bold">
            {adminName[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="text-[--text-primary] text-xs font-semibold">{adminName}</span>
        </div>
      </div>
    </header>
  );
}
