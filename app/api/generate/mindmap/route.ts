import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { describeGeminiError } from "@/lib/gemini";
import { generateValidatedJson } from "@/lib/generateJson";
import { getCachedGeneration, getPdfPages, saveGeneration } from "@/lib/generations";
import { mindmapSystemPrompt, mindmapUserPrompt, pagesToSourceText } from "@/lib/prompts";
import { mindmapGenParamsSchema, mindmapResultSchema } from "@/lib/schemas";

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
  const params = mindmapGenParamsSchema.parse({});

  if (!regenerate) {
    const cached = getCachedGeneration(pdfId, "mindmap", params);
    if (cached) {
      return NextResponse.json({ markdown: JSON.parse(cached.content).markdown, cached: true });
    }
  }

  const pages = getPdfPages(pdfId);
  if (pages.length === 0) {
    return NextResponse.json({ error: "PDF not found or has no pages" }, { status: 404 });
  }
  const sourceText = pagesToSourceText(pages);

  try {
    const result = await generateValidatedJson(
      mindmapResultSchema,
      mindmapSystemPrompt(),
      mindmapUserPrompt(sourceText)
    );
    saveGeneration(pdfId, "mindmap", params, JSON.stringify(result));
    return NextResponse.json({ markdown: result.markdown, cached: false });
  } catch (e) {
    return NextResponse.json({ error: describeGeminiError(e) }, { status: 500 });
  }
}
