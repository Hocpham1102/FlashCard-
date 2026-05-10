"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Deck {
  _id: string;
  title: string;
  cardCount: number;
}

const QUIZ_TYPES = [
  {
    id: "multiple_choice",
    title: "Trắc nghiệm",
    description: "Chọn nghĩa đúng từ 4 đáp án",
    icon: "🔤",
    color: "from-indigo-500 to-blue-500",
    bgLight: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  {
    id: "meaning_match",
    title: "Ghép nghĩa",
    description: "Cho nghĩa tiếng Việt, chọn từ tiếng Anh",
    icon: "🔄",
    color: "from-purple-500 to-pink-500",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    id: "fill_blank",
    title: "Điền từ",
    description: "Điền từ tiếng Anh dựa vào nghĩa hoặc câu ví dụ",
    icon: "✏️",
    color: "from-emerald-500 to-teal-500",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: "listening",
    title: "Nghe & Chọn",
    description: "Nghe phát âm rồi chọn nghĩa đúng",
    icon: "🎧",
    color: "from-orange-500 to-amber-500",
    bgLight: "bg-orange-50",
    borderColor: "border-orange-200",
  },
];

export default function QuizSelectPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(10);

  useEffect(() => {
    fetch(`/api/decks/${deckId}`)
      .then((res) => res.json())
      .then((data) => { setDeck(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [deckId]);

  function startQuiz(type: string) {
    router.push(`/decks/${deckId}/quiz/${type}?count=${questionCount}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Không tìm thấy bộ thẻ</p>
          <Link href="/dashboard" className="text-indigo-600 font-medium hover:underline">Quay lại Dashboard</Link>
        </div>
      </div>
    );
  }

  const canQuiz = deck.cardCount >= 4;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link 
              href={`/decks/${deckId}`} 
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Quay lại bộ thẻ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Quiz: <span className="text-indigo-600">{deck.title}</span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">{deck.cardCount} thẻ trong bộ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!canQuiz ? (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Chưa đủ thẻ</h2>
            <p className="text-slate-500 mb-6">Cần ít nhất 4 thẻ trong bộ để tạo quiz. Hiện tại chỉ có {deck.cardCount} thẻ.</p>
            <Link href={`/decks/${deckId}`} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors">
              Thêm thẻ ngay
            </Link>
          </div>
        ) : (
          <>
            {/* Question count selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Số câu hỏi: <span className="text-indigo-600 text-lg">{questionCount}</span>
              </label>
              <input
                type="range"
                min={5}
                max={Math.min(30, deck.cardCount)}
                step={5}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>5</span>
                <span>{Math.min(30, deck.cardCount)}</span>
              </div>
            </div>

            {/* Quiz type cards */}
            <h2 className="text-lg font-bold text-slate-800 mb-4">Chọn loại quiz</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {QUIZ_TYPES.map((quiz) => (
                <button
                  key={quiz.id}
                  onClick={() => startQuiz(quiz.id)}
                  className={`group relative bg-white rounded-2xl shadow-sm border ${quiz.borderColor} p-6 text-left hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden`}
                >
                  {/* Gradient accent bar */}
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${quiz.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${quiz.bgLight} rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      {quiz.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                        {quiz.title}
                      </h3>
                      <p className="text-sm text-slate-500">{quiz.description}</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
