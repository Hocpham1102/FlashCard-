"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
};

function getItemClassname(pathname: string, href: string) {
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return isActive
    ? "rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white"
    : "rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-100 hover:bg-white/10 hover:text-white transition-colors";
}

export function NavMenu() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="hidden md:block h-8 w-64 rounded bg-indigo-500/50 animate-pulse" />
    );
  }

  const items: NavItem[] = [];

  if (session?.user?.role === "ADMIN" || session?.user?.isAdmin) {
    items.push({ label: "Admin", href: "/admin" });
  }

  return (
    <div className="hidden md:flex items-center gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={getItemClassname(pathname, item.href)}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
