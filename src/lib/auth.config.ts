/**
 * auth.config.ts — Edge-compatible auth configuration
 *
 * This file contains ONLY what is safe to run in the Vercel Edge runtime:
 *   - No Prisma / database calls
 *   - No bcrypt
 *   - No Node.js-only modules
 *
 * It is imported by:
 *   - src/middleware.ts  (Edge runtime — must stay lightweight)
 *
 * The full auth config (with PrismaAdapter, bcrypt, providers) lives in
 * src/lib/auth.ts and is imported only by Node.js route handlers.
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  providers: [
    // Providers are intentionally empty here.
    // The full list (Google, Credentials) is in src/lib/auth.ts.
    // The middleware only needs to check whether a JWT session exists —
    // it does not need to know how users sign in.
  ],

  callbacks: {
    // This is the only callback the middleware needs.
    // It runs on every matched request in the Edge runtime.
    // It must not touch Prisma or any Node.js-only module.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const PROTECTED = [
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

      const isProtected = PROTECTED.some((r) => pathname.startsWith(r));

      if (isProtected && !isLoggedIn) {
        const signInUrl = new URL("/auth/signin", nextUrl);
        signInUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(signInUrl);
      }

      return true;
    },
  },
};
