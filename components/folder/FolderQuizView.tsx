"use client";

import { useState } from "react";
import Link from "next/link";
import QuizRunner from "@/components/quiz/QuizRunner";
import type { Difficulty, FolderQuiz, FolderQuizQuestion } from "@/lib/schemas";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "易しい" },
  { value: "medium", label: "中" },
  { value: "hard", label: "難しい" },
];

interface PdfIndexEntry {
  pdfId: string;
  filename: string;
}

export default function FolderQuizView({ folderId }: { folderId: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<FolderQuiz | null>(null);
  const [pdfIndex, setPdfIndex] = useState<PdfIndexEntry[]>([]);
  const [failedFilenames, setFailedFilenames] = useState<string[]>([]);
  const [runId, setRunId] = useState(0);

  const startQuiz = async (regenerate: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/folder-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, difficulty, topic, questionCount, regenerate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "クイズの生成に失敗しました");
      setQuiz(data.quiz as FolderQuiz);
      setPdfIndex(data.pdfIndex as PdfIndexEntry[]);
      setFailedFilenames(data.failedFilenames ?? []);
      setRunId((id) => id + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "クイズの生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (quiz) {
    return (
      <QuizRunner<FolderQuizQuestion>
        key={runId}
        questions={quiz.questions}
        onExit={() => setQuiz(null)}
        label="フォルダテスト"
        renderSource={(q) => {
          const src = pdfIndex[q.sourcePdfIndex - 1];
          if (!src) return null;
          return (
            <Link
              href={`/pdf/${src.pdfId}${q.sourcePage ? `?page=${q.sourcePage}` : ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:no-underline dark:text-blue-400"
            >
              該当資料（{src.filename}
              {q.sourcePage ? ` p.${q.sourcePage}` : ""}）を見る
            </Link>
          );
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto px-6 py-6">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
        フォルダテスト
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        フォルダ内のすべてのPDFを横断して、4択クイズを作成します。
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
            問題数
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setQuestionCount(Number.isNaN(n) ? 10 : Math.min(Math.max(n, 1), 50));
            }}
            className="w-24 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
            出題範囲・トピック（任意）
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例: 〇〇の定義を中心に"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {!error && failedFilenames.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            {failedFilenames.join("、")} の要約生成に失敗したため、前回のテストではこれらのPDFの内容が含まれていません。
          </div>
        )}

        <button
          onClick={() => startQuiz(true)}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "生成中..." : "テストを作成"}
        </button>
      </div>
    </div>
  );
}
