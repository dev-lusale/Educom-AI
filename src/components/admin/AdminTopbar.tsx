"use client";

import { Bell, Shield } from "lucide-react";

interface Props {
  adminName: string;
}

export default function AdminTopbar({ adminName }: Props) {
  return (
    <header className="h-14 bg-white border-b border-[#e8e8e8] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-[#ea4c89]" />
        <span className="text-[#6b6b76] text-sm font-medium">Admin Dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg flex items-center justify-center hover:border-[#d4d4d4] transition-all">
          <Bell size={14} className="text-[#6b6b76]" />
        </button>
        <div className="flex items-center gap-2 bg-[#f8f8f8] border border-[#e8e8e8] rounded-xl px-3 py-1.5">
          <div className="w-6 h-6 rounded-full bg-[#ea4c89] flex items-center justify-center text-white text-xs font-bold">
            {adminName[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="text-[#0d0d0d] text-xs font-semibold">{adminName}</span>
        </div>
      </div>
    </header>
  );
}
