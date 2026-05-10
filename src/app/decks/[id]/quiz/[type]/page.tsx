"use client";

import { speakText, isSpeechSynthesisSupported, playFeedbackTone } from "@/lib/studyAudio";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";

interface QuizOption {
  text: string;
  isCorrect: boolean;
}

interface QuizQuestion {
  cardId: string;
  question: string;
  phonetic?: string;
  hint?: string;
  type: string;
  options?: QuizOption[];
  correctAnswer: string;
}

interface AnswerRecord {
  cardId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentMs: number;
  question: string;
}

type QuizPhase = "loading" | "playing" | "answered" | "results" | "error";

export default function QuizPlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const quizType = params.type as string;
  const questionCount = Number(searchParams.get("count")) || 10;

  const [phase, setPhase] = useState<QuizPhase>("loading");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [fillAnswer, setFillAnswer] = useState("");
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [error, setError] = useState("");
  const [score, setScore] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const questionStartTime = useRef(Date.now());
  const [timer, setTimer] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load quiz
  const loadQuiz = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, type: quizType, questionCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");

      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setAnswers([]);
      setPhase("playing");
      questionStartTime.current = Date.now();
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    }
  }, [deckId, quizType, questionCount]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);
  useEffect(() => { setSpeechSupported(isSpeechSynthesisSupported()); }, []);

  // Auto-speak for listening quiz
  useEffect(() => {
    if (phase === "playing" && quizType === "listening" && questions[currentIdx]) {
      setTimeout(() => {
        speakText(questions[currentIdx].question, { lang: "en-US", rate: 0.85 });
      }, 500);
    }
  }, [phase, currentIdx, quizType, questions]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Track latest state for interval closures
  const stateRef = useRef({ phase, currentIdx, questions });
  useEffect(() => {
    stateRef.current = { phase, currentIdx, questions };
  });

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    const initialTime = quizType === "fill_blank" ? 30 : 15;
    setTimer(initialTime);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleTimeout() {
    const { phase, currentIdx, questions } = stateRef.current;
    if (phase !== "playing") return;
    const q = questions[currentIdx];
    const timeSpent = Date.now() - questionStartTime.current;

    setIsCorrectAnswer(false);
    setSelectedAnswer("(Hết giờ)");
    playFeedbackTone("wrong");

    setAnswers((prev) => [...prev, {
      cardId: q.cardId,
      userAnswer: "(Hết giờ)",
      correctAnswer: q.correctAnswer,
      isCorrect: false,
      timeSpentMs: timeSpent,
      question: q.question,
    }]);
    setPhase("answered");
  }

  function handleSelectOption(optionText: string) {
    if (phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const q = questions[currentIdx];
    const isCorrect = q.options?.find((o) => o.text === optionText)?.isCorrect || false;
    const timeSpent = Date.now() - questionStartTime.current;

    setSelectedAnswer(optionText);
    setIsCorrectAnswer(isCorrect);
    playFeedbackTone(isCorrect ? "correct" : "wrong");

    setAnswers((prev) => [...prev, {
      cardId: q.cardId,
      userAnswer: optionText,
      correctAnswer: q.correctAnswer,
      isCorrect,
      timeSpentMs: timeSpent,
      question: q.question,
    }]);
    setPhase("answered");
  }

  function handleFillSubmit() {
    if (phase !== "playing" || !fillAnswer.trim()) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const q = questions[currentIdx];
    const timeSpent = Date.now() - questionStartTime.current;
    const userAns = fillAnswer.trim().toLowerCase();
    const correctAns = q.correctAnswer.trim().toLowerCase();
    const isCorrect = userAns === correctAns || correctAns.includes(userAns);

    setSelectedAnswer(fillAnswer);
    setIsCorrectAnswer(isCorrect);
    playFeedbackTone(isCorrect ? "correct" : "wrong");

    setAnswers((prev) => [...prev, {
      cardId: q.cardId,
      userAnswer: fillAnswer.trim(),
      correctAnswer: q.correctAnswer,
      isCorrect,
      timeSpentMs: timeSpent,
      question: q.question,
    }]);
    setPhase("answered");
  }

  function handleNext() {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      submitQuiz();
    } else {
      setCurrentIdx(nextIdx);
      setSelectedAnswer(null);
      setFillAnswer("");
      setIsCorrectAnswer(false);
      setPhase("playing");
      questionStartTime.current = Date.now();
      startTimer();
    }
  }

  async function submitQuiz() {
    setPhase("loading");
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScore(data.score);
      
      if (data.gamification) {
        window.dispatchEvent(
          new CustomEvent("gamificationUpdate", { detail: data.gamification })
        );
      }
      
      setPhase("results");
    } catch {
      setScore(answers.length > 0 ? Math.round((answers.filter((a) => a.isCorrect).length / answers.length) * 100) : 0);
      setPhase("results");
    }
  }

  const quizTypeLabels: Record<string, string> = {
    multiple_choice: "Trắc nghiệm",
    meaning_match: "Ghép nghĩa",
    fill_blank: "Điền từ",
    listening: "Nghe & Chọn",
  };

  // --- LOADING ---
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Đang tạo quiz...</p>
        </div>
      </div>
    );
  }

  // --- ERROR ---
  if (phase === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Lỗi</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <Link href={`/decks/${deckId}/quiz`} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors inline-block">
            Quay lại
          </Link>
        </div>
      </div>
    );
  }

  // --- RESULTS ---
  if (phase === "results") {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const wrongAnswers = answers.filter((a) => !a.isCorrect);

    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <div className="max-w-2xl mx-auto px-4 pt-8">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center mb-6">
            <div className="text-5xl mb-4">{score >= 80 ? "🎉" : score >= 50 ? "👍" : "💪"}</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Kết quả Quiz</h2>
            <p className="text-slate-500 mb-4">{quizTypeLabels[quizType] || quizType}</p>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
              <div className="text-5xl font-extrabold text-indigo-600 mb-1">{score}%</div>
              <div className="text-sm text-slate-500 mb-4">Điểm số</div>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
                  <div className="text-xs text-slate-500">Đúng</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-rose-600">{answers.length - correctCount}</div>
                  <div className="text-xs text-slate-500">Sai</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={loadQuiz} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors">
                Làm lại
              </button>
              <Link href={`/decks/${deckId}/quiz`} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2.5 px-6 rounded-xl transition-colors">
                Chọn quiz khác
              </Link>
              <Link href="/dashboard" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2.5 px-6 rounded-xl transition-colors">
                Dashboard
              </Link>
            </div>
          </div>

          {/* Wrong answers review */}
          {wrongAnswers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-rose-500">✗</span> Từ cần ôn lại ({wrongAnswers.length})
              </h3>
              <div className="space-y-3">
                {wrongAnswers.map((a, i) => (
                  <div key={i} className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900">{a.question}</p>
                        <p className="text-sm text-rose-600 mt-1">Bạn trả lời: {a.userAnswer}</p>
                        <p className="text-sm text-emerald-600 font-medium">Đáp án đúng: {a.correctAnswer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- PLAYING / ANSWERED ---
  const currentQ = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;
  const isFillType = currentQ.type === "fill_blank";
  const isListeningType = currentQ.type === "listening";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Link 
                href={`/decks/${deckId}/quiz`}
                className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                title="Thoát Quiz"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </Link>
              <span className="text-sm font-semibold text-slate-600 hidden sm:inline">
                {quizTypeLabels[quizType]} — Câu {currentIdx + 1}/{questions.length}
              </span>
              <span className="text-sm font-semibold text-slate-600 sm:hidden">
                Câu {currentIdx + 1}/{questions.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Timer */}
              <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                timer <= 5 ? "bg-red-50 text-red-600 animate-pulse" : "bg-slate-100 text-slate-600"
              }`}>
                ⏱ {timer}s
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8 pb-12">
        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 mb-6">
          {/* Listening: show speaker button */}
          {isListeningType ? (
            <div className="text-center">
              <button
                onClick={() => speakText(currentQ.question, { lang: "en-US", rate: 0.85 })}
                disabled={!speechSupported}
                className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4 hover:scale-110 transition-transform shadow-lg disabled:opacity-50"
              >
                🔊
              </button>
              <p className="text-slate-500 text-sm">Nhấn để nghe lại</p>
              {phase === "answered" && (
                <p className="mt-3 text-lg font-bold text-slate-900">{currentQ.question}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900 mb-2">{currentQ.question}</p>
              {currentQ.phonetic && <p className="text-slate-400 text-sm">{currentQ.phonetic}</p>}
              {currentQ.hint && phase === "playing" && (
                <p className="text-slate-400 text-xs mt-2">Gợi ý: {currentQ.hint}</p>
              )}
            </div>
          )}
        </div>

        {/* Answer Area */}
        {isFillType ? (
          /* Fill in the blank */
          <div className="space-y-3">
            {phase === "playing" && (
              <>
                <input
                  type="text"
                  value={fillAnswer}
                  onChange={(e) => setFillAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFillSubmit()}
                  placeholder="Nhập câu trả lời..."
                  className="w-full px-4 py-3.5 text-lg border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                  autoFocus
                />
                <button
                  onClick={handleFillSubmit}
                  disabled={!fillAnswer.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold py-3.5 rounded-xl transition-colors"
                >
                  Xác nhận
                </button>
              </>
            )}
            {phase === "answered" && (
              <div className={`p-4 rounded-xl border-2 ${isCorrectAnswer ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{isCorrectAnswer ? "✅" : "❌"}</span>
                  <span className={`font-bold ${isCorrectAnswer ? "text-emerald-700" : "text-rose-700"}`}>
                    {isCorrectAnswer ? "Chính xác!" : "Sai rồi!"}
                  </span>
                </div>
                {!isCorrectAnswer && (
                  <>
                    <p className="text-sm text-rose-600">Bạn trả lời: <span className="font-medium">{selectedAnswer}</span></p>
                    <p className="text-sm text-emerald-600 font-medium">Đáp án đúng: {currentQ.correctAnswer}</p>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Multiple choice options */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options?.map((option, idx) => {
              let btnClass = "bg-white border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-900";

              if (phase === "answered") {
                if (option.isCorrect) {
                  btnClass = "bg-emerald-50 border-2 border-emerald-400 text-emerald-900";
                } else if (selectedAnswer === option.text && !option.isCorrect) {
                  btnClass = "bg-rose-50 border-2 border-rose-400 text-rose-900";
                } else {
                  btnClass = "bg-slate-50 border-2 border-slate-100 text-slate-400";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(option.text)}
                  disabled={phase === "answered"}
                  className={`${btnClass} rounded-xl p-4 text-left font-medium transition-all disabled:cursor-default text-sm sm:text-base relative`}
                >
                  <span className="absolute top-2 right-3 text-xs opacity-40 font-mono">{idx + 1}</span>
                  {option.text}
                  {phase === "answered" && option.isCorrect && <span className="ml-2">✅</span>}
                  {phase === "answered" && selectedAnswer === option.text && !option.isCorrect && <span className="ml-2">❌</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Next button */}
        {phase === "answered" && (
          <button
            onClick={handleNext}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
          >
            {currentIdx + 1 >= questions.length ? "Xem kết quả" : "Câu tiếp theo →"}
          </button>
        )}
      </div>
    </div>
  );
}
