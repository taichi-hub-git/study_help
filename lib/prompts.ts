import type { PdfPageRecord } from "@/lib/schemas";
import type { Difficulty } from "@/lib/schemas";

export function pagesToSourceText(pages: PdfPageRecord[]): string {
  return pages
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => `=== Page ${p.pageNumber} ===\n${p.text}`)
    .join("\n\n");
}

export interface FolderPdfSummary {
  filename: string;
  summary: string;
}

/** Combines each PDF's summary (not raw page text) into one prompt, tagging
 * each with a 1-based index the model echoes back as `sourcePdfIndex` (safer
 * than trusting it to reproduce an opaque pdfId). Folder-quiz stays a single
 * combined call (it needs to see everything at once to hit an exact question
 * count and respect a topic filter across PDFs), but building it from
 * summaries instead of full text is what keeps that one call cheap. */
export function summariesToFolderSourceText(pdfs: FolderPdfSummary[]): string {
  return pdfs
    .map((pdf, i) => `### 資料${i + 1}: ${pdf.filename}\n${pdf.summary}`)
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
  return `以下は複数の講義PDFの要約です。「### 資料N: ファイル名」で資料の区切りを示しています。

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
- sourcePage は要約から判断できる場合のみ入れてください（要約はページ番号を保持していないため、判断できなければ省略してください）。
- questions 配列はちょうど${params.questionCount}個にしてください。
- 出力はこのJSONオブジェクトのみ。`;
}

/** Builds the "what was emphasized" block fed to the per-PDF cram prompt —
 * only the short emphasized spans (with their real page numbers), not full
 * page text, since cram is deliberately built from cheap inputs. */
export function pagesToEmphasizedSpansText(pages: PdfPageRecord[]): string {
  const withEmphasis = pages
    .filter((p) => p.emphasizedText)
    .sort((a, b) => a.pageNumber - b.pageNumber);
  if (withEmphasis.length === 0) {
    return "（このPDFでは色付きの強調テキストは検出されませんでした）";
  }
  return withEmphasis.map((p) => `[p.${p.pageNumber}で強調]: ${p.emphasizedText}`).join("\n");
}

export function cramSystemPrompt(): string {
  return JSON_ONLY_SYSTEM;
}

/** Cram deliberately takes the PDF's summary (cheap) plus its emphasized
 * spans (cheap, and each already tagged with a real page number) instead of
 * the full raw page text — this prompt is reused per PDF, and a folder's
 * "テスト直前" view is just an aggregation of these, so keeping this input
 * small is what keeps the whole feature affordable as folders grow. */
export function cramUserPrompt(summaryText: string, emphasizedSpansText: string): string {
  return `以下はある講義PDFの要約と、そのPDF内で色付き(赤字など)で強調されていたテキストの抜粋です。

【要約】
${summaryText}

【色付きで強調されていたテキスト（ページ番号つき）】
${emphasizedSpansText}

これはテスト直前の一夜漬け用に、試験に出る可能性が高い項目だけを凝縮してまとめる機能です。次の2種類の項目を抽出してください:
1. "emphasized": 上記の「色付きで強調されていたテキスト」に基づく項目。
2. "inference": 強調されてはいなくても、要約の内容から見て定義・公式・繰り返し出てくる概念など、試験に出る可能性が高いとあなたが判断した項目。

以下の形式のJSONオブジェクトのみを出力してください:
{
  "items": [
    { "point": "覚えるべき内容を簡潔にまとめた一文", "basis": "emphasized", "sourcePage": 1 }
  ]
}
- basis は "emphasized" か "inference" のいずれか。
- sourcePage は、"emphasized" の項目については根拠にした強調テキストのページ番号(p.N の N)を必ず入れてください。"inference" の項目は、要約のどのあたりの内容か判断できる場合のみ入れ、判断できなければ省略してください。
- point は暗記できる粒度の簡潔な一文にしてください（長い説明文にしない）。
- 重要度の高い順に、5〜15項目程度に絞ってください。
- 出力はこのJSONオブジェクトのみ。`;
}

export function memorizeCandidateSystemPrompt(): string {
  return JSON_ONLY_SYSTEM;
}

/** Same input strategy as cram (summary + emphasized spans, not raw full
 * text) — this is what the folder-wide 暗記 view aggregates across PDFs. */
export function memorizeCandidateUserPrompt(
  summaryText: string,
  emphasizedSpansText: string
): string {
  return `以下はある講義PDFの要約と、そのPDF内で色付き(赤字など)で強調されていたテキストの抜粋です。

【要約】
${summaryText}

【色付きで強調されていたテキスト（ページ番号つき）】
${emphasizedSpansText}

上記の内容から、試験対策として**暗記すべき項目**（重要用語・定義・公式・年号など）を抽出してください。
以下の形式のJSONオブジェクトのみを出力してください:
{
  "items": [
    { "term": "用語・項目名", "description": "説明・定義", "sourcePage": 1 }
  ]
}
- sourcePage は、強調されていたテキストが根拠になっている場合はそのページ番号(p.N の N)を入れてください。要約のみから判断した項目で根拠ページが分からなければ省略してください。
- 重要度の高いものを5〜20項目程度に絞ってください。
- 出力はこのJSONオブジェクトのみ。`;
}
