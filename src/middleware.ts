/**
 * src/middleware.ts — Vercel Edge Middleware
 *
 * SIZE BUDGET: must stay well under 1 MB (Vercel Edge limit).
 * ONLY import from auth.config.ts — never from auth.ts.
 * auth.ts pulls in PrismaAdapter + bcryptjs → would exceed the limit.
 */

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;

  // Admin dashboard — guarded by a signed httpOnly cookie set at login.
  // Cookie check is safe in Edge and doesn't require NextAuth.
  if (pathname.startsWith("/admin/dashboard")) {
    const adminCookie = req.cookies.get("admin_session");
    if (!adminCookie?.value) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // All other route protection is handled by the `authorized` callback
  // in auth.config.ts — return NextResponse.next() here so NextAuth's
  // own redirect logic (from authorized returning false) can take effect.
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Run middleware on ALL routes EXCEPT:
     *  - _next/static    static assets
     *  - _next/image     image optimisation
     *  - favicon.ico
     *  - /api/           API routes run in Node.js serverless, not Edge
     *  - /auth/          sign-in, sign-up, error — must never be blocked
     *  - /admin/login    admin login page — must never be blocked
     *
     * NOTE: The regex uses a negative lookahead so these paths are
     * completely skipped — the middleware function is never called for them.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|auth/|admin/login).*)",
  ],
};
