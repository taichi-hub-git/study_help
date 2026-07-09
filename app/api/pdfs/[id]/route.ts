import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { z } from "zod";
import { db } from "@/lib/db";
import type { PdfRecord } from "@/lib/schemas";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pdf = db.prepare("SELECT * FROM pdfs WHERE id = ?").get(id) as
    | PdfRecord
    | undefined;
  if (!pdf) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }
  return NextResponse.json({ pdf });
}

const moveSchema = z.object({
  folderId: z.string().min(1).nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pdf = db.prepare("SELECT * FROM pdfs WHERE id = ?").get(id) as
    | PdfRecord
    | undefined;
  if (!pdf) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  const body = moveSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.data.folderId) {
    const folder = db.prepare("SELECT id FROM folders WHERE id = ?").get(body.data.folderId);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  db.prepare("UPDATE pdfs SET folderId = ? WHERE id = ?").run(body.data.folderId, id);
  const updated = db.prepare("SELECT * FROM pdfs WHERE id = ?").get(id) as PdfRecord;
  return NextResponse.json({ pdf: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pdf = db.prepare("SELECT * FROM pdfs WHERE id = ?").get(id) as
    | PdfRecord
    | undefined;
  if (!pdf) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  // Cascade in the DB removes pdf_pages/generations rows; the uploaded file
  // itself lives on disk and needs a separate cleanup.
  db.prepare("DELETE FROM pdfs WHERE id = ?").run(id);
  await fs.unlink(pdf.filepath).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
