"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import MemorizeRunner from "@/components/memorize/MemorizeRunner";
import type { FolderMemorizeItem } from "@/lib/schemas";

interface PdfIndexEntry {
  pdfId: string;
  filename: string;
}

export default function FolderMemorizeView({ folderId }: { folderId: string }) {
  const [items, setItems] = useState<FolderMemorizeItem[] | null>(null);
  const [pdfIndex, setPdfIndex] = useState<PdfIndexEntry[]>([]);
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
        setPdfIndex(data.pdfIndex);
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
    <MemorizeRunner<FolderMemorizeItem>
      items={items}
      loading={loading}
      error={error}
      onRegenerate={() => generate(true)}
      title="フォルダ暗記"
      renderSource={(item) => {
        const src = pdfIndex[item.sourcePdfIndex - 1];
        if (!src) return null;
        return (
          <Link
            href={`/pdf/${src.pdfId}?page=${item.sourcePage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
          >
            {src.filename} p.{item.sourcePage}
          </Link>
        );
      }}
    />
  );
}
