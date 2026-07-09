import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
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

  const buffer = await fs.readFile(pdf.filepath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(pdf.filename)}"`,
    },
  });
}
