import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureMemorizeCandidates } from "@/lib/memorizeCandidateGeneration";
import { getFolderPdfs } from "@/lib/folderGenerations";
import type { AggregatedMemorizeCandidateItem } from "@/lib/schemas";

const requestSchema = z.object({
  folderId: z.string().min(1),
  regenerate: z.boolean().optional().default(false),
});

/** The folder-wide 暗記 view has no AI call of its own: it just ensures
 * every PDF in the folder has its (cheap, summary-based) memorize candidates
 * generated, then concatenates them. Adding a new PDF to the folder only
 * costs generating that one PDF's items — everything already cached for the
 * other PDFs is reused as-is. */
export async function POST(req: NextRequest) {
  const body = requestSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { folderId, regenerate } = body.data;

  const pdfs = getFolderPdfs(folderId);
  if (pdfs.length === 0) {
    return NextResponse.json({ error: "フォルダにPDFがありません" }, { status: 404 });
  }

  const items: AggregatedMemorizeCandidateItem[] = [];
  const failedFilenames: string[] = [];

  for (const pdf of pdfs) {
    try {
      const pdfItems = await ensureMemorizeCandidates(pdf.id, regenerate);
      for (const item of pdfItems) {
        items.push({ ...item, pdfId: pdf.id, filename: pdf.filename });
      }
    } catch (e) {
      console.error(`memorize candidate generation failed for pdf ${pdf.id}`, e);
      failedFilenames.push(pdf.filename);
    }
  }

  if (items.length === 0 && failedFilenames.length > 0) {
    return NextResponse.json(
      { error: `${failedFilenames.join(", ")} の生成に失敗しました。しばらく待ってから再度お試しください。` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    items,
    failedFilenames: failedFilenames.length > 0 ? failedFilenames : undefined,
  });
}
