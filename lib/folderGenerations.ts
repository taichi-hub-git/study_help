import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { canonicalParams } from "@/lib/generations";
import type { FolderFeature, FolderGenerationRecord, PdfRecord } from "@/lib/schemas";
import type { FolderPdfSource } from "@/lib/prompts";

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

/** Loads every PDF in the folder along with its page text, in the same
 * order used to build the prompt — callers must use this order to map a
 * model-returned `sourcePdfIndex` back to a real pdfId. */
export function getFolderPdfSources(folderId: string): (FolderPdfSource & { pdfId: string })[] {
  const pdfs = getFolderPdfs(folderId);
  const getPages = db.prepare("SELECT * FROM pdf_pages WHERE pdfId = ? ORDER BY pageNumber ASC");
  return pdfs.map((pdf) => ({
    pdfId: pdf.id,
    filename: pdf.filename,
    pages: getPages.all(pdf.id) as FolderPdfSource["pages"],
  }));
}
