"use client";

import { useCallback, useEffect, useState } from "react";
import MemorizeRunner from "@/components/memorize/MemorizeRunner";
import type { MemorizeItem } from "@/lib/schemas";

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

  return (
    <MemorizeRunner<MemorizeItem>
      items={items}
      loading={loading}
      error={error}
      onRegenerate={() => generate(true)}
      renderSource={(item) => (
        <button
          onClick={() => onJumpToPage(item.sourcePage)}
          className="text-xs text-blue-600 underline hover:no-underline dark:text-blue-400"
        >
          p.{item.sourcePage}
        </button>
      )}
    />
  );
}
