"use client";

import { useEffect, useState } from "react";

export default function TokenUsageBadge() {
  const [totalTokens, setTotalTokens] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setTotalTokens(data.totalTokens);
      } catch {
        // ignore transient fetch failures; next poll will retry
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (totalTokens === null) return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-400">
      使用トークン数: {totalTokens.toLocaleString("ja-JP")}
    </div>
  );
}
