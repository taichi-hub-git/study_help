import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { describeGeminiError } from "@/lib/gemini";
import { generateValidatedJson } from "@/lib/generateJson";
import { getCachedGeneration, getPdfPages, saveGeneration } from "@/lib/generations";
import { pagesToSourceText, quizSystemPrompt, quizUserPrompt } from "@/lib/prompts";
import { quizGenParamsSchema, quizSchema } from "@/lib/schemas";

const requestSchema = z.object({
  pdfId: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.string().optional(),
  regenerate: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const body = requestSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { pdfId, regenerate } = body.data;
  const params = quizGenParamsSchema.parse({
    difficulty: body.data.difficulty,
    topic: body.data.topic,
  });

  if (!regenerate) {
    const cached = getCachedGeneration(pdfId, "quiz", params);
    if (cached) {
      return NextResponse.json({ quiz: JSON.parse(cached.content), cached: true });
    }
  }

  const pages = getPdfPages(pdfId);
  if (pages.length === 0) {
    return NextResponse.json({ error: "PDF not found or has no pages" }, { status: 404 });
  }
  const sourceText = pagesToSourceText(pages);

  try {
    const quiz = await generateValidatedJson(
      "quiz",
      quizSchema,
      quizSystemPrompt(),
      quizUserPrompt(sourceText, params)
    );
    saveGeneration(pdfId, "quiz", params, JSON.stringify(quiz));
    return NextResponse.json({ quiz, cached: false });
  } catch (e) {
    return NextResponse.json({ error: describeGeminiError(e) }, { status: 500 });
  }
}
