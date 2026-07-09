"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";

const transformer = new Transformer();

export default function MindmapTab({ pdfId }: { pdfId: string }) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const markmapRef = useRef<Markmap | null>(null);

  const generate = useCallback(
    async (regenerate: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/generate/mindmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfId, regenerate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "マインドマップの生成に失敗しました");
        setMarkdown(data.markdown);
      } catch (e) {
        setError(e instanceof Error ? e.message : "マインドマップの生成に失敗しました");
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

  useEffect(() => {
    if (!markdown || !svgRef.current) return;
    const { root } = transformer.transform(markdown);
    if (!markmapRef.current) {
      markmapRef.current = Markmap.create(svgRef.current, { duration: 300 });
    }
    markmapRef.current.setData(root).then(() => markmapRef.current?.fit());
  }, [markdown]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          マインドマップ
        </h2>
        <button
          onClick={() => generate(true)}
          disabled={loading}
          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          再生成
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error && (
          <div className="absolute left-4 right-4 top-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
        {!error && loading && !markdown && (
          <p className="p-6 text-sm text-zinc-400">マインドマップを生成中...</p>
        )}
        {!error && !markdown && !loading && (
          <p className="p-6 text-sm text-zinc-400">マインドマップはまだありません。</p>
        )}
        <svg ref={svgRef} className="h-full w-full" />
      </div>
    </div>
  );
}
