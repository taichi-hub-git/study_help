import { NextRequest, NextResponse } from "next/server";
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
