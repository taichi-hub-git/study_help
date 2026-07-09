"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PdfRecord } from "@/lib/schemas";

export default function Home() {
  const [pdfs, setPdfs] = useState<PdfRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPdfs = useCallback(async () => {
    try {
      const res = await fetch("/api/pdfs");
      if (!res.ok) throw new Error("一覧の取得に失敗しました");
      const data = await res.json();
      setPdfs(data.pdfs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadPdfs();
    })();
  }, [loadPdfs]);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/pdfs", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
        await loadPdfs();
      } catch (e) {
        setError(e instanceof Error ? e.message : "アップロードに失敗しました");
      } finally {
        setUploading(false);
      }
    },
    [loadPdfs]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            テスト対策アプリ
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            講義PDFをアップロードして、要約・クイズ・フラッシュカード・マインドマップ・暗記で学習できます。
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              アップロード中・テキスト抽出中...
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                PDFをドラッグ&ドロップ、またはクリックして選択
              </p>
              <p className="text-xs text-zinc-400">.pdf ファイルのみ</p>
            </>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            アップロード済みPDF
          </h2>
          {pdfs === null ? (
            <p className="text-sm text-zinc-400">読み込み中...</p>
          ) : pdfs.length === 0 ? (
            <p className="text-sm text-zinc-400">
              まだPDFがアップロードされていません。
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pdfs.map((pdf) => (
                <li key={pdf.id}>
                  <Link
                    href={`/pdf/${pdf.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <span className="truncate font-medium text-zinc-800 dark:text-zinc-100">
                      {pdf.filename}
                    </span>
                    <span className="ml-4 shrink-0 text-xs text-zinc-400">
                      {pdf.pageCount}ページ ・{" "}
                      {new Date(pdf.uploadedAt).toLocaleDateString("ja-JP")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
