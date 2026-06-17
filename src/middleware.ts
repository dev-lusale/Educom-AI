import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin dashboard — cookie-based guard
  if (pathname.startsWith("/admin/dashboard")) {
    const adminCookie = req.cookies.get("admin_session");
    if (!adminCookie?.value) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes — check for NextAuth v5 (auth.js) session token.
  // NextAuth v5 uses "authjs.session-token" on HTTP and the __Secure- prefixed
  // variant on HTTPS (production). Both must be checked.
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const sessionToken =
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-authjs.session-token");
    if (!sessionToken?.value) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - _next/static  (Next.js static assets)
     *  - _next/image   (Next.js image optimisation)
     *  - favicon.ico
     *  - api/auth      (NextAuth v5 handlers — must never be blocked)
     *  - auth/         (sign-in, sign-out, error pages)
     *  - admin/login   (public admin login page)
     *  - public static files (png, jpg, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth|auth/|admin/login|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff2?)$).*)",
  ],
};
