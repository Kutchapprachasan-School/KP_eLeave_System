import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Skip API routes, static uploads, manuals, and files with extensions
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/manual") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Detect session cookie flexibly across HTTP / HTTPS / Vercel cookie prefixes
  const allCookies = request.cookies.getAll();
  const hasSessionCookie = allCookies.some((c) => {
    const name = c.name.toLowerCase();
    return name.includes("better-auth") || name.includes("session");
  });

  const isAuthRoute = pathname.startsWith("/login");

  // 3. If no session cookie exists and user is accessing a protected page, redirect to login
  if (!hasSessionCookie && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. If session cookie exists and user tries to access /login, redirect to dashboard
  if (hasSessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
