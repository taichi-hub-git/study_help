import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Feature } from "@/lib/schemas";

export interface UsageInfo {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/** Reads token usage off a Gemini `GenerateContentResponse.usageMetadata`. */
export function usageFromMetadata(usageMetadata?: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}): UsageInfo | null {
  if (!usageMetadata) return null;
  const promptTokens = usageMetadata.promptTokenCount ?? 0;
  const outputTokens = usageMetadata.candidatesTokenCount ?? 0;
  const totalTokens = usageMetadata.totalTokenCount ?? promptTokens + outputTokens;
  return { promptTokens, outputTokens, totalTokens };
}

export function recordTokenUsage(feature: Feature, usage: UsageInfo | null): void {
  if (!usage) return;
  db.prepare(
    "INSERT INTO token_usage (id, feature, promptTokens, outputTokens, totalTokens, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(randomUUID(), feature, usage.promptTokens, usage.outputTokens, usage.totalTokens, new Date().toISOString());
}

export function getTotalTokenUsage(): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(totalTokens), 0) as total FROM token_usage")
    .get() as { total: number };
  return row.total;
}
