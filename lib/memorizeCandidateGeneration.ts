import "server-only";
import { generateValidatedJson } from "@/lib/generateJson";
import { getCachedGeneration, getPdfPages, saveGeneration } from "@/lib/generations";
import { ensureSummary } from "@/lib/summaryGeneration";
import {
  memorizeCandidateSystemPrompt,
  memorizeCandidateUserPrompt,
  pagesToEmphasizedSpansText,
} from "@/lib/prompts";
import {
  memorizeCandidateGenParamsSchema,
  memorizeCandidateResultSchema,
  type MemorizeCandidateItem,
} from "@/lib/schemas";

/** Generates (or returns the cached) per-PDF memorize candidates, built from
 * that PDF's summary + its own emphasized-text spans rather than raw full
 * text. Shared by the folder-wide 暗記 aggregator — a folder view never
 * needs its own AI call, it just reads/fills these per PDF. */
export async function ensureMemorizeCandidates(
  pdfId: string,
  regenerate = false
): Promise<MemorizeCandidateItem[]> {
  const params = memorizeCandidateGenParamsSchema.parse({});

  if (!regenerate) {
    const cached = getCachedGeneration(pdfId, "memorizeCandidates", params);
    if (cached) {
      return (JSON.parse(cached.content) as { items: MemorizeCandidateItem[] }).items;
    }
  }

  const summaryText = await ensureSummary(pdfId);
  const emphasizedSpansText = pagesToEmphasizedSpansText(getPdfPages(pdfId));

  const result = await generateValidatedJson(
    "memorizeCandidates",
    memorizeCandidateResultSchema,
    memorizeCandidateSystemPrompt(),
    memorizeCandidateUserPrompt(summaryText, emphasizedSpansText)
  );
  saveGeneration(pdfId, "memorizeCandidates", params, JSON.stringify(result));
  return result.items;
}
