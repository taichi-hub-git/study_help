import "server-only";
import { ApiError } from "@google/genai";
import type { z } from "zod";
import { extractJson, getGeminiClient, MODEL } from "@/lib/gemini";
import type { Feature } from "@/lib/schemas";
import { recordTokenUsage, usageFromMetadata } from "@/lib/tokenUsage";

/** Calls Gemini asking for JSON-only output, validates it against `schema`,
 * and retries once (fresh call) if the model's response wasn't valid JSON
 * matching the schema. Every call's token usage is recorded, including a
 * failed first attempt that gets retried.
 *
 * Retries only that "bad output" case, not `ApiError`s (rate limit, auth,
 * server errors, ...): those come from the call itself failing, not from
 * questionable output, so an immediate retry is very likely to hit the same
 * error again (and, for a rate limit, only makes it worse). */
export async function generateValidatedJson<T>(
  feature: Feature,
  schema: z.ZodType<T>,
  system: string,
  user: string
): Promise<T> {
  const client = getGeminiClient();

  const attempt = async (): Promise<T> => {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: user,
      config: {
        systemInstruction: system,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });
    recordTokenUsage(feature, usageFromMetadata(response.usageMetadata));
    const json = extractJson(response.text ?? "");
    return schema.parse(json);
  };

  try {
    return await attempt();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return await attempt();
  }
}
