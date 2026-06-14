/**
 * src/middleware.ts — Vercel Edge Middleware
 *
 * RULES:
 *  - Import ONLY from auth.config.ts, never from auth.ts
 *  - auth.ts imports PrismaAdapter + bcrypt → blows past 1 MB Edge limit
 *  - Keep this file as small as possible
 */

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // Admin dashboard — cookie-based guard, no NextAuth needed
  if (pathname.startsWith("/admin/dashboard")) {
    const adminCookie = req.cookies.get("admin_session");
    if (!adminCookie?.value) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  /*
   * Match every path EXCEPT the ones below.
   * These are skipped entirely — middleware never runs on them.
   *
   * _next/static   → static files
   * _next/image    → image optimisation
   * favicon.ico    → browser favicon
   * api            → Node.js serverless functions (not Edge)
   * auth           → /auth/signin, /auth/signup, /auth/error etc.
   * admin/login    → admin login page (public)
   * _next          → catch-all for Next.js internals
   */
  matcher: [
    "/((?!_next|favicon\\.ico|api/|auth/|admin/login).*)",
  ],
};
