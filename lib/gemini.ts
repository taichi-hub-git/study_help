import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";

// Single place to change the model used across the app.
export const MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server."
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

/** Maps an error from a Gemini API call to a short, actionable Japanese
 * message instead of leaking raw SDK/HTTP error bodies to the UI. */
export function describeGeminiError(e: unknown): string {
  if (e instanceof ApiError) {
    // Gemini reports a bad key as 400 INVALID_ARGUMENT/API_KEY_INVALID, not 401/403.
    if (
      e.status === 401 ||
      e.status === 403 ||
      /api key not valid|api_key_invalid/i.test(e.message)
    ) {
      return "APIキーが正しくありません。.env.local の GEMINI_API_KEY を確認してください。";
    }
    if (e.status === 429) {
      return "APIのレート制限に達しました。しばらく待ってから再度お試しください。";
    }
    return `AI生成に失敗しました（${e.status}）。しばらく待ってから再度お試しください。`;
  }
  if (e instanceof Error) return e.message;
  return "AI生成に失敗しました。";
}

/** Extracts the first top-level JSON object/array from a model response,
 * tolerating stray text or markdown fences the model may add despite instructions. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[{[]/);
  if (start === -1) {
    throw new Error("No JSON found in model response");
  }
  const openChar = candidate[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let end = -1;
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === openChar) depth++;
    else if (candidate[i] === closeChar) {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) {
    throw new Error("Unterminated JSON in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
