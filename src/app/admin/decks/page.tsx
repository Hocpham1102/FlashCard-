"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface AdminDeck {
  id: string;
  title: string;
  description: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
  } | null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminDecksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [decks, setDecks] = useState<AdminDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sortBy, setSortBy] = useState<"updatedAt" | "cardCount" | "title">("updatedAt");

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
      fetchDecks();
    }
  }, [status, session, router]);

  async function fetchDecks() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/decks");
      if (!res.ok) throw new Error("Failed to fetch decks");
      const data = await res.json();
      setDecks(data.decks || []);
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh sách bộ thẻ." });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDeck(deckId: string) {
    setDeletingDeckId(deckId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/decks/${deckId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể xóa bộ thẻ.");
      }
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      setConfirmDelete(null);
      setMessage({ type: "success", text: "Đã xóa bộ thẻ thành công." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Đã xảy ra lỗi." });
    } finally {
      setDeletingDeckId(null);
    }
  }

  const filteredDecks = decks
    .filter((deck) => {
      const keyword = search.trim().toLowerCase();
      if (keyword.length === 0) return true;
      const searchable = `${deck.title} ${deck.description} ${deck.user?.name ?? ""} ${deck.user?.username ?? ""} ${deck.user?.email ?? ""}`.toLowerCase();
      return searchable.includes(keyword);
    })
    .sort((a, b) => {
      if (sortBy === "cardCount") return b.cardCount - a.cardCount;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const totalCards = filteredDecks.reduce((sum, d) => sum + d.cardCount, 0);

  if (loading || status === "loading") {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 rounded-xl bg-slate-800/50 border border-slate-700/50" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-800/50 border border-slate-700/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Quản lý bộ thẻ</h2>
          <p className="text-sm text-slate-400 mt-1">
            {decks.length} bộ thẻ · {decks.reduce((s, d) => s + d.cardCount, 0)} thẻ
          </p>
        </div>
        <button
          onClick={fetchDecks}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Làm mới
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            message.type === "success"
              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
              : "text-rose-300 bg-rose-500/10 border-rose-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bộ thẻ, chủ sở hữu..."
            className="w-full rounded-xl border border-slate-600/50 bg-slate-900/50 pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border border-slate-600/50 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-indigo-500/50"
          >
            <option value="updatedAt">Mới cập nhật</option>
            <option value="cardCount">Nhiều thẻ nhất</option>
            <option value="title">Theo tên A-Z</option>
          </select>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-500">
          Hiển thị <span className="text-slate-300 font-semibold">{filteredDecks.length}</span> bộ thẻ
        </span>
        <span className="text-slate-700">·</span>
        <span className="text-slate-500">
          Tổng <span className="text-emerald-400 font-semibold">{totalCards}</span> thẻ
        </span>
      </div>

      {/* Decks Grid */}
      {filteredDecks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              className="group relative rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 transition-all duration-300 hover:bg-slate-800/50 hover:border-slate-600/60 hover:shadow-lg hover:shadow-slate-900/50"
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20">
                  {deck.cardCount} thẻ
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-slate-200 mb-1 line-clamp-1 group-hover:text-white transition-colors">
                {deck.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4 min-h-[32px]">
                {deck.description || "Không có mô tả"}
              </p>

              {/* Owner */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-[10px] font-bold shrink-0">
                  {deck.user?.name?.charAt(0)?.toUpperCase() || deck.user?.username?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {deck.user?.name || deck.user?.username || deck.user?.email || "N/A"}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/40">
                <p className="text-[11px] text-slate-600">{formatDate(deck.updatedAt)}</p>
                {confirmDelete === deck.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDeleteDeck(deck.id)}
                      disabled={deletingDeckId === deck.id}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition-colors border border-rose-500/30 disabled:opacity-50"
                    >
                      {deletingDeckId === deck.id ? "..." : "Xóa"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-400 text-xs font-bold hover:bg-slate-700 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(deck.id)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Xóa bộ thẻ"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-12 text-center">
          <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-slate-500 font-medium">Không tìm thấy bộ thẻ phù hợp.</p>
        </div>
      )}
    </div>
  );
}
