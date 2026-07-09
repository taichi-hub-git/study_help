"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { FolderCramItem } from "@/lib/schemas";

interface PdfIndexEntry {
  pdfId: string;
  filename: string;
}

export default function FolderCramView({ folderId }: { folderId: string }) {
  const [items, setItems] = useState<FolderCramItem[] | null>(null);
  const [pdfIndex, setPdfIndex] = useState<PdfIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (regenerate: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/generate/folder-cram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId, regenerate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "テスト直前まとめの生成に失敗しました");
        setItems(data.items);
        setPdfIndex(data.pdfIndex);
      } catch (e) {
        setError(e instanceof Error ? e.message : "テスト直前まとめの生成に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [folderId]
  );

  useEffect(() => {
    (async () => {
      await generate(false);
    })();
  }, [generate]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          テスト直前
          {items && <span className="ml-2 font-normal text-zinc-400">全{items.length}項目</span>}
        </h2>
        <button
          onClick={() => generate(true)}
          disabled={loading}
          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          再生成
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <p className="mb-4 text-xs text-zinc-400">
          🔴 強調 = 元のPDFで赤字などの色付きで強調されていた内容 ・ 🤖 推測 = AIが試験に出やすいと判断した内容
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {!error && loading && !items && (
          <p className="text-sm text-zinc-400">テスト直前まとめを生成中...</p>
        )}
        {!error && items && items.length === 0 && (
          <p className="text-sm text-zinc-400">項目はありません。</p>
        )}

        {!error && items && items.length > 0 && (
          <ul className="flex flex-col gap-2">
            {items.map((item, i) => {
              const src = pdfIndex[item.sourcePdfIndex - 1];
              return (
                <li
                  key={i}
                  className={`rounded-lg border px-4 py-3 ${
                    item.basis === "emphasized"
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-zinc-800 dark:text-zinc-100">
                      <span className="mr-1">{item.basis === "emphasized" ? "🔴" : "🤖"}</span>
                      {item.point}
                    </p>
                    {src && (
                      <Link
                        href={`/pdf/${src.pdfId}?page=${item.sourcePage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
                      >
                        {src.filename} p.{item.sourcePage}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
