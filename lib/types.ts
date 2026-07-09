export const TABS = [
  { id: "pdf", label: "PDF" },
  { id: "summary", label: "要約" },
  { id: "quiz", label: "クイズ" },
  { id: "flashcards", label: "フラッシュカード" },
  { id: "mindmap", label: "マインドマップ" },
  { id: "memorize", label: "暗記" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export interface JumpRequest {
  page: number;
  nonce: number;
}
