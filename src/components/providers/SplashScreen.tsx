"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Start fade-out after 4.6s, fully hide at 5s
    const fadeTimer = setTimeout(() => setFading(true), 4600);
    const hideTimer = setTimeout(() => setVisible(false), 5050);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1c1c1e",
        gap: 0,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.4s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* App icon */}
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 22,
          background: "linear-gradient(145deg, #f06299, #00A344)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(0,163,68,0.35)",
          marginBottom: 20,
        }}
      >
        <GraduationCap size={42} color="#ffffff" strokeWidth={1.8} />
      </div>

      {/* Brand name */}
      <p
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: "#f0f0f0",
          letterSpacing: "-0.02em",
          margin: 0,
          marginBottom: 56,
        }}
      >
        Educom
      </p>

      {/* Spinner ring */}
      <div style={{ position: "relative", width: 36, height: 36, marginBottom: 14 }}>
        {/* Track */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.08)",
          }}
        />
        {/* Spinning arc */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "#00A344",
            borderRightColor: "rgba(0,163,68,0.3)",
            animation: "educom-spin 0.9s linear infinite",
          }}
        />
      </div>

      {/* Label */}
      <p
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 13,
          color: "rgba(255,255,255,0.45)",
          margin: 0,
          letterSpacing: "0.02em",
        }}
      >
        Initializing...
      </p>

      {/* Keyframe */}
      <style>{`
        @keyframes educom-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
