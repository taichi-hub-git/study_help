import type { PdfPageRecord } from "@/lib/schemas";
import type { Difficulty } from "@/lib/schemas";

export function pagesToSourceText(pages: PdfPageRecord[]): string {
  return pages
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => `=== Page ${p.pageNumber} ===\n${p.text}`)
    .join("\n\n");
}

export interface FolderPdfSource {
  filename: string;
  pages: PdfPageRecord[];
}

/** Combines multiple PDFs' page text into one prompt, tagging each with a
 * 1-based index the model echoes back as `sourcePdfIndex` (safer than
 * trusting it to reproduce an opaque pdfId). */
export function pagesToFolderSourceText(pdfs: FolderPdfSource[]): string {
  return pdfs
    .map(
      (pdf, i) =>
        `### 資料${i + 1}: ${pdf.filename}\n${pagesToSourceText(pdf.pages)}`
    )
    .join("\n\n");
}

const JSON_ONLY_SYSTEM =
  "あなたは講義資料から学習教材を生成するアシスタントです。" +
  "出力は指示されたJSONのみを返してください。前置き、説明、Markdown装飾（```json など）は一切つけないこと。" +
  "出力はそのままJSON.parseできる形式でなければなりません。";

export const summarySystemPrompt =
  "あなたは講義資料の要約アシスタントです。与えられた講義テキストから、" +
  "見出し（##, ###）を使った構造化されたMarkdown要約を作成してください。" +
  "重要な概念や定義を漏らさず、学習者が試験対策として読める密度でまとめてください。" +
  "前置きや締めの挨拶は不要で、要約本文のみを出力してください。";

export function summaryUserPrompt(sourceText: string): string {
  return `以下は講義PDFから抽出したテキストです。ページ区切りは「=== Page N ===」で示されています。\n\n${sourceText}\n\n上記の内容を構造化されたMarkdown要約にしてください。`;
}

const difficultyLabel: Record<Difficulty, string> = {
  easy: "易しい（基本的な用語・概念の確認レベル）",
  medium: "中程度（内容の理解と応用を問うレベル）",
  hard: "難しい（深い理解・複数概念の関連づけを問うレベル）",
}

export function quizSystemPrompt(): string {
  return JSON_ONLY_SYSTEM;
}

export function quizUserPrompt(
  sourceText: string,
  params: { difficulty: Difficulty; topic: string }
): string {
  const topicLine = params.topic
    ? `出題範囲・トピックの指定: ${params.topic}\n`
    : "出題範囲・トピックの指定: なし（資料全体から出題）\n";
  return `以下は講義PDFから抽出したテキストです。ページ区切りは「=== Page N ===」で示されています。

${sourceText}

上記の内容から、4択クイズを**ちょうど10問**作成してください。
難易度: ${difficultyLabel[params.difficulty]}
${topicLine}
各問題は以下の形式のJSONオブジェクトにしてください:
{
  "questions": [
    {
      "question": "設問文",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "answerIndex": 0,
      "explanation": "なぜその答えが正しいかの解説",
      "sourcePage": 1
    }
  ]
}
- options は必ず4つ。
- answerIndex は正解の選択肢のインデックス(0始まり)。
- sourcePage はその設問の根拠となる、資料中のページ番号(Page N の N)。
- questions 配列はちょうど10個にしてください。
- 出力はこのJSONオブジェクトのみ。`;
}

export function flashcardsSystemPrompt(): string {
  return JSON_ONLY_SYSTEM;
}

export function flashcardsUserPrompt(sourceText: string): string {
  return `以下は講義PDFから抽出したテキストです。ページ区切りは「=== Page N ===」で示されています。

${sourceText}

上記の内容から、学習用フラッシュカードを作成してください。
重要な概念・用語・定義を中心に、8〜15枚程度作成してください。
以下の形式のJSONオブジェクトのみを出力してください:
{
  "cards": [
    { "front": "表面（問い・用語）", "back": "裏面（答え・説明）", "sourcePage": 1 }
  ]
}
- sourcePage はそのカードの根拠となる、資料中のページ番号(Page N の N)。
- 出力はこのJSONオブジェクトのみ。`;
}

