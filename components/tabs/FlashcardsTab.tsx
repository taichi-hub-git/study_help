"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Flashcard } from "@/lib/schemas";

type Classification = "known" | "unknown";

export default function FlashcardsTab({
  pdfId,
  onJumpToPage,
}: {
  pdfId: string;
  onJumpToPage: (page: number) => void;
}) {
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classification, setClassification] = useState<Record<number, Classification>>({});
  const [currentPos, setCurrentPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showUnknownOnly, setShowUnknownOnly] = useState(false);

  const generate = useCallback(
    async (regenerate: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/generate/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfId, regenerate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "フラッシュカードの生成に失敗しました");
        setCards(data.flashcards.cards);
        setClassification({});
        setCurrentPos(0);
        setFlipped(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "フラッシュカードの生成に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [pdfId]
  );

  useEffect(() => {
    (async () => {
      await generate(false);
    })();
  }, [generate]);

  const visibleIndices = useMemo(() => {
    if (!cards) return [];
    return cards
      .map((_, i) => i)
      .filter((i) => !showUnknownOnly || classification[i] !== "known");
  }, [cards, classification, showUnknownOnly]);

  const pos = Math.min(currentPos, Math.max(visibleIndices.length - 1, 0));
  const cardIndex = visibleIndices[pos];
  const card = cardIndex !== undefined ? cards?.[cardIndex] : undefined;

  const knownCount = Object.values(classification).filter((c) => c === "known").length;
  const unknownCount = Object.values(classification).filter((c) => c === "unknown").length;
  const total = cards?.length ?? 0;

  const mark = (c: Classification) => {
    if (cardIndex === undefined) return;
    setClassification((prev) => ({ ...prev, [cardIndex]: c }));
    setFlipped(false);
    setCurrentPos((p) => Math.min(p + 1, Math.max(visibleIndices.length - 1, 0)));
  };

  const goTo = (delta: number) => {
    setFlipped(false);
    setCurrentPos((p) => Math.min(Math.max(p + delta, 0), Math.max(visibleIndices.length - 1, 0)));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          フラッシュカード
          {total > 0 && (
            <span className="ml-2 font-normal text-zinc-400">
              わかる {knownCount} ・ わからない {unknownCount} ・ 全{total}枚
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <label className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={showUnknownOnly}
                onChange={(e) => {
                  setShowUnknownOnly(e.target.checked);
                  setCurrentPos(0);
                  setFlipped(false);
                }}
              />
              わからないだけ表示
            </label>
          )}
          <button
            onClick={() => generate(true)}
            disabled={loading}
            className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            再生成
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-auto px-6 py-6">
        {error && (
          <div className="mb-4 w-full max-w-lg rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {!error && loading && !cards && (
          <p className="text-sm text-zinc-400">フラッシュカードを生成中...</p>
        )}
        {!error && cards && visibleIndices.length === 0 && (
          <p className="text-sm text-zinc-400">表示できるカードがありません。</p>
        )}
        {!error && card && (
          <>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="flex h-56 w-full max-w-lg items-center justify-center rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-lg text-zinc-800 dark:text-zinc-100">
                {flipped ? card.back : card.front}
              </p>
            </button>
            <p className="mt-2 text-xs text-zinc-400">クリックで{flipped ? "表" : "裏"}を表示</p>

            <button
              onClick={() => onJumpToPage(card.sourcePage)}
              className="mt-2 text-sm text-blue-600 underline hover:no-underline dark:text-blue-400"
            >
              該当ページ（p.{card.sourcePage}）を見る
            </button>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => goTo(-1)}
                disabled={pos <= 0}
                className="rounded px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                前へ
              </button>
              <button
                onClick={() => mark("unknown")}
                className="rounded bg-red-100 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300"
              >
                わからない
              </button>
              <button
                onClick={() => mark("known")}
                className="rounded bg-green-100 px-4 py-1.5 text-sm font-medium text-green-700 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-300"
              >
                わかる
              </button>
              <button
                onClick={() => goTo(1)}
                disabled={pos >= visibleIndices.length - 1}
                className="rounded px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                次へ
              </button>
            </div>

            <p className="mt-4 text-xs text-zinc-400">
              {pos + 1} / {visibleIndices.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
