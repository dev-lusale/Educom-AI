"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  Users2,
  BarChart2,
  Settings,
  LogOut,
  Crown,
  Users,
  Sparkles,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/dashboard/NotificationBell";
import ThemeToggle from "@/components/dashboard/ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard",      icon: LayoutDashboard, label: "Dashboard"    },
  { href: "/lesson-planner", icon: BookOpen,        label: "Lesson Plans" },
  { href: "/assessments",    icon: ClipboardList,   label: "Assessments"  },
  { href: "/assistant",      icon: Sparkles,        label: "AI Assistant" },
  { href: "/classrooms",     icon: Users2,          label: "Classrooms"   },
  { href: "/analytics",      icon: BarChart2,       label: "Analytics"    },
  { href: "/resources",      icon: FolderOpen,      label: "Resources"    },
  { href: "/community",      icon: Users,           label: "Community"    },
  { href: "/settings",       icon: Settings,        label: "Settings"     },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DashboardSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const firstName = session?.user?.name?.split(" ")[0] ?? "Teacher";
  const lastName  = session?.user?.name?.split(" ")[1]?.[0]
    ? `${session.user.name!.split(" ")[1][0]}.`
    : "";
  const isPremium = session?.user?.plan === "PREMIUM";
  const initials  = session?.user?.name?.[0]?.toUpperCase() ?? "T";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col",
          "w-60 md:w-56",
          "bg-[--bg-surface] border-r border-[--border] transition-colors duration-200",
          "transform transition-transform duration-250 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0 md:transform-none",
          "md:sticky md:top-0 md:h-screen",
        )}
      >
        {/* ── Logo ── */}
        <div className="px-5 pt-6 pb-5 border-b border-[--border]">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 bg-[#ea4c89] rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#d6437a] transition-colors">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-bold text-[--text-primary] text-base tracking-tight group-hover:text-[#ea4c89] transition-colors">
              Educom
            </span>
          </Link>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item, i) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={`${item.href}-${i}`}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                  isActive
                    ? "bg-[--accent-pale] text-[#ea4c89] font-semibold"
                    : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-canvas] font-normal"
                )}
              >
                <item.icon
                  size={17}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-[#ea4c89]" : "text-[--text-muted] group-hover:text-[--text-primary]"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="flex-1 leading-tight">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ea4c89] shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Notifications ── */}
        <div className="px-3 pb-2 border-t border-[--border] pt-2">
          <NotificationBell variant="row" />
        </div>

        {/* ── Theme toggle ── */}
        <div className="px-3 pb-2">
          <ThemeToggle variant="row" />
        </div>

        {/* ── Upgrade prompt (free users) ── */}
        {!isPremium && (
          <div className="mx-3 mb-3 p-4 rounded-xl bg-[#fce4ef] border border-[#f5b8d4]">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={14} className="text-[#ea4c89]" />
              <span className="text-[#ea4c89] text-xs font-semibold">Go Premium</span>
            </div>
            <p className="text-[--text-secondary] text-xs leading-relaxed mb-3">
              Unlock unlimited lesson plans, assessments, and community sharing.
            </p>
            <Link
              href="/payment"
              className="flex items-center justify-between w-full bg-[#ea4c89] text-white text-xs font-semibold rounded-lg px-3 py-2 hover:bg-[#d6437a] transition-colors"
            >
              <span>Upgrade now</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        )}

        {/* ── User profile footer ── */}
        <div className="px-3 pb-4 pt-3 border-t border-[--border]">

          {/* Premium badge */}
          {isPremium && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl bg-[--accent-pale]">
              <Crown size={11} className="text-[#ea4c89] shrink-0" />
              <span className="text-[#ea4c89] text-xs font-semibold">Premium</span>
            </div>
          )}

          {/* User row */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[--bg-canvas] transition-all group cursor-default">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-[#e8e8e8]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#ea4c89] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[--text-primary] text-xs font-semibold truncate leading-tight">
                {firstName} {lastName}
              </p>
              <p className="text-[--text-muted] text-[10px] leading-tight mt-0.5 truncate">
                {session?.user?.email ?? "Teacher"}
              </p>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
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
