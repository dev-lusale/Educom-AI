"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light",  label: "Light",  Icon: Sun     },
  { value: "dark",   label: "Dark",   Icon: Moon    },
  { value: "system", label: "System", Icon: Monitor },
] as const;

type ThemeValue = (typeof OPTIONS)[number]["value"];

export default function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeTheme: ThemeValue = (mounted ? theme : "system") as ThemeValue;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 p-1 rounded-2xl",
        "bg-[--bg-canvas] border border-[--border]"
      )}
      role="radiogroup"
      aria-label="Theme preference"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = activeTheme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(value)}
            className={cn(
              "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold",
              "transition-all duration-200 select-none",
              isActive
                ? "bg-[#00A344] text-white shadow-green-sm"
                : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
            )}
          >
            <Icon
              size={12}
              strokeWidth={isActive ? 2.5 : 1.8}
              className="shrink-0"
            />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
