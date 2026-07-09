import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const PDFS_DIR = path.join(DATA_DIR, "pdfs");
const DB_PATH = path.join(DATA_DIR, "app.db");

fs.mkdirSync(PDFS_DIR, { recursive: true });

declare global {
  var __db: Database.Database | undefined;
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS pdfs (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      uploadedAt TEXT NOT NULL,
      pageCount INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pdf_pages (
      id TEXT PRIMARY KEY,
      pdfId TEXT NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
      pageNumber INTEGER NOT NULL,
      text TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pdf_pages_pdfId ON pdf_pages(pdfId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_pages_pdfId_page ON pdf_pages(pdfId, pageNumber);

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      pdfId TEXT NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
      feature TEXT NOT NULL,
      params TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_generations_lookup ON generations(pdfId, feature, params);

    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      feature TEXT NOT NULL,
      promptTokens INTEGER NOT NULL,
      outputTokens INTEGER NOT NULL,
      totalTokens INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  return db;
}

export const db = globalThis.__db ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalThis.__db = db;
}

export { DATA_DIR, PDFS_DIR };
