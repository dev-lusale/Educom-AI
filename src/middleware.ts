/**
 * src/middleware.ts — Vercel Edge Middleware
 *
 * Must stay well under the 1 MB Edge Function size limit.
 *
 * IMPORTANT: import ONLY from auth.config.ts here — never from auth.ts.
 * auth.ts pulls in PrismaAdapter + bcryptjs which are Node.js-only and
 * would balloon this bundle past the 1 MB limit.
 */

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight Edge-compatible auth — JWT verification only, no DB calls
const { auth } = NextAuth(authConfig);

// Admin routes are checked by cookie — no auth library needed
const ADMIN_PROTECTED = ["/admin/dashboard"];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // Admin dashboard — guarded by a signed cookie set at login
  if (ADMIN_PROTECTED.some((r) => pathname.startsWith(r))) {
    const adminCookie = req.cookies.get("admin_session");
    if (!adminCookie?.value) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // User-facing routes are handled by the `authorized` callback in auth.config.ts
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico
     * - /api/*        (API routes run in Node.js, not Edge)
     * - /admin/login  (public — must not redirect loop)
     * - /auth/*       (sign-in pages — must not redirect loop)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|admin/login|auth).*)",
  ],
};
