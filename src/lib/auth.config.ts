/**
 * auth.config.ts — Edge-compatible auth configuration
 *
 * ONLY safe for the Vercel Edge runtime — no Prisma, no bcrypt, no Node.js modules.
 * Imported by: src/middleware.ts ONLY.
 *
 * Full config with PrismaAdapter + providers lives in src/lib/auth.ts
 * and is used only by Node.js API route handlers.
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  // Providers list is empty here — middleware only needs JWT verification.
  // The real providers (Google, Credentials) live in auth.ts.
  providers: [],

  callbacks: {
    /**
     * authorized() — called by NextAuth on every middleware-matched request.
     * Return true  → allow the request through.
     * Return false → NextAuth redirects to pages.signIn automatically.
     *
     * We only block routes that are explicitly in PROTECTED_PATHS.
     * All other routes (including /auth/*, /admin/*, /) pass through freely.
     */
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;

      const PROTECTED_PATHS = [
        "/dashboard",
        "/lesson-planner",
        "/community",
        "/settings",
        "/payment",
        "/assessments",
        "/assistant",
        "/lesson-plans",
        "/resources",
        "/analytics",
        "/classrooms",
      ];

      const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

      // If the route is protected and the user has no session → block (NextAuth
      // will redirect to /auth/signin automatically when we return false).
      if (isProtected && !auth?.user) {
        return false;
      }

      // Everything else — public pages, auth pages, API routes — passes through.
      return true;
    },
  },
};
