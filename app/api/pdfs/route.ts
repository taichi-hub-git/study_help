import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { db, PDFS_DIR } from "@/lib/db";
import { extractPdfPages } from "@/lib/pdf";
import { ensureSummary } from "@/lib/summaryGeneration";
import type { PdfRecord } from "@/lib/schemas";

export async function GET() {
  const pdfs = db
    .prepare("SELECT * FROM pdfs ORDER BY uploadedAt DESC")
    .all() as PdfRecord[];
  return NextResponse.json({ pdfs });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const folderIdRaw = formData.get("folderId");
  const folderId = typeof folderIdRaw === "string" && folderIdRaw ? folderIdRaw : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "PDFファイルのみアップロードできます" }, { status: 400 });
  }
  if (folderId && !db.prepare("SELECT id FROM folders WHERE id = ?").get(folderId)) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const id = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  const filepath = path.join(PDFS_DIR, `${id}.pdf`);

  let pages;
  try {
    pages = await extractPdfPages(new Uint8Array(buffer));
  } catch (e) {
    console.error("PDF extraction failed", e);
    return NextResponse.json(
      { error: "PDFの読み込みに失敗しました。ファイルが破損している可能性があります。" },
      { status: 400 }
    );
  }

  await fs.writeFile(filepath, buffer);

  const uploadedAt = new Date().toISOString();
  const insertPdf = db.prepare(
    "INSERT INTO pdfs (id, filename, filepath, uploadedAt, pageCount, folderId) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertPage = db.prepare(
    "INSERT INTO pdf_pages (id, pdfId, pageNumber, text, emphasizedText) VALUES (?, ?, ?, ?, ?)"
  );

  const tx = db.transaction(() => {
    insertPdf.run(id, file.name, filepath, uploadedAt, pages.length, folderId);
    for (const page of pages) {
      insertPage.run(randomUUID(), id, page.pageNumber, page.text, page.emphasizedText);
    }
  });
  tx();

  // Summary is mandatory groundwork for the folder-wide "テスト直前" feature
  // (which reuses it instead of re-sending raw PDF text), so it's generated
  // eagerly here rather than lazily on first tab view. A failure here (e.g.
  // rate limit) shouldn't fail the upload — the summary tab's own lazy
  // generation, and the per-PDF cram step, both fall back to generating it
  // on demand if it's still missing later.
  try {
    await ensureSummary(id);
  } catch (e) {
    console.error("Eager summary generation failed", e);
  }

  const record: PdfRecord = {
    id,
    filename: file.name,
    filepath,
    uploadedAt,
    pageCount: pages.length,
    folderId,
  };
  return NextResponse.json({ pdf: record }, { status: 201 });
}
