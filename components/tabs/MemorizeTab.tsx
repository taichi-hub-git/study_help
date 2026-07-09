"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemorizeItem } from "@/lib/schemas";

type ViewMode = "list" | "flashcard";

export default function MemorizeTab({
  pdfId,
  onJumpToPage,
}: {
  pdfId: string;
  onJumpToPage: (page: number) => void;
}) {
  const [items, setItems] = useState<MemorizeItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const generate = useCallback(
    async (regenerate: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/generate/memorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfId, regenerate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "暗記項目の生成に失敗しました");
        setItems(data.items);
        setCurrentIndex(0);
        setFlipped(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "暗記項目の生成に失敗しました");
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

  const goTo = (delta: number) => {
    if (!items) return;
    setFlipped(false);
    setCurrentIndex((i) => Math.min(Math.max(i + delta, 0), items.length - 1));
  };

  const currentItem = items?.[currentIndex];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          暗記
          {items && <span className="ml-2 font-normal text-zinc-400">全{items.length}項目</span>}
        </h2>
        <div className="flex items-center gap-3">
          {items && items.length > 0 && (
            <div className="flex overflow-hidden rounded border border-zinc-300 dark:border-zinc-700">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 text-xs font-medium ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                箇条書き
              </button>
              <button
                onClick={() => setViewMode("flashcard")}
                className={`px-3 py-1 text-xs font-medium ${
                  viewMode === "flashcard"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                フラッシュカード
              </button>
            </div>
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

      <div className="flex-1 overflow-auto px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {!error && loading && !items && (
          <p className="text-sm text-zinc-400">暗記項目を生成中...</p>
        )}
        {!error && items && items.length === 0 && (
          <p className="text-sm text-zinc-400">暗記項目はありません。</p>
        )}

        {!error && items && items.length > 0 && viewMode === "list" && (
          <ul className="flex flex-col gap-2">
            {items.map((item, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {item.term}
                  </span>
                  <button
                    onClick={() => onJumpToPage(item.sourcePage)}
                    className="shrink-0 text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
                  >
                    p.{item.sourcePage}
                  </button>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        )}

        {!error && currentItem && viewMode === "flashcard" && (
          <div className="flex flex-col items-center justify-center">
            <button
              onClick={() => setFlipped((f) => !f)}
              className="flex h-56 w-full max-w-lg items-center justify-center rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-lg text-zinc-800 dark:text-zinc-100">
                {flipped ? currentItem.description : currentItem.term}
              </p>
            </button>
            <p className="mt-2 text-xs text-zinc-400">
              クリックで{flipped ? "用語" : "説明"}を表示
            </p>
            <button
              onClick={() => onJumpToPage(currentItem.sourcePage)}
              className="mt-2 text-sm text-blue-600 underline hover:no-underline dark:text-blue-400"
            >
              該当ページ（p.{currentItem.sourcePage}）を見る
            </button>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => goTo(-1)}
                disabled={currentIndex <= 0}
                className="rounded px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                前へ
              </button>
              <button
                onClick={() => goTo(1)}
                disabled={!items || currentIndex >= items.length - 1}
                className="rounded px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                次へ
              </button>
            </div>
            <p className="mt-4 text-xs text-zinc-400">
              {currentIndex + 1} / {items?.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
