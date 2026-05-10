"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface Props {
  isOpen: boolean;
  level: number;
  onClose: () => void;
}

export default function LevelUpModal({ isOpen, level, onClose }: Props) {
  useEffect(() => {
    if (isOpen) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6366f1', '#a855f7', '#ec4899']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6366f1', '#a855f7', '#ec4899']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
        <div className="relative w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/30 border-4 border-white ring-4 ring-orange-50">
          <span className="text-4xl">🌟</span>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-lg border-2 border-white shadow-sm">
            {level}
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">Thăng Cấp!</h2>
        <p className="text-slate-500 font-medium mb-8">Chúc mừng bạn đã đạt cấp độ mới. Hãy tiếp tục giữ vững phong độ nhé!</p>
        <button
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors shadow-sm shadow-indigo-600/20"
        >
          Tuyệt vời!
        </button>
      </div>
    </div>
  );
}
