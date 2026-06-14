/**
 * auth.config.ts — Edge-safe NextAuth configuration
 *
 * RULES:
 *  - NO Prisma, NO bcrypt, NO Node.js-only imports (ever)
 *  - Imported ONLY by src/middleware.ts
 *  - Full config (providers, PrismaAdapter) lives in src/lib/auth.ts
 *    and is imported only by Node.js API routes
 */

import type { NextAuthConfig } from "next-auth";

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

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isLoggedIn = !!auth?.user?.email;
      const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

      // Unauthenticated user hitting a protected route
      // → return false so NextAuth redirects to pages.signIn
      if (isProtected && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
};
