"use client";

import { DashboardStats } from "@/components/DashboardStats";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface Deck {
  _id: string;
  title: string;
  description: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userName = session?.user?.name || session?.user?.username || "bạn";

  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI generation states
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTopic, setAITopic] = useState("");
  const [aiCardCount, setAICardCount] = useState(10);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [aiSuccess, setAISuccess] = useState<string | null>(null);

  // File import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      setDecks([]);
      setLoading(false);
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      fetchDecks();
    }
  }, [status, router]);

  async function fetchDecks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/decks");

      const contentType = res.headers.get("content-type") || "";
      if (res.status === 401 || !contentType.includes("application/json")) {
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch decks");
      }

      const data = await res.json();
      setDecks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDeck(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "authenticated") return;
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) {
        throw new Error("Failed to create deck");
      }
      setTitle("");
      setDescription("");
      setIsModalOpen(false);
      await fetchDecks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalCards = decks.reduce((sum, deck) => sum + deck.cardCount, 0);

  async function handleAIGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "authenticated") return;
    if (!aiTopic.trim()) return;
    setIsAIGenerating(true);
    setAIError(null);
    setAISuccess(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic, cardCount: aiCardCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Có lỗi xảy ra");
      setAISuccess(
        `✨ Đã tạo bộ thẻ "${data.deck.title}" với ${data.deck.cardCount} thẻ!`,
      );
      setAITopic("");
      await fetchDecks();
      setTimeout(() => {
        setIsAIModalOpen(false);
        setAISuccess(null);
      }, 2500);
    } catch (err: any) {
      setAIError(err.message);
    } finally {
      setIsAIGenerating(false);
    }
  }

  // ─── File Import ───────────────────────────────────────────────
  // File cấu trúc (parser trực tiếp, không cần AI)
  const STRUCTURED_EXTS = new Set(["csv", "json", "txt"]);

  const getFileExt = (f: File) => f.name.split(".").pop()?.toLowerCase() ?? "";
  const isStructured = (f: File) => STRUCTURED_EXTS.has(getFileExt(f));

  const handleFileSelect = useCallback((file: File) => {
    setImportFile(file);
    setImportError(null);
    // Tự động điền tên từ tên file
    if (!importTitle) {
      setImportTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    }
  }, [importTitle]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      if (importTitle.trim()) fd.append("title", importTitle.trim());

      // Route đúng endpoint: file cấu trúc dùng parser, còn lại dùng AI
      const endpoint = isStructured(importFile)
        ? "/api/decks/import"
        : "/api/decks/import-ai";

      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nhập file thất bại");
      setImportSuccess(`✅ Đã tạo bộ thẻ "${data.deck.title}" với ${data.deck.cardCount} thẻ!`);
      await fetchDecks();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportFile(null);
        setImportTitle("");
        setImportSuccess(null);
      }, 2500);
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Welcome Banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Chào mừng trở lại,{" "}
                <span className="text-indigo-600">{userName}!</span> 👋
              </h1>
              <p className="mt-2 text-slate-500 text-lg">
                Hôm nay bạn muốn ôn tập kiến thức nào?
              </p>
            </div>
            {!loading && !error && (
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-center px-4 border-r border-slate-200">
                  <p className="text-sm font-medium text-slate-500">Bộ thẻ</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {decks.length}
                  </p>
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-medium text-slate-500">
                    Tổng số thẻ
                  </p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {totalCards}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardStats />
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Bộ thẻ của bạn</h2>
          <div className="flex items-center gap-3">
            {/* AI Generate Button */}
            <button
              onClick={() => {
                setIsAIModalOpen(true);
                setAIError(null);
                setAISuccess(null);
              }}
              className="relative group flex items-center gap-2 py-2.5 px-5 rounded-xl font-semibold text-sm text-white overflow-hidden shadow-lg hover:shadow-purple-500/30 transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500 transition-all duration-300"></span>
              <span className="relative flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Tạo bằng AI
              </span>
            </button>
            {/* Import File Button */}
            <button
              onClick={() => {
                setIsImportModalOpen(true);
                setImportFile(null);
                setImportTitle("");
                setImportError(null);
                setImportSuccess(null);
              }}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-600 text-slate-600 font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Nhập file
            </button>

            {/* Manual Create Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tạo bộ mới
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div className="text-slate-500 font-medium">
              Đang tải dữ liệu...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="font-bold text-lg">Đã xảy ra lỗi</p>
            </div>
            <p className="text-red-600 ml-9">{error}</p>
            <button
              onClick={fetchDecks}
              className="mt-3 ml-9 text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && decks.length === 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-dashed border-slate-300 p-16 text-center max-w-2xl mx-auto mt-10 transition-all hover:border-indigo-400 hover:shadow-md">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">📚</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Chưa có bộ thẻ nào
            </h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto text-lg">
              Hãy tạo bộ thẻ đầu tiên của bạn để bắt đầu hành trình chinh phục
              kiến thức ngay hôm nay!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Tạo bộ thẻ đầu tiên
            </button>
          </div>
        )}

        {!loading && !error && decks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => (
              <div
                key={deck._id}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200/60 p-6 transition-all duration-300 transform hover:-translate-y-1 flex flex-col relative overflow-hidden"
              >
                {/* Decorative top border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                    {deck.cardCount} thẻ
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {deck.title}
                </h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-1">
                  {deck.description || "Không có mô tả"}
                </p>

                <div className="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
                  <Link
                    href={`/decks/${deck._id}/study`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Học
                  </Link>
                  <Link
                    href={`/decks/${deck._id}/quiz`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                    title="Quiz"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    Quiz
                  </Link>
                  <Link
                    href={`/decks/${deck._id}`}
                    className="flex-none flex items-center justify-center bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-sm font-bold w-10 h-10 rounded-xl transition-colors"
                    title="Quản lý"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">
                  Tạo Bộ thẻ mới
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateDeck} className="px-6 py-6 space-y-5">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-bold text-slate-700 mb-1.5"
                  >
                    Tên bộ thẻ <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors text-slate-900 font-medium"
                    placeholder="Ví dụ: Từ vựng Tiếng Anh căn bản"
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-bold text-slate-700 mb-1.5"
                  >
                    Mô tả ngắn gọn
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors text-slate-900 resize-none"
                    placeholder="Dùng để học 100 từ vựng cốt lõi..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setTitle("");
                      setDescription("");
                    }}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Đang tạo...
                      </span>
                    ) : (
                      "Tạo ngay"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Generation Modal */}
        {isAIModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="relative px-6 py-5 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  Tạo bộ thẻ bằng AI
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  Nhập chủ đề, AI sẽ biên soạn bộ thẻ đầy đủ cho bạn
                </p>
                <button
                  onClick={() => {
                    setIsAIModalOpen(false);
                    setAIError(null);
                    setAISuccess(null);
                  }}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-6">
                {aiSuccess && (
                  <div className="mb-5 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-medium text-center">
                    {aiSuccess}
                  </div>
                )}
                {aiError && (
                  <div className="mb-5 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                    {aiError}
                  </div>
                )}
                {isAIGenerating && (
                  <div className="flex flex-col items-center justify-center py-8 gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                      <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-800 text-lg">
                        AI đang biên soạn tài liệu...
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        Thường mất 5–15 giây, vui lòng chờ
                      </p>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                )}
                {!isAIGenerating && !aiSuccess && (
                  <form onSubmit={handleAIGenerate} className="space-y-5">
                    <div>
                      <label
                        htmlFor="aiTopic"
                        className="block text-sm font-bold text-slate-700 mb-1.5"
                      >
                        Chủ đề <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="aiTopic"
                        type="text"
                        value={aiTopic}
                        onChange={(e) => setAITopic(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-colors text-slate-900 font-medium"
                        placeholder="VD: Từ vựng IELTS band 7, Công thức vật lý lớp 12..."
                        autoFocus
                      />
                      <p className="text-xs text-slate-400 mt-1.5">
                        Mô tả chủ đề càng chi tiết, thẻ càng chất lượng
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="aiCardCount"
                        className="block text-sm font-bold text-slate-700 mb-1.5"
                      >
                        Số lượng thẻ:{" "}
                        <span className="text-purple-600 font-extrabold">
                          {aiCardCount}
                        </span>
                      </label>
                      <input
                        id="aiCardCount"
                        type="range"
                        min={5}
                        max={30}
                        step={5}
                        value={aiCardCount}
                        onChange={(e) => setAICardCount(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>5 thẻ</span>
                        <span>30 thẻ</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAIModalOpen(false);
                          setAIError(null);
                        }}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={!aiTopic.trim()}
                        className="relative group px-6 py-2.5 text-sm font-bold text-white rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500 transition-all"></span>
                        <span className="relative flex items-center gap-2">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          Tạo ngay với AI
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ─── File Import Modal ─── */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Nhập bộ thẻ từ file</h2>
                    <p className="text-xs text-slate-400">Bất kỳ file nào · PDF · Ảnh · CSV · JSON · TXT · HTML...</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5">
                {/* Success */}
                {importSuccess && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700 font-medium text-sm">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {importSuccess}
                  </div>
                )}

                {/* Error */}
                {importError && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 text-sm">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {importError}
                  </div>
                )}

                <form onSubmit={handleImport} className="space-y-4">
                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? "border-emerald-400 bg-emerald-50 scale-[1.01]"
                        : importFile
                        ? "border-emerald-400 bg-emerald-50/60"
                        : "border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/40"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                    />

                    {importFile ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-800 text-sm">{importFile.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(importFile.size / 1024).toFixed(1)} KB · {importFile.name.split(".").pop()?.toUpperCase()}
                          </p>
                          {/* Badge AI vs Cấu trúc */}
                          {isStructured(importFile) ? (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                              ⚡ Cấu trúc — nhanh
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                              ✨ AI sẽ phân tích — 10–30 giây
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setImportFile(null); setImportTitle(""); }}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Thảy file khác
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-slate-600 text-sm">Kéo thả file vào đây</p>
                          <p className="text-xs text-slate-400 mt-1">hoặc <span className="text-emerald-600 font-semibold">chọn file</span></p>
                          <p className="text-xs text-slate-400 mt-0.5">PDF · Ảnh · TXT · CSV · JSON · HTML · tối đa 20MB</p>
                          <div className="flex items-center gap-2 mt-2 justify-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">⚡ CSV/JSON/TXT: nhanh</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">✨ PDF/Ảnh: AI phân tích</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Deck Title */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Tên bộ thẻ
                    </label>
                    <input
                      type="text"
                      value={importTitle}
                      onChange={(e) => setImportTitle(e.target.value)}
                      placeholder="Tự động lấy từ tên file nếu để trống"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition-colors text-slate-900 text-sm"
                    />
                  </div>

                  {/* Format Guide */}
                  <details className="group rounded-xl border border-slate-200 overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Hướng dẫn định dạng file
                      </span>
                      <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-4 pb-4 pt-2 space-y-3 bg-slate-50/50 border-t border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CSV</p>
                        <code className="block text-xs bg-slate-900 text-emerald-400 rounded-lg px-3 py-2 font-mono whitespace-pre">{`front,back,phonetic,example
negotiate,đàm phán,/nɪˈɡoʊ.ʃi.eɪt/,We need to negotiate.
deliver,giao hàng,,The package was delivered.`}</code>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">TXT (mỗi dòng)</p>
                        <code className="block text-xs bg-slate-900 text-emerald-400 rounded-lg px-3 py-2 font-mono whitespace-pre">{`negotiate\tđàm phán\t/nɪˈɡoʊ.ʃi.eɪt/
deliver\tgiao hàng
# hoặc dùng :: 
negotiate::đàm phán`}</code>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">JSON</p>
                        <code className="block text-xs bg-slate-900 text-emerald-400 rounded-lg px-3 py-2 font-mono whitespace-pre">{`{"title":"Tên bộ thẻ",
 "cards":[{"front":"negotiate","back":"đàm phán"}]}`}</code>
                      </div>
                    </div>
                  </details>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={!importFile || isImporting}
                      className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      {isImporting ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {importFile && !isStructured(importFile) ? "AI đang phân tích..." : "Đang nhập..."}
                        </>
                      ) : (
                        <>
                          {importFile && !isStructured(importFile) ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Phân tích bằng AI
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Nhập bộ thẻ
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
