import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { db } from "@/lib/db";
import type { FolderRecord, PdfRecord } from "@/lib/schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(id) as
    | FolderRecord
    | undefined;
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }
  const pdfs = db
    .prepare("SELECT * FROM pdfs WHERE folderId = ? ORDER BY uploadedAt ASC")
    .all(id) as PdfRecord[];

  return NextResponse.json({ folder, pdfs });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(id) as
    | FolderRecord
    | undefined;
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const pdfs = db.prepare("SELECT * FROM pdfs WHERE folderId = ?").all(id) as PdfRecord[];

  // The DB cascade (pdfs -> pdf_pages/generations, folders -> pdfs/folder_generations)
  // handles all rows; the uploaded PDF files on disk need a manual cleanup pass.
  db.prepare("DELETE FROM folders WHERE id = ?").run(id);

  await Promise.all(
    pdfs.map((pdf) => fs.unlink(pdf.filepath).catch(() => undefined))
  );

  return NextResponse.json({ ok: true });
}
