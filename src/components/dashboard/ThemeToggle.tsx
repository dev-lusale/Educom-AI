"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle — two variants:
 *   "icon"  — compact square button for the mobile header (default)
 *   "row"   — full-width nav row item for the sidebar footer
 *
 * Cycles: light → dark → system → light…
 */
interface ThemeToggleProps {
  variant?: "icon" | "row";
  className?: string;
}

export default function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function cycle() {
    if (theme === "light")  return setTheme("dark");
    if (theme === "dark")   return setTheme("system");
    return setTheme("light");
  }

  const isDark   = resolvedTheme === "dark";
  const isSystem = theme === "system";

  const label = theme === "light"  ? "Switch to dark mode"
              : theme === "dark"   ? "Switch to system mode"
              :                      "Switch to light mode";

  const rowLabel = theme === "light"  ? "Light mode"
                 : theme === "dark"   ? "Dark mode"
                 :                      "System theme";

  const Icon = !mounted   ? Monitor
             : isSystem   ? Monitor
             : isDark     ? Moon
             :               Sun;

  // ── ROW variant (sidebar) ─────────────────────────────────────────────────
  if (variant === "row") {
    return (
      <button
        onClick={cycle}
        aria-label={label}
        title={label}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group",
          isDark && mounted
            ? "text-[#ea4c89] font-semibold"
            : "text-[--text-secondary] hover:text-[--text-primary] font-normal",
          "hover:bg-[--bg-canvas]",
          className
        )}
      >
        <span className="w-[17px] h-[17px] flex items-center justify-center shrink-0">
          <Icon
            size={17}
            strokeWidth={isDark && mounted ? 2.2 : 1.8}
            className={cn(
              "transition-colors",
              isDark && mounted
                ? "text-[#ea4c89]"
                : "text-[--text-muted] group-hover:text-[--text-primary]"
            )}
          />
        </span>
        <span className="flex-1 leading-tight text-left">{rowLabel}</span>
        {/* Indicator pill */}
        <span className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors",
          isDark && mounted
            ? "bg-[--accent-pale] text-[#ea4c89]"
            : "bg-[--bg-canvas] text-[--text-muted]"
        )}>
          {!mounted ? "…" : theme === "light" ? "L" : theme === "dark" ? "D" : "A"}
        </span>
      </button>
    );
  }

  // ── ICON variant (mobile header) ─────────────────────────────────────────
  return (
    <button
      onClick={cycle}
      aria-label={label}
      title={label}
      className={cn(
        "relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
        isDark && mounted
          ? "bg-[--accent-pale] border border-[#ea4c89]/30 hover:border-[#ea4c89]/50"
          : "bg-[--bg-canvas] border border-[--border] hover:border-[#ea4c89]/30",
        className
      )}
    >
      <Icon
        size={15}
        className={cn(
          "transition-colors",
          isDark && mounted ? "text-[#ea4c89]" : "text-[--text-muted]"
        )}
      />
    </button>
  );
}
