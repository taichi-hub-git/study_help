"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MemorizeRunner from "@/components/memorize/MemorizeRunner";
import type { AggregatedMemorizeCandidateItem } from "@/lib/schemas";

export default function FolderMemorizeView({ folderId }: { folderId: string }) {
  const [items, setItems] = useState<AggregatedMemorizeCandidateItem[] | null>(null);
  const [failedFilenames, setFailedFilenames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (regenerate: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/generate/folder-memorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId, regenerate }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "暗記項目の生成に失敗しました");
        setItems(data.items);
        setFailedFilenames(data.failedFilenames ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "暗記項目の生成に失敗しました");
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
    <MemorizeRunner<AggregatedMemorizeCandidateItem>
      items={items}
      loading={loading}
      error={error}
      warning={
        failedFilenames.length > 0
          ? `${failedFilenames.join("、")} の生成に失敗しました。他のPDFの結果は表示しています。「再生成」で再試行できます。`
          : undefined
      }
      onRegenerate={() => generate(true)}
      title="フォルダ暗記"
      renderSource={(item) => (
        <Link
          href={`/pdf/${item.pdfId}${item.sourcePage ? `?page=${item.sourcePage}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
        >
          {item.filename}
          {item.sourcePage ? ` p.${item.sourcePage}` : ""}
        </Link>
      )}
    />
  );
}
