"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Pane from "@/components/Pane";
import type { PdfRecord } from "@/lib/schemas";

export default function PdfPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pdfId = params.id;
  const pageParam = searchParams.get("page");
  const initialJumpPage = pageParam ? parseInt(pageParam, 10) : undefined;

  const [pdfs, setPdfs] = useState<PdfRecord[] | null>(null);
  const [dualPane, setDualPane] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch("/api/pdfs")
      .then((res) => res.json())
      .then((data) => setPdfs(data.pdfs));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/pdfs/${pdfId}`).then((res) => {
      if (!cancelled) setNotFound(!res.ok);
    });
    return () => {
      cancelled = true;
    };
  }, [pdfId]);

  const currentPdf = pdfs?.find((p) => p.id === pdfId);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500">指定されたPDFが見つかりませんでした。</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <Link
          href="/"
          className="shrink-0 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← 一覧
        </Link>

        <select
          value={pdfId}
          onChange={(e) => router.push(`/pdf/${e.target.value}`)}
          className="min-w-0 flex-1 truncate rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {!currentPdf && pdfId && <option value={pdfId}>読み込み中...</option>}
          {pdfs?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.filename}
            </option>
          ))}
        </select>

        <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={dualPane}
            onChange={(e) => setDualPane(e.target.checked)}
          />
          2画面
        </label>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {dualPane ? (
          <>
            <div className="flex w-1/2 flex-col border-r border-zinc-200 dark:border-zinc-800">
              <Pane
                key={`${pdfId}-left`}
                pdfId={pdfId}
                initialTab="pdf"
                initialJumpPage={initialJumpPage}
              />
            </div>
            <div className="flex w-1/2 flex-col">
              <Pane key={`${pdfId}-right`} pdfId={pdfId} initialTab="quiz" />
            </div>
          </>
        ) : (
          <Pane
            key={pdfId}
            pdfId={pdfId}
            initialTab="pdf"
            initialJumpPage={initialJumpPage}
          />
        )}
      </main>
    </div>
  );
}
