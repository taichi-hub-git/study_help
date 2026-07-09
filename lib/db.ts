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
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pdfs (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      uploadedAt TEXT NOT NULL,
      pageCount INTEGER NOT NULL,
      folderId TEXT REFERENCES folders(id) ON DELETE CASCADE
    );
  `);

  // Migration for databases created before folders existed — must run before
  // any statement (like the index below) that references the new column,
  // since a pre-existing pdfs table won't have picked it up from CREATE
  // TABLE IF NOT EXISTS above. The existence check and the ALTER are not
  // atomic, and Next's build collects page data across several worker
  // processes that each import this module concurrently, so a second worker
  // can lose the race after the check but before its own ALTER runs —
  // swallow exactly that "already applied" error.
  const pdfsColumns = db.prepare("PRAGMA table_info(pdfs)").all() as { name: string }[];
  if (!pdfsColumns.some((c) => c.name === "folderId")) {
    try {
      db.exec("ALTER TABLE pdfs ADD COLUMN folderId TEXT REFERENCES folders(id) ON DELETE CASCADE");
    } catch (e) {
      const isDuplicateColumn = e instanceof Error && /duplicate column name/i.test(e.message);
      if (!isDuplicateColumn) throw e;
    }
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pdfs_folderId ON pdfs(folderId);

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

    CREATE TABLE IF NOT EXISTS folder_generations (
      id TEXT PRIMARY KEY,
      folderId TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
      feature TEXT NOT NULL,
      params TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_folder_generations_lookup ON folder_generations(folderId, feature, params);

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
