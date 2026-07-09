import { z } from "zod";

export const featureSchema = z.enum([
  "summary",
  "quiz",
  "flashcards",
  "mindmap",
  "memorize",
  "cram",
  "memorizeCandidates",
]);
export type Feature = z.infer<typeof featureSchema>;

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof difficultySchema>;

// Folder-scoped generations table is only used by folder-quiz now — cram and
// folder-memorize instead aggregate cached per-PDF results (see below).
export const folderFeatureSchema = z.enum(["quiz"]);
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

export const memorizeCandidateGenParamsSchema = z.object({});
export type MemorizeCandidateGenParams = z.infer<typeof memorizeCandidateGenParamsSchema>;

export const cramGenParamsSchema = z.object({});
export type CramGenParams = z.infer<typeof cramGenParamsSchema>;

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
  // Optional: the source is now each PDF's summary rather than paginated
  // full text, so the model can't always ground a question in a specific page.
  sourcePage: z.number().int().min(1).optional(),
});
export type FolderQuizQuestion = z.infer<typeof folderQuizQuestionSchema>;

export function buildFolderQuizSchema(questionCount: number) {
  return z.object({
    questions: z.array(folderQuizQuestionSchema).length(questionCount),
  });
}
export type FolderQuiz = { questions: FolderQuizQuestion[] };

// --- Per-PDF cram ("テスト直前") ------------------------------------------
// Generated from that PDF's summary + its own emphasized-text spans (not
// raw full text), and cached per PDF like the other per-PDF features. The
// folder-wide cram view is just an aggregation of these — no separate
// folder-level AI call. `sourcePage` is omitted for "inference" items that
// aren't grounded in a specific emphasized span, since the summary they're
// drawn from doesn't carry page numbers.

export const cramItemSchema = z.object({
  point: z.string(),
  basis: cramBasisSchema,
  sourcePage: z.number().int().min(1).optional(),
});
export type CramItem = z.infer<typeof cramItemSchema>;

export const cramResultSchema = z.object({
  items: z.array(cramItemSchema).min(1),
});
export type CramResult = z.infer<typeof cramResultSchema>;

export interface AggregatedCramItem extends CramItem {
  pdfId: string;
  filename: string;
}

// --- Per-PDF memorize candidates (used only by the folder-wide 暗記 view) --
// Same idea as cram: generated from that PDF's summary + emphasized-text
// spans, cached per PDF, and the folder view is just an aggregation of
// these — no folder-level AI call. Distinct from the full-text-based
// per-PDF "memorize" feature used by that PDF's own 暗記 tab, which stays
// full-text since it's already bounded to one PDF and benefits from the
// extra detail.

export const memorizeCandidateItemSchema = z.object({
  term: z.string(),
  description: z.string(),
  sourcePage: z.number().int().min(1).optional(),
});
export type MemorizeCandidateItem = z.infer<typeof memorizeCandidateItemSchema>;

export const memorizeCandidateResultSchema = z.object({
  items: z.array(memorizeCandidateItemSchema).min(1),
});
export type MemorizeCandidateResult = z.infer<typeof memorizeCandidateResultSchema>;

export interface AggregatedMemorizeCandidateItem extends MemorizeCandidateItem {
  pdfId: string;
  filename: string;
}
