"use client";

import {
  isSpeechSynthesisSupported,
  playFeedbackTone,
  speakText,
  stopSpeaking,
} from "@/lib/studyAudio";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Card {
  _id: string;
  front: string;
  back: string;
  phonetic: string;
  example: string;
  partOfSpeech: string;
  synonyms: string;
  antonyms: string;
  collocations: string;
  toeicPart: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
}

interface Deck {
  _id: string;
  title: string;
  description?: string;
}

interface ReviewResult {
  nextReviewFormatted: string;
  interval: number;
}

type RatingOption = {
  label: string;
  quality: number;
  color: string;
  bgColor: string;
  hoverBg: string;
  borderColor: string;
  icon: string;
  description: string;
};

const RATING_OPTIONS: RatingOption[] = [
  {
    label: "Again",
    quality: 0,
    color: "text-red-700",
    bgColor: "bg-red-50",
    hoverBg: "hover:bg-red-100",
    borderColor: "border-red-200",
    icon: "🔄",
    description: "Quên hoàn toàn",
  },
  {
    label: "Hard",
    quality: 2,
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    hoverBg: "hover:bg-orange-100",
    borderColor: "border-orange-200",
    icon: "😓",
    description: "Rất khó nhớ",
  },
  {
    label: "Good",
    quality: 4,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    hoverBg: "hover:bg-emerald-100",
    borderColor: "border-emerald-200",
    icon: "👍",
    description: "Nhớ được",
  },
  {
    label: "Easy",
    quality: 5,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    hoverBg: "hover:bg-blue-100",
    borderColor: "border-blue-200",
    icon: "⚡",
    description: "Quá dễ",
  },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function StudyPage() {
  const params = useParams();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Stats
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const loadStudySession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [deckRes, cardsRes] = await Promise.all([
        fetch(`/api/decks/${deckId}`),
        fetch(`/api/decks/${deckId}/cards`),
      ]);

      if (!deckRes.ok) throw new Error("Failed to load deck");
      if (!cardsRes.ok) throw new Error("Failed to load cards");

      const deckData: Deck = await deckRes.json();
      const cardsData: Card[] = await cardsRes.json();

      setDeck(deckData);
      if (cardsData.length === 0) {
        setIsEmpty(true);
      } else {
        setCards(shuffleArray(cardsData));
        setCurrentIndex(0);
        setIsComplete(false);
        setIsEmpty(false);
        setStats({ again: 0, hard: 0, good: 0, easy: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    loadStudySession();
  }, [loadStudySession]);

  useEffect(() => {
    setSpeechSupported(isSpeechSynthesisSupported());
    return () => { stopSpeaking(); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isComplete || isLoading || isEmpty || cards.length === 0) return;

      if (e.code === "Space" && !isSubmittingReview) {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
        return;
      }

      if (isFlipped && !isSubmittingReview) {
        if (e.key === "1") handleRating(RATING_OPTIONS[0]);
        if (e.key === "2") handleRating(RATING_OPTIONS[1]);
        if (e.key === "3") handleRating(RATING_OPTIONS[2]);
        if (e.key === "4") handleRating(RATING_OPTIONS[3]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, isComplete, isLoading, isEmpty, cards.length, currentIndex, isSubmittingReview]);

  function handleSpeakFront() {
    if (cards.length === 0) return;
    const card = cards[currentIndex];
    speakText(card.front, { lang: "en-US", rate: 0.9, pitch: 1 });
  }

  async function handleRating(option: RatingOption) {
    if (isSubmittingReview) return;
    const card = cards[currentIndex];

    setIsSubmittingReview(true);

    // Update stats
    const statKey = option.label.toLowerCase() as keyof typeof stats;
    setStats((prev) => ({ ...prev, [statKey]: prev[statKey] + 1 }));

    // Play feedback
    if (option.quality >= 3) {
      playFeedbackTone("correct");
    } else {
      playFeedbackTone("wrong");
    }

    // Submit review to API
    try {
      const res = await fetch(`/api/cards/${card._id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality: option.quality }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviewResult({
          nextReviewFormatted: data.nextReviewFormatted,
          interval: data.interval,
        });

        // Update gamification display if returned
        if (data.gamification) {
          window.dispatchEvent(
            new CustomEvent("gamificationUpdate", { detail: data.gamification })
          );
        }
      }
    } catch {
      // Non-critical
    }

    // Auto-advance after a brief delay to show the review result
    setTimeout(() => {
      stopSpeaking();
      const nextIndex = currentIndex + 1;
      if (nextIndex >= cards.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex(nextIndex);
      }
      setIsFlipped(false);
      setReviewResult(null);
      setIsSubmittingReview(false);
    }, 800);
  }

  function handleStudyAgain() {
    setIsFlipped(false);
    setReviewResult(null);
    setIsSubmittingReview(false);
    setIsLoading(true);
    loadStudySession();
  }

  // --- RENDER ---

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Đang tải phiên học...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Đã xảy ra lỗi</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={loadStudySession}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (isEmpty && deck) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Chưa có thẻ nào</h2>
          <p className="text-slate-500 mb-8">Hãy thêm thẻ vào bộ này trước khi học!</p>
          <Link
            href={`/decks/${deck._id}`}
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
          >
            Quay lại bộ thẻ
          </Link>
        </div>
      </div>
    );
  }

  if (isComplete && deck) {
    const totalCards = cards.length;
    const goodRate = totalCards > 0 ? Math.round(((stats.good + stats.easy) / totalCards) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 sm:p-12 max-w-lg w-full text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Hoàn thành phiên học!</h2>
          <p className="text-slate-500 mb-6">
            Bạn đã ôn tập {totalCards} thẻ trong bộ <span className="font-semibold text-slate-700">{deck.title}</span>
          </p>

          {/* Score circle */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
            <div className="text-5xl font-extrabold text-indigo-600 mb-1">{goodRate}%</div>
            <div className="text-sm text-slate-500 mb-4">Tỷ lệ nhớ tốt</div>

            {/* Rating breakdown */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white rounded-xl p-3 border border-red-100">
                <div className="text-lg font-bold text-red-600">{stats.again}</div>
                <div className="text-xs text-slate-500">Again</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-orange-100">
                <div className="text-lg font-bold text-orange-600">{stats.hard}</div>
                <div className="text-xs text-slate-500">Hard</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-emerald-100">
                <div className="text-lg font-bold text-emerald-600">{stats.good}</div>
                <div className="text-xs text-slate-500">Good</div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-blue-100">
                <div className="text-lg font-bold text-blue-600">{stats.easy}</div>
                <div className="text-xs text-slate-500">Easy</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleStudyAgain}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow transition-colors"
            >
              Học lại
            </button>
            <Link
              href={`/decks/${deck._id}`}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2.5 px-6 rounded-xl transition-colors"
            >
              Quay lại bộ thẻ
            </Link>
            <Link
              href="/dashboard"
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2.5 px-6 rounded-xl transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- STUDYING STATE ---
  if (!deck || cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const progressPercent = totalCards > 0 ? ((currentIndex) / totalCards) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Link
                href={`/decks/${deck._id}`}
                className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                title="Thoát phiên học"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </Link>
              <span className="text-sm font-bold text-slate-700 truncate max-w-[200px] sm:max-w-[400px]">
                {deck.title}
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {currentIndex + 1} / {totalCards}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Area */}
      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Keyboard shortcuts hint */}
        <div className="text-center mb-4">
          <span className="text-xs text-slate-400">
            Phím tắt: <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">Space</kbd> lật thẻ
            {isFlipped && " · "}
            {isFlipped && <><kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">1</kbd>-<kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">4</kbd> đánh giá</>}
          </span>
        </div>

        {/* Flashcard */}
        <div
          className="perspective w-full mx-auto cursor-pointer"
          style={{ minHeight: "320px" }}
          onClick={() => !isSubmittingReview && setIsFlipped((prev) => !prev)}
        >
          <div
            className={`relative w-full transition-transform duration-[600ms] ${isFlipped ? "rotate-y-180" : ""}`}
            style={{ transformStyle: "preserve-3d", minHeight: "320px" }}
          >
            {/* Front Face */}
            <div
              className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center justify-center p-8"
              style={{ backfaceVisibility: "hidden" }}
            >
              {/* Part of speech badge */}
              {currentCard.partOfSpeech && (
                <span className="absolute top-4 left-4 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full">
                  {currentCard.partOfSpeech}
                </span>
              )}

              {/* TOEIC Part badge */}
              {currentCard.toeicPart && (
                <span className="absolute top-4 right-4 px-2 py-0.5 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">
                  {currentCard.toeicPart}
                </span>
              )}

              <p className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-2">
                {currentCard.front}
              </p>

              {/* Phonetic */}
              {currentCard.phonetic && (
                <p className="text-slate-400 text-sm mb-3">{currentCard.phonetic}</p>
              )}

              {/* TTS Button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleSpeakFront(); }}
                disabled={!speechSupported}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
              >
                <span className="text-lg">🔊</span>
                Nghe phát âm
              </button>

              {!isFlipped && (
                <p className="text-sm text-slate-400 mt-6 animate-pulse">
                  Nhấn để lật thẻ
                </p>
              )}
            </div>

            {/* Back Face */}
            <div
              className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 overflow-y-auto"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="space-y-4">
                {/* Main answer */}
                <div className="text-center pb-4 border-b border-slate-100">
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                    {currentCard.back}
                  </p>
                  {currentCard.phonetic && (
                    <p className="text-slate-400 text-sm">{currentCard.phonetic}</p>
                  )}
                </div>

                {/* Example */}
                {currentCard.example && (
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <div className="text-xs font-semibold text-amber-600 mb-1 uppercase tracking-wider">Ví dụ</div>
                    <p className="text-slate-700 text-sm italic">{currentCard.example}</p>
                  </div>
                )}

                {/* Collocations */}
                {currentCard.collocations && (
                  <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
                    <div className="text-xs font-semibold text-sky-600 mb-1 uppercase tracking-wider">Collocations</div>
                    <p className="text-slate-700 text-sm">{currentCard.collocations}</p>
                  </div>
                )}

                {/* Synonyms & Antonyms row */}
                {(currentCard.synonyms || currentCard.antonyms) && (
                  <div className="grid grid-cols-2 gap-3">
                    {currentCard.synonyms && (
                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                        <div className="text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wider">Đồng nghĩa</div>
                        <p className="text-slate-700 text-sm">{currentCard.synonyms}</p>
                      </div>
                    )}
                    {currentCard.antonyms && (
                      <div className="bg-rose-50 rounded-xl p-3 border border-rose-100">
                        <div className="text-xs font-semibold text-rose-600 mb-1 uppercase tracking-wider">Trái nghĩa</div>
                        <p className="text-slate-700 text-sm">{currentCard.antonyms}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Review result toast */}
                {reviewResult && (
                  <div className="text-center py-2 animate-in fade-in">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full border border-indigo-100">
                      📅 Ôn lại sau: {reviewResult.nextReviewFormatted}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rating Buttons - only show when flipped */}
        {isFlipped && (
          <div className="mt-6 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-sm text-slate-500 mb-3 font-medium">Bạn nhớ từ này như thế nào?</p>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {RATING_OPTIONS.map((option, idx) => (
                <button
                  key={option.label}
                  onClick={(e) => { e.stopPropagation(); handleRating(option); }}
                  disabled={isSubmittingReview}
                  className={`flex flex-col items-center gap-1 py-3 sm:py-4 px-2 rounded-xl border-2 ${option.bgColor} ${option.borderColor} ${option.hoverBg} ${option.color} font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  <span className="text-xl sm:text-2xl">{option.icon}</span>
                  <span className="text-xs sm:text-sm font-bold">{option.label}</span>
                  <span className="text-[10px] sm:text-xs opacity-70 hidden sm:block">{option.description}</span>
                  <kbd className="mt-1 px-1.5 py-0.5 bg-white/60 rounded text-[10px] font-mono opacity-50">{idx + 1}</kbd>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mini stats bar */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">🔄 <span className="text-red-500 font-semibold">{stats.again}</span></span>
          <span className="flex items-center gap-1">😓 <span className="text-orange-500 font-semibold">{stats.hard}</span></span>
          <span className="flex items-center gap-1">👍 <span className="text-emerald-500 font-semibold">{stats.good}</span></span>
          <span className="flex items-center gap-1">⚡ <span className="text-blue-500 font-semibold">{stats.easy}</span></span>
        </div>
      </div>
    </div>
  );
}
