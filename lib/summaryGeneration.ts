import "server-only";
import { getGeminiClient, MODEL } from "@/lib/gemini";
import { getCachedGeneration, getPdfPages, saveGeneration } from "@/lib/generations";
import { pagesToSourceText, summarySystemPrompt, summaryUserPrompt } from "@/lib/prompts";
import { summaryGenParamsSchema } from "@/lib/schemas";
import { recordTokenUsage, usageFromMetadata } from "@/lib/tokenUsage";

/** Non-streaming summary generation, used for eager generation at upload
 * time (and as a fallback if that failed) — unlike the summary Route
 * Handler, which streams for a live tab view, this just needs the final
 * text to cache. Reuses the cache: a no-op if a summary already exists. */
export async function ensureSummary(pdfId: string): Promise<string> {
  const params = summaryGenParamsSchema.parse({});
  const cached = getCachedGeneration(pdfId, "summary", params);
  if (cached) return cached.content;

  const pages = getPdfPages(pdfId);
  const sourceText = pagesToSourceText(pages);
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: summaryUserPrompt(sourceText),
    config: { systemInstruction: summarySystemPrompt, maxOutputTokens: 4096 },
  });
  recordTokenUsage("summary", usageFromMetadata(response.usageMetadata));
  const text = response.text ?? "";
  saveGeneration(pdfId, "summary", params, text);
  return text;
}
