"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import LevelUpModal from "./LevelUpModal";

interface Stats {
  xp: number;
  level: number;
  progress: number;
  currentStreak: number;
}

export function UserStatsDisplay() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  // Xóa stats khi logout
  useEffect(() => {
    if (status === "unauthenticated") {
      setStats(null);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    // Initial fetch
    fetchStats();

    // Listen for custom event from Study/Quiz pages when XP is gained
    const handleGamificationUpdate = (event: CustomEvent) => {
      if (event.detail) {
        const { leveledUp, newLevel, updatedStats } = event.detail;
        if (leveledUp) {
          setNewLevel(newLevel);
          setShowLevelUp(true);
        }
        
        // Fetch fresh stats to ensure sync, or update from event if provided
        fetchStats();
      }
    };

    window.addEventListener("gamificationUpdate" as any, handleGamificationUpdate);
    return () => window.removeEventListener("gamificationUpdate" as any, handleGamificationUpdate);
  }, [status]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/user/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      // silent fail
    }
  };

  if (!stats) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Streak */}
        <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full text-sm font-bold border border-orange-200" title="Chuỗi học tập">
          <span>🔥</span>
          <span>{stats.currentStreak}</span>
        </div>
        
        {/* Level & XP */}
        <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100" title={`XP: ${stats.xp}`}>
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
            {stats.level}
          </div>
          <div className="hidden sm:block w-20 bg-indigo-200 rounded-full h-2 mr-1 overflow-hidden">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${stats.progress}%` }}
            />
          </div>
        </div>
      </div>

      <LevelUpModal 
        isOpen={showLevelUp} 
        level={newLevel} 
        onClose={() => setShowLevelUp(false)} 
      />
    </>
  );
}
