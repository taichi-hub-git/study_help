import "server-only";
import type { z } from "zod";
import { extractJson, getGeminiClient, MODEL } from "@/lib/gemini";

/** Calls Gemini asking for JSON-only output, validates it against `schema`,
 * and retries once (fresh call) if parsing/validation fails. */
export async function generateValidatedJson<T>(
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
    const json = extractJson(response.text ?? "");
    return schema.parse(json);
  };

  try {
    return await attempt();
  } catch {
    return await attempt();
  }
}
