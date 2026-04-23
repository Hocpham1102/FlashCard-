import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/" || pathname === "/login" || pathname === "/register";
  const isProtectedPage = pathname.startsWith("/dashboard") || pathname.startsWith("/decks") || pathname.startsWith("/api/decks");

  // Nếu đã đăng nhập mà cố tình vào trang chủ, trang đăng nhập, đăng ký thì đẩy về dashboard
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Nếu chưa đăng nhập mà vào các trang nội bộ thì đẩy về đăng nhập
  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/decks/:path*",
    "/api/decks/:path*",
  ],
};
