"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import Link from "next/link";

interface ActivityData {
  date: string;
  displayDate: string;
  xpEarned: number;
  cardsStudied: number;
  quizzesTaken: number;
}

interface Stats {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalCardsStudied: number;
  totalQuizzesTaken: number;
  totalCorrect: number;
  totalWrong: number;
}

interface AnalyticsData {
  stats: Stats;
  activityData: ActivityData[];
  recentDecks: { id: string; title: string; cardCount: number }[];
}

export function DashboardStats() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    fetch("/api/user/analytics")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-pulse mb-8">
        <div className="h-8 w-48 bg-slate-200 rounded mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-50 rounded-xl"></div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, activityData } = data;
  const accuracy =
    stats.totalCorrect + stats.totalWrong > 0
      ? Math.round(
          (stats.totalCorrect / (stats.totalCorrect + stats.totalWrong)) * 100
        )
      : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-xl">
          <p className="font-bold text-slate-700 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mb-10 space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tổng Thẻ Đã Học</h3>
            <span className="text-xl">📚</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.totalCardsStudied}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Chuỗi Dài Nhất</h3>
            <span className="text-xl">🔥</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.longestStreak} <span className="text-base font-medium text-slate-500">ngày</span></p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Số Bài Quiz</h3>
            <span className="text-xl">🎯</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.totalQuizzesTaken}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tỷ Lệ Nhớ</h3>
            <span className="text-xl">🧠</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{accuracy}<span className="text-xl">%</span></p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main XP Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Biểu đồ kinh nghiệm (14 ngày qua)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" name="XP Nhận Được" dataKey="xpEarned" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorXp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Hoạt động học tập</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData.slice(-7)} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar name="Thẻ đã ôn" dataKey="cardsStudied" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar name="Quiz đã làm" dataKey="quizzesTaken" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
