"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface DashboardStats {
  userCount: number;
  deckCount: number;
  cardCount: number;
  adminCount: number;
  recentUsers: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    role: string;
    createdAt: string;
    _count: { decks: number };
  }[];
  recentDecks: {
    id: string;
    title: string;
    cardCount: number;
    updatedAt: string;
    user: {
      name: string | null;
      username: string | null;
      email: string | null;
    } | null;
  }[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return formatDate(value);
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login");
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "ADMIN" && !session?.user?.isAdmin) {
        router.replace("/dashboard");
        return;
      }
      fetchStats();
    }
  }, [status, session, router]);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-800/50 border border-slate-700/50" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-2xl bg-slate-800/50 border border-slate-700/50" />
          <div className="h-96 rounded-2xl bg-slate-800/50 border border-slate-700/50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <svg className="w-12 h-12 text-rose-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-rose-300 font-semibold text-lg mb-2">Đã xảy ra lỗi</p>
        <p className="text-rose-400/80 text-sm mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="px-5 py-2 rounded-xl bg-rose-500/20 text-rose-300 font-semibold text-sm hover:bg-rose-500/30 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Tổng người dùng",
      value: stats.userCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      gradient: "from-blue-500 to-cyan-500",
      bgGlow: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      label: "Tổng bộ thẻ",
      value: stats.deckCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      gradient: "from-emerald-500 to-teal-500",
      bgGlow: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      label: "Tổng thẻ học",
      value: stats.cardCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      gradient: "from-amber-500 to-orange-500",
      bgGlow: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    {
      label: "Quản trị viên",
      value: stats.adminCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      gradient: "from-violet-500 to-purple-500",
      bgGlow: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
    },
  ];

  const avgCardsPerDeck = stats.deckCount > 0 ? (stats.cardCount / stats.deckCount).toFixed(1) : "0";
  const avgDecksPerUser = stats.userCount > 0 ? (stats.deckCount / stats.userCount).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl border ${card.borderColor} ${card.bgGlow} p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-white tracking-tight">{card.value.toLocaleString()}</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${card.gradient} p-2.5 shadow-lg`}>
                <span className="text-white">{card.icon}</span>
              </div>
            </div>
            {/* Decorative glow */}
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-xl`} />
          </div>
        ))}
      </div>

      {/* Quick Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">TB thẻ/bộ thẻ</p>
              <p className="text-xl font-bold text-white">{avgCardsPerDeck}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">TB bộ thẻ/user</p>
              <p className="text-xl font-bold text-white">{avgDecksPerUser}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tỷ lệ Admin</p>
              <p className="text-xl font-bold text-white">
                {stats.userCount > 0 ? ((stats.adminCount / stats.userCount) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-white">Người dùng gần đây</h2>
            </div>
            <a
              href="/admin/users"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Xem tất cả →
            </a>
          </header>
          <div className="divide-y divide-slate-700/40">
            {stats.recentUsers.slice(0, 5).map((user) => (
              <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                  {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">
                    {user.name || user.username || "Chưa đặt tên"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email || "N/A"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                      user.role === "ADMIN"
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                        : "bg-slate-600/30 text-slate-400 border border-slate-600/40"
                    }`}
                  >
                    {user.role}
                  </span>
                  <p className="text-[11px] text-slate-600 mt-1">{user._count.decks} bộ thẻ</p>
                </div>
              </div>
            ))}
            {stats.recentUsers.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">
                Chưa có người dùng nào.
              </div>
            )}
          </div>
        </section>

        {/* Recent Decks */}
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-white">Bộ thẻ gần đây</h2>
            </div>
            <a
              href="/admin/decks"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Xem tất cả →
            </a>
          </header>
          <div className="divide-y divide-slate-700/40">
            {stats.recentDecks.slice(0, 5).map((deck) => (
              <div key={deck.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{deck.title}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {deck.user?.name || deck.user?.username || deck.user?.email || "N/A"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20">
                    {deck.cardCount} thẻ
                  </span>
                  <p className="text-[11px] text-slate-600 mt-1">{formatRelativeTime(deck.updatedAt)}</p>
                </div>
              </div>
            ))}
            {stats.recentDecks.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-500 text-sm">
                Chưa có bộ thẻ nào.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick Tips */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Hướng dẫn nhanh</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sử dụng menu bên trái để quản lý người dùng và bộ thẻ. Bạn có thể thay đổi quyền tài khoản, xóa bộ thẻ vi phạm, 
              hoặc xem chi tiết hoạt động của từng người dùng. Tài khoản hiện tại không thể tự hạ quyền admin để tránh khóa hệ thống.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
