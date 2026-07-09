# テスト対策アプリ

講義PDFをアップロードし、PDFごとに「PDF / 要約 / クイズ / フラッシュカード / マインドマップ / 暗記」の6タブで学習できる、ローカル完結のテスト対策アプリです。AI生成には Gemini API を使用します（自分のAPIキーが必要です）。PDFファイル・抽出テキスト・AI生成物はすべてローカル（`data/`）に保存されます。

## セットアップ

1. 依存パッケージをインストール

   ```bash
   npm i
   ```

2. Gemini APIキーを設定

   `.env.local` を開き、`GEMINI_API_KEY` に自分のAPIキーを設定してください。

   ```
   GEMINI_API_KEY=AIza...
   ```

   APIキーは [Google AI Studio](https://aistudio.google.com/apikey) から発行できます。

3. 開発サーバーを起動

   ```bash
   npm run dev
   ```

   [http://localhost:3000](http://localhost:3000) を開いてください。

## 使い方

1. トップページでPDFをドラッグ&ドロップ（またはクリックして選択）してアップロードします。ページ単位でテキストが抽出され、ローカルのSQLiteに保存されます。
2. アップロード済みPDFをクリックすると閲覧画面に移動します。上部のタブでPDF/要約/クイズ/フラッシュカード/マインドマップ/暗記を切り替えられます。
3. 「2画面」チェックボックスをONにすると左右2ペインになり、各ペインが独立してタブを選べます（例: 左にPDF、右にクイズ）。
4. 要約・クイズ・フラッシュカード・マインドマップ・暗記は初回表示時にAIが生成し、結果はローカルにキャッシュされます。同じ条件であれば再度Gemini APIを呼び出さずキャッシュを返すため、API利用コストを抑えられます。明示的に「再生成」ボタンを押した場合のみ、新しく生成し直します。
5. クイズ・フラッシュカード・暗記の各項目には出典ページが表示され、クリックするとそのペインのPDFタブが該当ページにジャンプします。

## 技術スタック

- Next.js（App Router, TypeScript strict）/ Tailwind CSS
- SQLite（`better-sqlite3`）: PDFメタデータ・ページテキスト・AI生成物のキャッシュ
- `pdfjs-dist`（サーバー側でページ単位のテキスト抽出）/ `react-pdf`（クライアント側のPDF表示、workerはCDNを使わず `public/pdf.worker.min.mjs` にローカル配信）
- `markmap-lib` + `markmap-view`（マインドマップ描画）
- `zod`（AI出力のバリデーション）
- `@google/genai`（Gemini API SDK。Route Handler経由でのみ呼び出し。APIキーはサーバー側のみで使用）

## モデルの変更

使用するモデル名は [lib/gemini.ts](lib/gemini.ts) の `MODEL` 定数1箇所にまとめてあります。ここを書き換えるだけで、アプリ全体の生成に使うモデルを差し替えられます。

```ts
export const MODEL = "gemini-2.5-flash";
```

## データの保存場所

- アップロードしたPDF本体: `data/pdfs/`
- SQLiteデータベース（メタデータ・ページテキスト・AI生成キャッシュ）: `data/app.db`

`data/` は `.gitignore` 対象なので、リポジトリにはコミットされません。
