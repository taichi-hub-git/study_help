"use client";

import { useState } from "react";
import type { Difficulty, Quiz, QuizQuestion } from "@/lib/schemas";

type Mode = "home" | "taking" | "result";

interface AnswerResult {
  question: QuizQuestion;
  selectedIndex: number;
  correct: boolean;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "易しい" },
  { value: "medium", label: "中" },
  { value: "hard", label: "難しい" },
];

export default function QuizTab({
  pdfId,
  onJumpToPage,
}: {
  pdfId: string;
  onJumpToPage: (page: number) => void;
}) {
  const [mode, setMode] = useState<Mode>("home");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [isSubset, setIsSubset] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);

  const startQuiz = async (regenerate: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfId, difficulty, topic, regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "クイズの生成に失敗しました");
      const quiz = data.quiz as Quiz;
      setActiveQuestions(quiz.questions);
      setIsSubset(false);
      setCurrentIndex(0);
      setSelected(null);
      setResults([]);
      setMode("taking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "クイズの生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = activeQuestions[currentIndex] as QuizQuestion | undefined;

  const handleSelect = (idx: number) => {
    if (selected !== null || !currentQuestion) return;
    setSelected(idx);
    setResults((prev) => [
      ...prev,
      { question: currentQuestion, selectedIndex: idx, correct: idx === currentQuestion.answerIndex },
    ]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < activeQuestions.length) {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
    } else {
      setMode("result");
    }
  };

  const score = results.filter((r) => r.correct).length;
  const wrongResults = results.filter((r) => !r.correct);

  const retryWrong = () => {
    setActiveQuestions(wrongResults.map((r) => r.question));
    setIsSubset(true);
    setCurrentIndex(0);
    setSelected(null);
    setResults([]);
    setMode("taking");
  };

  const backToHome = () => {
    setMode("home");
    setActiveQuestions([]);
    setResults([]);
  };

  if (mode === "home") {
    return (
      <div className="flex h-full flex-col overflow-auto px-6 py-6">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          クイズ
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          難易度と出題範囲を指定して、4択クイズ（10問）を作成します。
        </p>

        <div className="mt-6 flex flex-col gap-4 max-w-md">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
              難易度
            </label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    difficulty === opt.value
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
              出題範囲・トピック（任意）
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: 第3章のみ、〇〇の定義を中心に"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={() => startQuiz(true)}
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "生成中..." : "クイズを作成"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "taking" && currentQuestion) {
    return (
      <div className="flex h-full flex-col overflow-auto px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {isSubset ? "間違えた問題の再挑戦" : "クイズ"} ・ {currentIndex + 1} / {activeQuestions.length}
          </span>
          <button
            onClick={backToHome}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            中断してホームへ
          </button>
        </div>

        <p className="mb-4 text-base font-medium text-zinc-800 dark:text-zinc-100">
          {currentQuestion.question}
        </p>

        <div className="flex flex-col gap-2">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selected === idx;
            const isAnswerIdx = idx === currentQuestion.answerIndex;
            let style =
              "border-zinc-300 hover:border-blue-400 dark:border-zinc-700";
            if (selected !== null) {
              if (isAnswerIdx) style = "border-green-500 bg-green-50 dark:bg-green-950/40";
              else if (isSelected) style = "border-red-500 bg-red-50 dark:bg-red-950/40";
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                className={`rounded-lg border px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-200 ${style}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p
              className={
                selected === currentQuestion.answerIndex
                  ? "font-medium text-green-700 dark:text-green-400"
                  : "font-medium text-red-700 dark:text-red-400"
              }
            >
              {selected === currentQuestion.answerIndex ? "正解！" : "不正解"}
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">
              {currentQuestion.explanation}
            </p>
            <button
              onClick={() => onJumpToPage(currentQuestion.sourcePage)}
              className="mt-2 text-blue-600 underline hover:no-underline dark:text-blue-400"
            >
              該当ページ（p.{currentQuestion.sourcePage}）を見る
            </button>
            <div className="mt-3">
              <button
                onClick={handleNext}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                {currentIndex + 1 < activeQuestions.length ? "次の問題" : "結果を見る"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // mode === "result"
  return (
    <div className="flex h-full flex-col overflow-auto px-6 py-6">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
        {isSubset ? "再挑戦の結果" : "採点結果"}
      </h2>
      <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {score} / {activeQuestions.length} 問正解
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {results.map((r, i) => (
          <li
            key={i}
            className={`rounded-lg border px-3 py-2 text-sm ${
              r.correct
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            }`}
          >
            <span className="text-zinc-500 dark:text-zinc-400">
              問{i + 1}・p.{r.question.sourcePage}・
            </span>
            <span className={r.correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
              {r.correct ? "正解" : "不正解"}
            </span>
            <span className="ml-2 text-zinc-700 dark:text-zinc-200">{r.question.question}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex gap-3">
        {!isSubset && wrongResults.length > 0 && (
          <button
            onClick={retryWrong}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            間違えた問題だけ再受験（{wrongResults.length}問）
          </button>
        )}
        <button
          onClick={backToHome}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  );
}
