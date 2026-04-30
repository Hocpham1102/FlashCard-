"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UserRole = "USER" | "ADMIN";

interface AdminUser {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: UserRole;
  emailVerified: string | null;
  _count: { decks: number };
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
      fetchUsers();
    }
  }, [status, session, router]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh sách người dùng." });
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter((user) => {
    const keyword = search.trim().toLowerCase();
    const searchable = `${user.name ?? ""} ${user.username ?? ""} ${user.email ?? ""}`.toLowerCase();
    const matchedKeyword = keyword.length === 0 || searchable.includes(keyword);
    const matchedRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchedKeyword && matchedRole;
  });

  async function handleUpdateRole(userId: string, role: UserRole) {
    setSavingUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật quyền.");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.user.role as UserRole } : u))
      );
      setMessage({ type: "success", text: `Đã cập nhật quyền cho ${data.user.name || data.user.username || data.user.email}.` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Đã xảy ra lỗi." });
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    setDeletingUserId(userId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể xóa người dùng.");
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDelete(null);
      setMessage({ type: "success", text: "Đã xóa người dùng thành công." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Đã xảy ra lỗi." });
    } finally {
      setDeletingUserId(null);
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 rounded-xl bg-slate-800/50 border border-slate-700/50" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-800/50 border border-slate-700/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Quản lý người dùng</h2>
          <p className="text-sm text-slate-400 mt-1">
            {users.length} người dùng · {users.filter((u) => u.role === "ADMIN").length} admin
          </p>
        </div>
        <button
          onClick={fetchUsers}
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

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, username, email..."
            className="w-full rounded-xl border border-slate-600/50 bg-slate-900/50 pl-10 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "ALL" | UserRole)}
            className="rounded-xl border border-slate-600/50 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-indigo-500/50"
          >
            <option value="ALL">Tất cả quyền</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>
          <button
            onClick={() => { setSearch(""); setRoleFilter("ALL"); }}
            className="rounded-xl border border-slate-600/50 bg-slate-900/50 px-3 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/40">
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Người dùng
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bộ thẻ
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quyền
                </th>
                <th className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                        {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {user.name || user.username || "Chưa đặt tên"}
                          {user.id === session?.user?.id && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Bạn
                            </span>
                          )}
                        </p>
                        {user.username && user.name && (
                          <p className="text-xs text-slate-500">@{user.username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-400">{user.email || "N/A"}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      {user._count.decks}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <select
                      className="rounded-lg border border-slate-600/50 bg-slate-900/80 px-2 py-1.5 text-xs font-semibold text-slate-300 outline-none focus:border-indigo-500/50 disabled:opacity-50"
                      value={user.role}
                      disabled={savingUserId === user.id || user.id === session?.user?.id}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {savingUserId === user.id && (
                        <span className="text-xs text-indigo-400 font-medium">Đang lưu...</span>
                      )}
                      {user.id !== session?.user?.id && (
                        <>
                          {confirmDelete === user.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deletingUserId === user.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold hover:bg-rose-500/30 transition-colors border border-rose-500/30 disabled:opacity-50"
                              >
                                {deletingUserId === user.id ? "..." : "Xác nhận"}
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
                              onClick={() => setConfirmDelete(user.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Xóa người dùng"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <svg className="w-10 h-10 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-slate-500 font-medium">Không tìm thấy người dùng phù hợp.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
