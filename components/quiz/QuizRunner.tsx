"use client";

import { useState, type ReactNode } from "react";

export interface BaseQuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface AnswerResult<Q> {
  question: Q;
  selectedIndex: number;
  correct: boolean;
}

type Mode = "taking" | "result";

/** Shared quiz-taking + scoring + retry-wrong flow, reused by the per-PDF
 * quiz tab and the folder-wide quiz — those differ only in how a question's
 * source is generated/rendered, so that's passed in as a render prop.
 * Give this a `key` that changes with each newly generated question set so
 * a fresh quiz always starts from a clean run. */
export default function QuizRunner<Q extends BaseQuizQuestion>({
  questions,
  onExit,
  renderSource,
  label = "クイズ",
}: {
  questions: Q[];
  onExit: () => void;
  renderSource: (question: Q) => ReactNode;
  label?: string;
}) {
  const [mode, setMode] = useState<Mode>("taking");
  const [activeQuestions, setActiveQuestions] = useState<Q[]>(questions);
  const [isSubset, setIsSubset] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<AnswerResult<Q>[]>([]);

  const currentQuestion = activeQuestions[currentIndex] as Q | undefined;

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

  if (mode === "taking" && currentQuestion) {
    return (
      <div className="flex h-full flex-col overflow-auto px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {isSubset ? "間違えた問題の再挑戦" : label} ・ {currentIndex + 1} / {activeQuestions.length}
          </span>
          <button
            onClick={onExit}
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
            let style = "border-zinc-300 hover:border-blue-400 dark:border-zinc-700";
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
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">{currentQuestion.explanation}</p>
            <div className="mt-2">{renderSource(currentQuestion)}</div>
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
            <span className={r.correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
              問{i + 1}・{r.correct ? "正解" : "不正解"}
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
          onClick={onExit}
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  );
}
