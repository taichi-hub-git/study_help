import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { describeGeminiError } from "@/lib/gemini";
import { ensureCram } from "@/lib/cramGeneration";

const requestSchema = z.object({
  pdfId: z.string().min(1),
  regenerate: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const body = requestSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { pdfId, regenerate } = body.data;

  if (!db.prepare("SELECT id FROM pdfs WHERE id = ?").get(pdfId)) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  try {
    const items = await ensureCram(pdfId, regenerate);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: describeGeminiError(e) }, { status: 500 });
  }
}
