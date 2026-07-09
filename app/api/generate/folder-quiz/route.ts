import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { describeGeminiError } from "@/lib/gemini";
import { generateValidatedJson } from "@/lib/generateJson";
import {
  getCachedFolderGeneration,
  getFolderPdfSources,
  saveFolderGeneration,
} from "@/lib/folderGenerations";
import { folderQuizSystemPrompt, folderQuizUserPrompt, pagesToFolderSourceText } from "@/lib/prompts";
import { buildFolderQuizSchema, folderQuizGenParamsSchema } from "@/lib/schemas";

const requestSchema = z.object({
  folderId: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.string().optional(),
  questionCount: z.number().int().optional(),
  regenerate: z.boolean().optional().default(false),
});

interface StoredFolderQuiz {
  quiz: { questions: unknown[] };
  pdfIndex: { pdfId: string; filename: string }[];
}

export async function POST(req: NextRequest) {
  const body = requestSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { folderId, regenerate } = body.data;
  const params = folderQuizGenParamsSchema.parse({
    difficulty: body.data.difficulty,
    topic: body.data.topic,
    questionCount: body.data.questionCount,
  });

  if (!regenerate) {
    const cached = getCachedFolderGeneration(folderId, "quiz", params);
    if (cached) {
      const stored = JSON.parse(cached.content) as StoredFolderQuiz;
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
    const quiz = await generateValidatedJson(
      "quiz",
      buildFolderQuizSchema(params.questionCount),
      folderQuizSystemPrompt(),
      folderQuizUserPrompt(sourceText, params)
    );
    const stored: StoredFolderQuiz = { quiz, pdfIndex };
    saveFolderGeneration(folderId, "quiz", params, JSON.stringify(stored));
    return NextResponse.json({ ...stored, cached: false });
  } catch (e) {
    return NextResponse.json({ error: describeGeminiError(e) }, { status: 500 });
  }
}
