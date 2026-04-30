"use client";

import { useState } from "react";

type UserRole = "USER" | "ADMIN";

interface AdminUser {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: UserRole;
  deckCount: number;
}

interface Props {
  users: AdminUser[];
  currentAdminId: string;
}

export default function RoleManagerTable({ users, currentAdminId }: Props) {
  const [rows, setRows] = useState(users);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const initialRoles = users.reduce<Record<string, UserRole>>(
    (accumulator, user) => {
      accumulator[user.id] = user.role;
      return accumulator;
    },
    {},
  );

  const filteredRows = rows.filter((user) => {
    const keyword = search.trim().toLowerCase();
    const searchable =
      `${user.name ?? ""} ${user.username ?? ""} ${user.email ?? ""}`.toLowerCase();
    const matchedKeyword = keyword.length === 0 || searchable.includes(keyword);
    const matchedRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchedKeyword && matchedRole;
  });

  async function handleUpdateRole(userId: string, role: UserRole) {
    setSavingUserId(userId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Không thể cập nhật quyền.");
      }

      setRows((previous) =>
        previous.map((row) =>
          row.id === userId
            ? { ...row, role: data.user.role as UserRole }
            : row,
        ),
      );
      initialRoles[userId] = data.user.role as UserRole;
      setMessage({
        type: "success",
        text: "Đã cập nhật quyền tài khoản thành công.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Đã xảy ra lỗi.",
      });
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div>
      {message && (
        <p
          className={`px-4 py-3 text-sm font-medium border-b ${
            message.type === "success"
              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
              : "text-rose-700 bg-rose-50 border-rose-100"
          }`}
        >
          {message.text}
        </p>
      )}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo tên, username, email..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 sm:max-w-sm"
        />
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "ALL" | UserRole)
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="ALL">Tất cả quyền</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setRoleFilter("ALL");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Xóa lọc
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Tên</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Bộ thẻ</th>
              <th className="px-4 py-3 text-left font-semibold">Quyền</th>
              <th className="px-4 py-3 text-left font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-800">
                  {user.name || user.username || "Chưa đặt tên"}
                  {user.id === currentAdminId && (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                      Bạn
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {user.email || "N/A"}
                </td>
                <td className="px-4 py-3 text-slate-700">{user.deckCount}</td>
                <td className="px-4 py-3 text-slate-700">
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    value={user.role}
                    disabled={
                      savingUserId === user.id || user.id === currentAdminId
                    }
                    onChange={(event) => {
                      const selectedRole = event.target.value as UserRole;
                      setRows((previous) =>
                        previous.map((row) =>
                          row.id === user.id
                            ? { ...row, role: selectedRole }
                            : row,
                        ),
                      );
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={
                      savingUserId === user.id ||
                      user.id === currentAdminId ||
                      initialRoles[user.id] === user.role
                    }
                    onClick={() => handleUpdateRole(user.id, user.role)}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingUserId === user.id ? "Đang lưu..." : "Lưu"}
                  </button>
                  {initialRoles[user.id] !== user.role && (
                    <p className="mt-1 text-xs font-medium text-amber-600">
                      Chưa lưu thay đổi
                    </p>
                  )}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
