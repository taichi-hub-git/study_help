import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { canonicalParams } from "@/lib/generations";
import { ensureSummary } from "@/lib/summaryGeneration";
import type { FolderFeature, FolderGenerationRecord, PdfRecord } from "@/lib/schemas";
import type { FolderPdfSummary } from "@/lib/prompts";

export function getCachedFolderGeneration(
  folderId: string,
  feature: FolderFeature,
  params: unknown
): FolderGenerationRecord | null {
  const key = canonicalParams(params);
  const row = db
    .prepare(
      "SELECT * FROM folder_generations WHERE folderId = ? AND feature = ? AND params = ? ORDER BY createdAt DESC LIMIT 1"
    )
    .get(folderId, feature, key) as FolderGenerationRecord | undefined;
  return row ?? null;
}

export function saveFolderGeneration(
  folderId: string,
  feature: FolderFeature,
  params: unknown,
  content: string
): FolderGenerationRecord {
  const record: FolderGenerationRecord = {
    id: randomUUID(),
    folderId,
    feature,
    params: canonicalParams(params),
    content,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO folder_generations (id, folderId, feature, params, content, createdAt) VALUES (@id, @folderId, @feature, @params, @content, @createdAt)"
  ).run(record);
  return record;
}

export function getFolderPdfs(folderId: string): PdfRecord[] {
  return db
    .prepare("SELECT * FROM pdfs WHERE folderId = ? ORDER BY uploadedAt ASC")
    .all(folderId) as PdfRecord[];
}

/** Loads every PDF in the folder along with its summary (generating it if
 * somehow still missing), in the same order used to build the prompt —
 * callers must use this order to map a model-returned `sourcePdfIndex` back
 * to a real pdfId. Used by folder-quiz, the one folder feature that still
 * makes a single combined call across all PDFs. A PDF whose summary fails to
 * generate (e.g. rate limit) is skipped rather than failing the whole
 * request — its filename comes back in `failedFilenames`. */
export async function getFolderPdfSummaries(
  folderId: string
): Promise<{ summaries: (FolderPdfSummary & { pdfId: string })[]; failedFilenames: string[] }> {
  const pdfs = getFolderPdfs(folderId);
  // Sequential, not Promise.all: several PDFs missing a summary at once would
  // otherwise fire that many concurrent Gemini calls, which is an easy way
  // to trip the (quite low) per-minute rate limit on the free tier.
  const summaries: (FolderPdfSummary & { pdfId: string })[] = [];
  const failedFilenames: string[] = [];
  for (const pdf of pdfs) {
    try {
      summaries.push({ pdfId: pdf.id, filename: pdf.filename, summary: await ensureSummary(pdf.id) });
    } catch (e) {
      console.error(`summary generation failed for pdf ${pdf.id}`, e);
      failedFilenames.push(pdf.filename);
    }
  }
  return { summaries, failedFilenames };
}
