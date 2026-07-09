import { z } from "zod";

export const featureSchema = z.enum([
  "summary",
  "quiz",
  "flashcards",
  "mindmap",
  "memorize",
  "cram",
]);
export type Feature = z.infer<typeof featureSchema>;

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const folderFeatureSchema = z.enum(["quiz", "memorize", "cram"]);
export type FolderFeature = z.infer<typeof folderFeatureSchema>;

export const cramBasisSchema = z.enum(["emphasized", "inference"]);
export type CramBasis = z.infer<typeof cramBasisSchema>;

// --- DB record shapes -------------------------------------------------

export interface FolderRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface PdfRecord {
  id: string;
  filename: string;
  filepath: string;
  uploadedAt: string;
  pageCount: number;
  folderId: string | null;
}

export interface PdfPageRecord {
  id: string;
  pdfId: string;
  pageNumber: number;
  text: string;
  emphasizedText: string;
}

export interface GenerationRecord {
  id: string;
  pdfId: string;
  feature: Feature;
  params: string;
  content: string;
  createdAt: string;
}

export interface FolderGenerationRecord {
  id: string;
  folderId: string;
  feature: FolderFeature;
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

export const folderQuizGenParamsSchema = z.object({
  difficulty: difficultySchema.default("medium"),
  topic: z.string().trim().max(500).default(""),
  questionCount: z.number().int().min(1).max(50).default(10),
});
export type FolderQuizGenParams = z.infer<typeof folderQuizGenParamsSchema>;

export const folderMemorizeGenParamsSchema = z.object({});
export type FolderMemorizeGenParams = z.infer<typeof folderMemorizeGenParamsSchema>;

export const folderCramGenParamsSchema = z.object({});
export type FolderCramGenParams = z.infer<typeof folderCramGenParamsSchema>;

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

// --- Folder-scoped (multi-PDF) AI output shapes --------------------------
// `sourcePdfIndex` is a 1-based index into the list of PDFs given to the
// model in the prompt (not a real pdfId — safer than trusting the model to
// echo back an opaque UUID correctly); the server maps it back to a pdfId.

export const folderQuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  sourcePdfIndex: z.number().int().min(1),
  sourcePage: z.number().int().min(1),
});
export type FolderQuizQuestion = z.infer<typeof folderQuizQuestionSchema>;

export function buildFolderQuizSchema(questionCount: number) {
  return z.object({
    questions: z.array(folderQuizQuestionSchema).length(questionCount),
  });
}
export type FolderQuiz = { questions: FolderQuizQuestion[] };

export const folderMemorizeItemSchema = z.object({
  term: z.string(),
  description: z.string(),
  sourcePdfIndex: z.number().int().min(1),
  sourcePage: z.number().int().min(1),
});
export type FolderMemorizeItem = z.infer<typeof folderMemorizeItemSchema>;

export const folderMemorizeResultSchema = z.object({
  items: z.array(folderMemorizeItemSchema).min(1),
});
export type FolderMemorizeResult = z.infer<typeof folderMemorizeResultSchema>;

export const folderCramItemSchema = z.object({
  point: z.string(),
  basis: cramBasisSchema,
  sourcePdfIndex: z.number().int().min(1),
  sourcePage: z.number().int().min(1),
});
export type FolderCramItem = z.infer<typeof folderCramItemSchema>;

export const folderCramResultSchema = z.object({
  items: z.array(folderCramItemSchema).min(1),
});
export type FolderCramResult = z.infer<typeof folderCramResultSchema>;
