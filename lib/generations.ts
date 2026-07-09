import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Feature, GenerationRecord, PdfPageRecord } from "@/lib/schemas";

function canonicalParams(params: unknown): string {
  return JSON.stringify(params, Object.keys(params as object).sort());
}

export function getCachedGeneration(
  pdfId: string,
  feature: Feature,
  params: unknown
): GenerationRecord | null {
  const key = canonicalParams(params);
  const row = db
    .prepare(
      "SELECT * FROM generations WHERE pdfId = ? AND feature = ? AND params = ? ORDER BY createdAt DESC LIMIT 1"
    )
    .get(pdfId, feature, key) as GenerationRecord | undefined;
  return row ?? null;
}

export function saveGeneration(
  pdfId: string,
  feature: Feature,
  params: unknown,
  content: string
): GenerationRecord {
  const record: GenerationRecord = {
    id: randomUUID(),
    pdfId,
    feature,
    params: canonicalParams(params),
    content,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    "INSERT INTO generations (id, pdfId, feature, params, content, createdAt) VALUES (@id, @pdfId, @feature, @params, @content, @createdAt)"
  ).run(record);
  return record;
}

export function getPdfPages(pdfId: string): PdfPageRecord[] {
  return db
    .prepare("SELECT * FROM pdf_pages WHERE pdfId = ? ORDER BY pageNumber ASC")
    .all(pdfId) as PdfPageRecord[];
}
