import "server-only";
import { generateValidatedJson } from "@/lib/generateJson";
import { getCachedGeneration, getPdfPages, saveGeneration } from "@/lib/generations";
import { ensureSummary } from "@/lib/summaryGeneration";
import { cramSystemPrompt, cramUserPrompt, pagesToEmphasizedSpansText } from "@/lib/prompts";
import { cramGenParamsSchema, cramResultSchema, type CramItem } from "@/lib/schemas";

/** Generates (or returns the cached) per-PDF cram items, built from that
 * PDF's summary + its own emphasized-text spans rather than raw full text.
 * Shared by the per-PDF cram route and the folder-wide cram aggregator, so
 * a folder view never needs its own AI call — it just reads/fills these. */
export async function ensureCram(pdfId: string, regenerate = false): Promise<CramItem[]> {
  const params = cramGenParamsSchema.parse({});

  if (!regenerate) {
    const cached = getCachedGeneration(pdfId, "cram", params);
    if (cached) return (JSON.parse(cached.content) as { items: CramItem[] }).items;
  }

  const summaryText = await ensureSummary(pdfId);
  const emphasizedSpansText = pagesToEmphasizedSpansText(getPdfPages(pdfId));

  const result = await generateValidatedJson(
    "cram",
    cramResultSchema,
    cramSystemPrompt(),
    cramUserPrompt(summaryText, emphasizedSpansText)
  );
  saveGeneration(pdfId, "cram", params, JSON.stringify(result));
  return result.items;
}
