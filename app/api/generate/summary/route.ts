import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { describeGeminiError, getGeminiClient, MODEL } from "@/lib/gemini";
import { getCachedGeneration, getPdfPages, saveGeneration } from "@/lib/generations";
import { pagesToSourceText, summarySystemPrompt, summaryUserPrompt } from "@/lib/prompts";
import { summaryGenParamsSchema } from "@/lib/schemas";

const requestSchema = z.object({
  pdfId: z.string().min(1),
  regenerate: z.boolean().optional().default(false),
});

// Streamed as newline-delimited JSON so a mid-stream failure (bad API key,
// network error, etc.) can be reported to the client instead of just cutting
// the connection — a plain-text stream has no way to signal "this broke".
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

export async function POST(req: NextRequest) {
  const body = requestSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { pdfId, regenerate } = body.data;
  const params = summaryGenParamsSchema.parse({});

  if (!regenerate) {
    const cached = getCachedGeneration(pdfId, "summary", params);
    if (cached) {
      return NextResponse.json({ content: cached.content, cached: true });
    }
  }

  const pages = getPdfPages(pdfId);
  if (pages.length === 0) {
    return NextResponse.json({ error: "PDF not found or has no pages" }, { status: 404 });
  }
  const sourceText = pagesToSourceText(pages);

  let client;
  try {
    client = getGeminiClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gemini client error" },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  let fullText = "";

  const write = (controller: ReadableStreamDefaultController<Uint8Array>, event: StreamEvent) => {
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const geminiStream = await client.models.generateContentStream({
          model: MODEL,
          contents: summaryUserPrompt(sourceText),
          config: {
            systemInstruction: summarySystemPrompt,
            maxOutputTokens: 4096,
          },
        });

        for await (const chunk of geminiStream) {
          const delta = chunk.text ?? "";
          if (!delta) continue;
          fullText += delta;
          write(controller, { type: "delta", text: delta });
        }

        saveGeneration(pdfId, "summary", params, fullText);
        write(controller, { type: "done" });
        controller.close();
      } catch (e) {
        write(controller, { type: "error", message: describeGeminiError(e) });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
