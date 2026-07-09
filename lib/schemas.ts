import { z } from "zod";

export const featureSchema = z.enum([
  "summary",
  "quiz",
  "flashcards",
  "mindmap",
  "memorize",
]);
export type Feature = z.infer<typeof featureSchema>;

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof difficultySchema>;

// --- DB record shapes -------------------------------------------------

export interface PdfRecord {
  id: string;
  filename: string;
  filepath: string;
  uploadedAt: string;
  pageCount: number;
}

export interface PdfPageRecord {
  id: string;
  pdfId: string;
  pageNumber: number;
  text: string;
}

export interface GenerationRecord {
  id: string;
  pdfId: string;
  feature: Feature;
  params: string;
  content: string;
  createdAt: string;
}

// --- Generation request params ----------------------------------------

export const quizGenParamsSchema = z.object({
  difficulty: difficultySchema.default("medium"),
  topic: z.string().trim().max(500).default(""),
});
export type QuizGenParams = z.infer<typeof quizGenParamsSchema>;

export const flashcardsGenParamsSchema = z.object({});
export type FlashcardsGenParams = z.infer<typeof flashcardsGenParamsSchema>;

export const mindmapGenParamsSchema = z.object({});
export type MindmapGenParams = z.infer<typeof mindmapGenParamsSchema>;

export const memorizeGenParamsSchema = z.object({});
export type MemorizeGenParams = z.infer<typeof memorizeGenParamsSchema>;

export const summaryGenParamsSchema = z.object({});
export type SummaryGenParams = z.infer<typeof summaryGenParamsSchema>;

// --- AI output shapes (validated with zod) ------------------------------

export const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  sourcePage: z.number().int().min(1),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).length(10),
});
export type Quiz = z.infer<typeof quizSchema>;

export const flashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  sourcePage: z.number().int().min(1),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

export const flashcardsSchema = z.object({
  cards: z.array(flashcardSchema).min(1),
});
export type Flashcards = z.infer<typeof flashcardsSchema>;

export const mindmapResultSchema = z.object({
  markdown: z.string().min(1),
});
export type MindmapResult = z.infer<typeof mindmapResultSchema>;

export const memorizeItemSchema = z.object({
  term: z.string(),
  description: z.string(),
  sourcePage: z.number().int().min(1),
});
export type MemorizeItem = z.infer<typeof memorizeItemSchema>;

export const memorizeResultSchema = z.object({
  items: z.array(memorizeItemSchema).min(1),
});
export type MemorizeResult = z.infer<typeof memorizeResultSchema>;
