import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Educom", template: "%s | Educom" },
  description: "The professional platform for Zambian educators — CBC-aligned lesson planning, collaboration, and growth.",
  keywords: ["Zambia", "education", "lesson plan", "CBC", "TCZ", "teachers"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#18181B",
                color: "#E8E8F0",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#007531", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#fff" },
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
