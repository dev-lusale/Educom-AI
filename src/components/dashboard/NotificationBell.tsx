"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function getStoredEnabled(): boolean {
  try {
    return localStorage.getItem("educom_notifications") === "true";
  } catch {
    return false;
  }
}

interface NotificationBellProps {
  /** "icon" = compact square button (header/sidebar), "row" = full row with label (sidebar footer) */
  variant?: "icon" | "row";
}

export default function NotificationBell({ variant = "icon" }: NotificationBellProps) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [enabled, setEnabled]       = useState(false);
  const [pulse, setPulse]           = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [mounted, setMounted]       = useState(false);

  // -- Init on client only --------------------------------------------------
  useEffect(() => {
    setMounted(true);
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const perm = Notification.permission as PermissionState;
    setPermission(perm);
    setEnabled(getStoredEnabled() && perm === "granted");
  }, []);

  // -- Auto-dismiss toast ---------------------------------------------------
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // -- Welcome notification -------------------------------------------------
  const sendWelcomeNotification = useCallback(() => {
    if (typeof window === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification("EduCom AI � Notifications On", {
        body: "You'll be notified when your lesson plans and assessments are ready.",
        icon: "/favicon.ico",
      });
    } catch {
      // silent � some browsers (e.g. Chrome on Android) need a service worker
    }
  }, []);

  // -- Main toggle ----------------------------------------------------------
  async function handleToggle() {
    if (!mounted) return;

    if (!("Notification" in window)) {
      setToast({ msg: "Notifications are not supported in this browser.", type: "err" });
      return;
    }

    // Turn OFF
    if (enabled) {
      setEnabled(false);
      try { localStorage.setItem("educom_notifications", "false"); } catch {}
      setToast({ msg: "Notifications turned off.", type: "ok" });
      return;
    }

    // Blocked by user
    if (Notification.permission === "denied") {
      setToast({
        msg: "Notifications are blocked. Go to your browser's site settings to allow them, then try again.",
        type: "err",
      });
      return;
    }

    // Request permission
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") {
        setToast({ msg: "Permission was not granted. Notifications remain off.", type: "err" });
        return;
      }
    }

    // Granted � activate
    setEnabled(true);
    try { localStorage.setItem("educom_notifications", "true"); } catch {}
    setPulse(true);
    setTimeout(() => setPulse(false), 600);
    setToast({ msg: "Notifications activated! You're all set.", type: "ok" });
    sendWelcomeNotification();
  }

  const isOn       = enabled && permission === "granted";
  const isBlocked  = permission === "denied";
  const isNoSupport = permission === "unsupported";

  // Label for row variant
  const label = isOn
    ? "Notifications on"
    : isBlocked
    ? "Notifications blocked"
    : "Turn on notifications";

  // -- ROW variant (sidebar footer) -----------------------------------------
  if (variant === "row") {
    return (
      <>
        <button
          onClick={handleToggle}
          disabled={isNoSupport}
          title={
            isNoSupport ? "Not supported in this browser"
            : isBlocked  ? "Blocked � open site settings to allow"
            : isOn       ? "Click to turn off notifications"
            :              "Click to turn on notifications"
          }
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group",
            isOn
              ? "text-[#00A344] bg-[#e6f4ec] font-semibold"
              : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-canvas] font-normal",
            isNoSupport && "opacity-40 cursor-not-allowed"
          )}
        >
          {/* Icon */}
          <span className={cn(
            "w-[17px] h-[17px] flex items-center justify-center shrink-0 transition-all",
            pulse && "scale-125"
          )}>
            {isOn
              ? <Bell size={17} strokeWidth={2.2} className="text-[#00A344]" />
              : <BellOff size={17} strokeWidth={1.8} className={cn("text-[--text-muted] group-hover:text-[--text-primary]", isBlocked && "text-red-400")} />
            }
          </span>

          {/* Label */}
          <span className="flex-1 leading-tight text-left">{label}</span>

          {/* Status indicator */}
          {isOn && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A344] shrink-0 animate-pulse" />
          )}
          {isBlocked && (
            <span className="text-[10px] text-red-400 font-medium shrink-0">blocked</span>
          )}
        </button>

        <ToastPopup toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  // -- ICON variant (mobile header) -----------------------------------------
  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={isNoSupport}
        aria-label={isOn ? "Turn off notifications" : "Turn on notifications"}
        title={
          isNoSupport ? "Not supported"
          : isBlocked  ? "Blocked � open browser settings"
          : isOn       ? "Notifications on � click to turn off"
          :              "Click to enable notifications"
        }
        className={cn(
          "relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150",
          isOn
            ? "bg-[#e6f4ec] border border-[#00A344]/40 hover:bg-[#bbf7d0]"
            : "bg-[--bg-canvas] border border-[--border] hover:bg-[--bg-elevated] hover:border-[#00A344]/30",
          isNoSupport && "opacity-40 cursor-not-allowed",
          pulse && "scale-110"
        )}
      >
        {isOn
          ? <Bell    size={15} className="text-[#00A344]" />
          : <BellOff size={15} className={cn("text-[--text-muted]", isBlocked && "text-red-400")} />
        }
        {isOn && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#00A344] rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      <ToastPopup toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// -- Reusable toast ------------------------------------------------------------

function ToastPopup({
  toast,
  onDismiss,
}: {
  toast: { msg: string; type: "ok" | "err" } | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[9999] flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm",
        toast.type === "ok"
          ? "bg-[#e6f4ec] text-[#007531] border border-[#007531]/20"
          : "bg-red-50 text-red-700 border border-red-200"
      )}
    >
      {toast.type === "ok"
        ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
        : <AlertCircle  size={16} className="shrink-0 mt-0.5" />
      }
      <span className="flex-1 leading-snug">{toast.msg}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-50 hover:opacity-100 ml-1">
        <X size={13} />
      </button>
    </div>
  );
}
