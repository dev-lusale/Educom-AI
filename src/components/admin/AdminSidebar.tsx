"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap, LayoutDashboard, Users, CreditCard,
  BarChart3, FileText, LogOut, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard",              icon: LayoutDashboard, label: "Overview"     },
  { href: "/admin/dashboard/users",        icon: Users,           label: "Users"        },
  { href: "/admin/dashboard/transactions", icon: CreditCard,      label: "Transactions" },
  { href: "/admin/dashboard/analytics",    icon: BarChart3,       label: "Analytics"    },
  { href: "/admin/dashboard/logs",         icon: FileText,        label: "Audit Logs"   },
];

interface Props {
  adminName: string;
  adminEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ adminName, adminEmail, isOpen, onClose }: Props) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-56 bg-[--bg-surface] border-r border-[--border] flex flex-col",
        "transform transition-transform duration-250 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:translate-x-0 md:transform-none md:sticky md:top-0 md:h-screen",
      )}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-[--border]">
          <Link href="/admin/dashboard" onClick={onClose} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-[#ea4c89] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#d6437a] transition-colors">
              <GraduationCap size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-[--text-primary] text-sm tracking-tight leading-tight group-hover:text-[#ea4c89] transition-colors">Educom</p>
              <p className="text-[#ea4c89] text-[10px] font-semibold">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                  isActive
                    ? "bg-[--accent-pale] text-[#ea4c89] font-semibold"
                    : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-canvas]"
                )}
              >
                <item.icon
                  size={16}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-[#ea4c89]" : "text-[--text-muted] group-hover:text-[--text-primary]"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#ea4c89] shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Admin footer */}
        <div className="px-3 pb-4 pt-3 border-t border-[--border]">
          {/* Admin role badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-[--accent-pale]">
            <Shield size={11} className="text-[#ea4c89] shrink-0" />
            <span className="text-[#ea4c89] text-xs font-semibold">Administrator</span>
          </div>

          {/* Admin user row */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[--bg-canvas] transition-all cursor-default">
            <div className="w-8 h-8 rounded-full bg-[#ea4c89] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {adminName[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[--text-primary] text-xs font-semibold truncate leading-tight">{adminName}</p>
              <p className="text-[--text-muted] text-[10px] leading-tight mt-0.5 truncate">{adminEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-muted] hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
