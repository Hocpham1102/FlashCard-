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

interface SessionStats {
  correct: number;
  wrong: number;
}

type StudyState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; deck: Deck }
  | {
      status: "studying";
      deck: Deck;
      cards: Card[];
      currentIndex: number;
      stats: SessionStats;
    }
  | {
      status: "complete";
      deck: Deck;
      totalCards: number;
      stats: SessionStats;
    };

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeAnswerText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function isAnswerCorrect(userInput: string, expectedAnswer: string) {
  const normalizedUser = normalizeAnswerText(userInput);
  const normalizedExpected = normalizeAnswerText(expectedAnswer);

  if (!normalizedUser || !normalizedExpected) {
    return false;
  }

  if (normalizedUser === normalizedExpected) {
    return true;
  }

  const variants = normalizedExpected
    .split(/[,;\/|\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!variants.includes(normalizedExpected)) {
    variants.push(normalizedExpected);
  }

  const userTokens = normalizedUser
    .split(" ")
    .filter((token) => token.length >= 2);

  return variants.some((variant) => {
    if (variant === normalizedUser) {
      return true;
    }

    // Allow partial match when user entered a meaningful fragment.
    if (normalizedUser.length >= 3 && variant.includes(normalizedUser)) {
      return true;
    }

    // Allow cases like "go school" for expected "go to school".
    if (
      userTokens.length > 0 &&
      userTokens.every((token) => variant.includes(token))
    ) {
      return true;
    }

    return false;
  });
}

export default function StudyPage() {
  const params = useParams();
  const deckId = params.id as string;

  const [studyState, setStudyState] = useState<StudyState>({
    status: "loading",
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const loadStudySession = useCallback(async () => {
    try {
      const [deckRes, cardsRes] = await Promise.all([
        fetch(`/api/decks/${deckId}`),
        fetch(`/api/decks/${deckId}/cards`),
      ]);

      if (!deckRes.ok) {
        throw new Error("Failed to load deck");
      }
      if (!cardsRes.ok) {
        throw new Error("Failed to load cards");
      }

      const deck: Deck = await deckRes.json();
      const cards: Card[] = await cardsRes.json();

      if (cards.length === 0) {
        setStudyState({ status: "empty", deck });
      } else {
        setStudyState({
          status: "studying",
          deck,
          cards: shuffleArray(cards),
          currentIndex: 0,
          stats: { correct: 0, wrong: 0 },
        });
      }
    } catch (err) {
      setStudyState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }, [deckId]);

  useEffect(() => {
    loadStudySession();
  }, [loadStudySession]);

  useEffect(() => {
    setSpeechSupported(isSpeechSynthesisSupported());

    return () => {
      stopSpeaking();
    };
  }, []);

  async function submitReview(cardId: string, quality: number) {
    try {
      await fetch(`/api/cards/${cardId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
    } catch {
      // Silently fail — SM-2 update is background behavior
    }
  }

  function handleSubmitAnswer() {
    if (studyState.status !== "studying") return;

    const { cards, currentIndex } = studyState;
    const currentCard = cards[currentIndex];

    const correct = isAnswerCorrect(userAnswer, currentCard.back);

    setIsCorrect(correct);
    setHasAnswered(true);
    setIsFlipped(true);

    // Update stats
    const newStats = {
      correct: studyState.stats.correct + (correct ? 1 : 0),
      wrong: studyState.stats.wrong + (correct ? 0 : 1),
    };

    setStudyState({
      ...studyState,
      stats: newStats,
    });

    playFeedbackTone(correct ? "correct" : "wrong");

    // Submit review in background
    const quality = correct ? 4 : 0;
    submitReview(currentCard._id, quality);
  }

  function handleSpeakFront() {
    if (studyState.status !== "studying") return;

    const card = studyState.cards[studyState.currentIndex];
    speakText(card.front, { lang: "en-US", rate: 0.95, pitch: 1 });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !hasAnswered && userAnswer.trim().length > 0) {
      handleSubmitAnswer();
    }
  }

  function handleNext() {
    if (studyState.status !== "studying") return;

    stopSpeaking();

    const { cards, currentIndex, stats } = studyState;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= cards.length) {
      setStudyState({
        status: "complete",
        deck: studyState.deck,
        totalCards: cards.length,
        stats,
      });
    } else {
      setStudyState({
        ...studyState,
        currentIndex: nextIndex,
      });
    }

    // Reset per-card state
    setIsFlipped(false);
    setUserAnswer("");
    setHasAnswered(false);
    setIsCorrect(false);
  }

  function handleStudyAgain() {
    if (studyState.status !== "complete") return;

    // We need to reload cards and shuffle again
    setIsFlipped(false);
    setUserAnswer("");
    setHasAnswered(false);
    setIsCorrect(false);
    setStudyState({ status: "loading" });
    loadStudySession();
  }

  if (studyState.status === "loading") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500 text-lg">Loading study session...</div>
        </div>
      </div>
    );
  }

  if (studyState.status === "error") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{studyState.message}</p>
        </div>
      </div>
    );
  }

  if (studyState.status === "empty") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">&#128218;</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No cards yet
          </h2>
          <p className="text-gray-500 mb-8">
            This deck doesn&apos;t have any cards to study. Add some cards
            first!
          </p>
          <Link
            href={`/decks/${studyState.deck._id}`}
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Back to Deck
          </Link>
        </div>
      </div>
    );
  }

  if (studyState.status === "complete") {
    const { stats, totalCards, deck } = studyState;
    const percentage =
      totalCards > 0 ? Math.round((stats.correct / totalCards) * 100) : 0;

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">&#127942;</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Session Complete!
          </h2>
          <p className="text-gray-500 mb-6">
            You reviewed {totalCards} card{totalCards !== 1 ? "s" : ""}
          </p>

          {/* Score summary */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="text-4xl font-bold text-indigo-600 mb-2">
              {percentage}%
            </div>
            <div className="text-sm text-gray-500 mb-4">Score</div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.correct}
                </div>
                <div className="text-xs text-gray-500">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-600">
                  {stats.wrong}
                </div>
                <div className="text-xs text-gray-500">Incorrect</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleStudyAgain}
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Study Again
            </button>
            <Link
              href={`/decks/${deck._id}`}
              className="inline-block bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold py-2.5 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Back to Deck
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { deck, cards, currentIndex } = studyState;
  const currentCard = cards[currentIndex];
  const totalCards = cards.length;
  const completedCards = currentIndex;
  const progressPercent =
    totalCards > 0 ? (completedCards / totalCards) * 100 : 0;

  // Determine card border color based on answer state
  const cardBorderClass = hasAnswered
    ? isCorrect
      ? "border-emerald-400 ring-2 ring-emerald-200"
      : "border-rose-400 ring-2 ring-rose-200"
    : "border-gray-100";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">{deck.title}</h1>
          <span className="text-sm text-gray-500">
            Card {currentIndex + 1} of {totalCards}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1 text-right">
          {completedCards} / {totalCards} completed
        </div>
      </div>

      {/* Card */}
      <div className="flex flex-col items-center justify-center py-4">
        <div
          className="perspective w-full max-w-lg mx-auto"
          style={{ minHeight: "300px" }}
        >
          <div
            className={`relative w-full h-full transition-transform duration-[600ms] ${
              hasAnswered ? "cursor-pointer" : "cursor-default"
            } ${isFlipped ? "rotate-y-180" : ""}`}
            onClick={() => hasAnswered && setIsFlipped((prev) => !prev)}
            style={{
              transformStyle: "preserve-3d",
              minHeight: "300px",
            }}
          >
            {/* Front */}
            <div
              className={`absolute inset-0 backface-hidden bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 border ${cardBorderClass}`}
              style={{ backfaceVisibility: "hidden" }}
            >
              <p className="text-lg text-gray-700 text-center whitespace-pre-wrap">
                {currentCard.front}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeakFront();
                }}
                disabled={!speechSupported}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                type="button"
              >
                <span aria-hidden="true">&#128266;</span>
                <span>
                  {speechSupported
                    ? "Listen pronunciation"
                    : "Audio unavailable"}
                </span>
              </button>
              {!hasAnswered && (
                <p className="text-sm text-gray-400 mt-6">
                  Type your answer below
                </p>
              )}
            </div>

            {/* Back */}
            <div
              className={`absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-2xl shadow-lg flex flex-col items-center justify-center p-8 border ${cardBorderClass}`}
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <p className="text-lg text-gray-700 text-center whitespace-pre-wrap">
                {currentCard.back}
              </p>
              {hasAnswered && (
                <div className="mt-6 text-center">
                  {isCorrect ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700">
                      Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-rose-100 text-rose-700">
                      Wrong! The answer is: {currentCard.back}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Answer Input */}
        {!hasAnswered && (
          <div className="mt-6 w-full max-w-lg mx-auto">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              Tip: You can type the main keyword(s) in the expected answer.
            </p>
            <button
              onClick={handleSubmitAnswer}
              disabled={userAnswer.trim().length === 0}
              className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl shadow transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Submit
            </button>
          </div>
        )}

        {/* Next Button */}
        {hasAnswered && (
          <div className="mt-6 w-full max-w-lg mx-auto transition-all duration-300 opacity-100 translate-y-0">
            <button
              onClick={handleNext}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Next
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Click the card to flip and review
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
