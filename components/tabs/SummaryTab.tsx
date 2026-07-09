"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function SummaryTab({ pdfId }: { pdfId: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const generate = useCallback(
    async (regenerate: boolean) => {
      const myRequestId = ++requestId.current;
      setLoading(true);
      setError(null);
      if (regenerate) setContent("");

      try {
        const res = await fetch("/api/generate/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfId, regenerate }),
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          if (requestId.current !== myRequestId) return;
          if (!res.ok) throw new Error(data.error ?? "要約の生成に失敗しました");
          setContent(data.content);
        } else {
          if (!res.ok || !res.body) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "要約の生成に失敗しました");
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let acc = "";
          let buffer = "";
          let streamError: string | null = null;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (requestId.current !== myRequestId) return;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line) continue;
              const event = JSON.parse(line) as
                | { type: "delta"; text: string }
                | { type: "error"; message: string }
                | { type: "done" };
              if (event.type === "delta") {
                acc += event.text;
                setContent(acc);
              } else if (event.type === "error") {
                streamError = event.message;
              }
            }
          }
          if (streamError) throw new Error(streamError);
        }
      } catch (e) {
        if (requestId.current === myRequestId) {
          setError(e instanceof Error ? e.message : "要約の生成に失敗しました");
        }
      } finally {
        if (requestId.current === myRequestId) setLoading(false);
      }
    },
    [pdfId]
  );

  useEffect(() => {
    (async () => {
      await generate(false);
    })();
  }, [generate]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">要約</h2>
        <button
          onClick={() => generate(true)}
          disabled={loading}
          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          再生成
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {!error && !content && loading && (
          <p className="text-sm text-zinc-400">要約を生成中...</p>
        )}
        {!error && !content && !loading && (
          <p className="text-sm text-zinc-400">要約はまだありません。</p>
        )}
        {content && (
          <article className="prose prose-zinc max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