export function mindmapSystemPrompt(): string {
  return JSON_ONLY_SYSTEM;
}

export function mindmapUserPrompt(sourceText: string): string {
  return `以下は講義PDFから抽出したテキストです。ページ区切りは「=== Page N ===」で示されています。

${sourceText}

上記の内容を、講義全体の構造がわかる階層的なマインドマップ用アウトラインにしてください。
Markdownの見出し・箇条書き（#, ##, -, など）を使った階層構造で表現してください。
以下の形式のJSONオブジェクトのみを出力してください:
{
  "markdown": "# 講義タイトル\\n## 大項目1\\n- 中項目\\n  - 小項目\\n## 大項目2\\n..."
}
- markdown はmarkmap（markdownの見出し/箇条書きの階層をマインドマップにするライブラリ）でそのまま描画できる形式にしてください。
- 出力はこのJSONオブジェクトのみ。`;
}

export function memorizeSystemPrompt(): string {
  return JSON_ONLY_SYSTEM;
}

export function memorizeUserPrompt(sourceText: string): string {
  return `以下は講義PDFから抽出したテキストです。ページ区切りは「=== Page N ===」で示されています。

${sourceText}

上記の内容から、試験対策として**暗記すべき項目**（重要用語・定義・公式・年号など）を抽出してください。
以下の形式のJSONオブジェクトのみを出力してください:
{
  "items": [
    { "term": "用語・項目名", "description": "説明・定義", "sourcePage": 1 }
  ]
}
- sourcePage はその項目の根拠となる、資料中のページ番号(Page N の N)。
- 重要度の高いものを10〜30項目程度に絞ってください。
- 出力はこのJSONオブジェクトのみ。`;
}

export function folderQuizSystemPrompt(): string {
  return JSON_ONLY_SYSTEM;
}

export function folderQuizUserPrompt(
  sourceText: string,
  params: { difficulty: Difficulty; topic: string; questionCount: number }
): string {
  const topicLine = params.topic
    ? `出題範囲・トピックの指定: ${params.topic}\n`
    : "出題範囲・トピックの指定: なし（資料全体から出題）\n";
  return `以下は複数の講義PDFから抽出したテキストです。「### 資料N: ファイル名」で資料の区切りを、「=== Page N ===」でページの区切りを示しています。

${sourceText}

上記の複数資料の内容を横断して、4択クイズを**ちょうど${params.questionCount}問**作成してください。
難易度: ${difficultyLabel[params.difficulty]}
${topicLine}
各問題は以下の形式のJSONオブジェクトにしてください:
{
  "questions": [
    {
      "question": "設問文",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "answerIndex": 0,
      "explanation": "なぜその答えが正しいかの解説",
      "sourcePdfIndex": 1,
      "sourcePage": 1
    }
  ]
}
- options は必ず4つ。
- answerIndex は正解の選択肢のインデックス(0始まり)。
- sourcePdfIndex はその設問の根拠となる資料の番号(「### 資料N」の N)。
- sourcePage はその設問の根拠となる、資料中のページ番号(Page N の N)。
- questions 配列はちょうど${params.questionCount}個にしてください。
- 出力はこのJSONオブジェクトのみ。`;
}

export function folderMemorizeSystemPrompt(): string {
  return JSON_ONLY_SYSTEM;
}

export function folderMemorizeUserPrompt(sourceText: string): string {
  return `以下は複数の講義PDFから抽出したテキストです。「### 資料N: ファイル名」で資料の区切りを、「=== Page N ===」でページの区切りを示しています。

${sourceText}

上記の複数資料の内容を横断して、試験対策として**暗記すべき項目**（重要用語・定義・公式・年号など）を抽出してください。
以下の形式のJSONオブジェクトのみを出力してください:
{
  "items": [
    { "term": "用語・項目名", "description": "説明・定義", "sourcePdfIndex": 1, "sourcePage": 1 }
  ]
}
- sourcePdfIndex はその項目の根拠となる資料の番号(「### 資料N」の N)。
- sourcePage はその項目の根拠となる、資料中のページ番号(Page N の N)。
- 重要度の高いものを資料全体から15〜40項目程度に絞ってください。
- 出力はこのJSONオブジェクトのみ。`;
}
