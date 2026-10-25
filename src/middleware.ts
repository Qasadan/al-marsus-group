import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

// Edge middleware: guards the /admin route group for UX only (fast redirect
// when unauthenticated). Real authorization is enforced server-side in every
// API route and server component — never trust the client alone.
const PROTECTED_PREFIXES = ["/admin"];
const ROLE_HOME: Record<string, string> = {
  CUSTOMER: "/portal",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isLogin = pathname === "/login";

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Customers belong in /portal, not /admin
  if (session && session.role === "CUSTOMER" && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  if (isLogin && session) {
    const url = req.nextUrl.clone();
    url.pathname = session.role === "CUSTOMER" ? "/portal" : "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
