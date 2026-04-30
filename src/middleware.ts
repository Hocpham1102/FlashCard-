import { canAccessAdminArea } from "@/lib/admin";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  const isAuthPage =
    pathname === "/" || pathname === "/login" || pathname === "/register";
  const isAdminLoginPage = pathname === "/admin/login";
  const isApiRoute = pathname.startsWith("/api/");
  const isProtectedPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/decks") ||
    pathname.startsWith("/api/decks") ||
    pathname.startsWith("/api/admin");
  const isAdminPage = pathname.startsWith("/admin") && !isAdminLoginPage;

  // Nếu đã đăng nhập mà cố tình vào trang chủ, trang đăng nhập, đăng ký thì đẩy về dashboard
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Nếu chưa đăng nhập mà vào các trang nội bộ thì đẩy về đăng nhập
  if (isProtectedPage && !token) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAdminLoginPage && token) {
    if (
      canAccessAdminArea({
        role: token.role as "USER" | "ADMIN" | undefined,
      })
    ) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isAdminPage) {
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    if (
      !canAccessAdminArea({
        role: token.role as "USER" | "ADMIN" | undefined,
      })
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/admin/:path*",
    "/decks/:path*",
    "/api/decks/:path*",
    "/api/admin/:path*",
  ],
};
