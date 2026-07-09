"use client";

import "@/lib/pdfWorkerClient";
import { useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { JumpRequest } from "@/lib/types";

export default function PdfViewerTab({
  pdfId,
  jumpRequest,
}: {
  pdfId: string;
  jumpRequest: JumpRequest | null;
}) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Adjust displayed page state in response to a new jump request during
  // render, rather than in an effect, so it's reflected in this same commit.
  const [handledNonce, setHandledNonce] = useState(jumpRequest?.nonce);
  if (jumpRequest && jumpRequest.nonce !== handledNonce) {
    setHandledNonce(jumpRequest.nonce);
    setCurrentPage(jumpRequest.page);
    setPageInput(String(jumpRequest.page));
  }

  // Scrolling to the jumped-to page is a genuine DOM side effect, so it
  // belongs in an effect (unlike the state adjustment above).
  useEffect(() => {
    if (!jumpRequest) return;
    pageRefs.current[jumpRequest.page - 1]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpRequest?.nonce]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.min(w - 32, 900));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Track which page is most visible while the user scrolls, so the page
  // indicator stays in sync without requiring explicit navigation.
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !numPages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { page: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const page = Number((entry.target as HTMLElement).dataset.page);
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { page, ratio: entry.intersectionRatio };
          }
        }
        if (best) {
          setCurrentPage(best.page);
          setPageInput(String(best.page));
        }
      },
      { root, threshold: [0.1, 0.25, 0.5, 0.75, 1] }
    );
    for (const el of pageRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [numPages]);

  const scrollToPage = (page: number) => {
    if (!numPages) return;
    const clamped = Math.min(Math.max(page, 1), numPages);
    pageRefs.current[clamped - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentPage(clamped);
    setPageInput(String(clamped));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => scrollToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          前へ
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseInt(pageInput, 10);
            if (!Number.isNaN(n)) scrollToPage(n);
          }}
          className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-300"
        >
          <input
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-12 rounded border border-zinc-300 bg-white px-1 py-0.5 text-center dark:border-zinc-700 dark:bg-zinc-800"
          />
          <span>/ {numPages ?? "-"}</span>
        </form>
        <button
          onClick={() => scrollToPage(currentPage + 1)}
          disabled={!numPages || currentPage >= numPages}
          className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          次へ
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 flex-col items-center gap-4 overflow-y-auto bg-zinc-100 p-4 dark:bg-zinc-950"
      >
        {error ? (
          <p className="self-start text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <Document
            file={`/api/pdfs/${pdfId}/file`}
            onLoadSuccess={({ numPages }) => {
              pageRefs.current = new Array(numPages).fill(null);
              setNumPages(numPages);
            }}
            onLoadError={() => setError("PDFの表示に失敗しました。")}
            loading={<p className="text-sm text-zinc-400">読み込み中...</p>}
          >
            {numPages &&
              Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <div key={page} data-page={page} ref={(el) => { pageRefs.current[page - 1] = el; }}>
                  <Page pageNumber={page} width={width} />
                </div>
              ))}
          </Document>
        )}
      </div>
    </div>
  );
}
