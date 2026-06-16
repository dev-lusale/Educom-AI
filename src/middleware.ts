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

  // Protected routes — check for NextAuth session token
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
    "/((?!_next|favicon\\.ico|api/|auth/|admin/login).*)",
  ],
};
