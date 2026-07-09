import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { describeGeminiError } from "@/lib/gemini";
import { generateValidatedJson } from "@/lib/generateJson";
import {
  getCachedFolderGeneration,
  getFolderPdfSources,
  saveFolderGeneration,
} from "@/lib/folderGenerations";
import {
  folderCramSystemPrompt,
  folderCramUserPrompt,
  pagesToFolderSourceText,
} from "@/lib/prompts";
import { folderCramGenParamsSchema, folderCramResultSchema } from "@/lib/schemas";

const requestSchema = z.object({
  folderId: z.string().min(1),
  regenerate: z.boolean().optional().default(false),
});

interface StoredFolderCram {
  items: unknown[];
  pdfIndex: { pdfId: string; filename: string }[];
}

export async function POST(req: NextRequest) {
  const body = requestSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { folderId, regenerate } = body.data;
  const params = folderCramGenParamsSchema.parse({});

  if (!regenerate) {
    const cached = getCachedFolderGeneration(folderId, "cram", params);
    if (cached) {
      const stored = JSON.parse(cached.content) as StoredFolderCram;
      return NextResponse.json({ ...stored, cached: true });
    }
  }

  const sources = getFolderPdfSources(folderId);
  if (sources.length === 0) {
    return NextResponse.json(
      { error: "フォルダにPDFがありません" },
      { status: 404 }
    );
  }
  const sourceText = pagesToFolderSourceText(sources);
  const pdfIndex = sources.map((s) => ({ pdfId: s.pdfId, filename: s.filename }));

  try {
    const result = await generateValidatedJson(
      "cram",
      folderCramResultSchema,
      folderCramSystemPrompt(),
      folderCramUserPrompt(sourceText)
    );
    const stored: StoredFolderCram = { items: result.items, pdfIndex };
    saveFolderGeneration(folderId, "cram", params, JSON.stringify(stored));
    return NextResponse.json({ ...stored, cached: false });
  } catch (e) {
    return NextResponse.json({ error: describeGeminiError(e) }, { status: 500 });
  }
}
