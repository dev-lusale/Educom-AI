import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/lesson-planner", "/community", "/settings", "/payment"];
const ADMIN_PROTECTED = ["/admin/dashboard"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Admin dashboard routes — check for admin_session cookie
  if (ADMIN_PROTECTED.some((r) => pathname.startsWith(r))) {
    const adminCookie = req.cookies.get("admin_session");
    if (!adminCookie?.value) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // User-facing protected routes
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !req.auth) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
