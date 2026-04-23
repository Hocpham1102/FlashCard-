"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "./UserAvatar";

export function LoginButton() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Ẩn nút đăng nhập khi đang ở trang login hoặc register
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  if (status === "loading") {
    return <div className="h-8 w-20 bg-indigo-500 rounded animate-pulse"></div>;
  }

  if (session) {
    return (
      <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <span className="text-sm font-medium text-indigo-100 hidden sm:block">
          {session.user?.name || session.user?.username || session.user?.email || "Bạn"}
        </span>
        <UserAvatar 
          user={session.user} 
          className="w-10 h-10 rounded-full border-2 border-indigo-300" 
          fallbackClassName="bg-indigo-500" 
        />
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="text-sm font-bold bg-white text-indigo-600 px-5 py-2.5 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
    >
      Đăng nhập
    </Link>
  );
}
