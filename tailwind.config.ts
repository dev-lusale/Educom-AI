import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Educom brand — kept for admin + landing/payment flows
        zambia: {
          emerald: "#007531",
          gold: "#EF7D00",
          "gold-light": "#F59332",
        },
        luxury: {
          obsidian: "#0A0A0B",
          "obsidian-2": "#111113",
          "obsidian-3": "#18181B",
          silver: "#C0C0C0",
          "silver-dim": "#888899",
          platinum: "#E8E8F0",
        },
        // Dribbble-inspired dashboard palette
        dribbble: {
          pink: "#ea4c89",
          "pink-light": "#f082ac",
          "pink-pale": "#fce4ef",
          canvas: "#f8f8f8",
          surface: "#ffffff",
          border: "#e8e8e8",
          muted: "#9e9ea7",
          text: "#0d0d0d",
          "text-secondary": "#6b6b76",
        },
      },
      fontFamily: {
        // Dribbble uses DM Sans / clean modern sans
        sans: ["'DM Sans'", "'Barlow'", "system-ui", "sans-serif"],
        display: ["'DM Sans'", "'Barlow Condensed'", "system-ui", "sans-serif"],
        mono: ["'DM Mono'", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "luxury-gradient": "linear-gradient(135deg, #0A0A0B 0%, #111113 50%, #0A0A0B 100%)",
        "gold-gradient": "linear-gradient(135deg, #EF7D00 0%, #F59332 100%)",
        "emerald-gradient": "linear-gradient(135deg, #007531 0%, #00A344 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "pink-gradient": "linear-gradient(135deg, #ea4c89 0%, #f082ac 100%)",
      },
      boxShadow: {
        gold: "0 0 30px rgba(239,125,0,0.15)",
        "gold-sm": "0 0 15px rgba(239,125,0,0.1)",
        emerald: "0 0 30px rgba(0,117,49,0.15)",
        luxury: "0 25px 50px rgba(0,0,0,0.5)",
        "luxury-sm": "0 8px 25px rgba(0,0,0,0.3)",
        // Dribbble-style subtle shadows
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "pink-sm": "0 2px 8px rgba(234,76,137,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "shimmer": "shimmer 2s infinite",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(239,125,0,0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(239,125,0,0.3)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
