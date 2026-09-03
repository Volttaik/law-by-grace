import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/settings", "/profile/edit", "/admin", "/upload", "/editor", "/flows"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;
  const userRole = (req.auth?.user as any)?.role;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  const isProtected =
    PROTECTED.some((p) => pathname.startsWith(p)) && !pathname.startsWith("/admin/login");
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + searchParams.toString());
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users on auth screens head straight into the library.
  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    const cb = searchParams.get("callbackUrl");
    if (userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (cb && cb.startsWith("/")) {
      return NextResponse.redirect(new URL(cb, req.url));
    }
    return NextResponse.redirect(new URL("/explore", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Run on app routes only — skip API routes and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
