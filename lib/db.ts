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

/** Adds a column to a pre-existing table if missing. Must run before any
 * statement (e.g. an index) that references the column, since a pre-existing
 * table won't have picked it up from a CREATE TABLE IF NOT EXISTS. The
 * existence check and the ALTER aren't atomic, and Next's build collects
 * page data across several worker processes that each import this module
 * concurrently, so a second worker can lose the race after the check but
 * before its own ALTER runs — swallow exactly that "already applied" error. */
function addColumnIfMissing(db: Database.Database, table: string, column: string, ddl: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((c) => c.name === column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  } catch (e) {
    const isDuplicateColumn = e instanceof Error && /duplicate column name/i.test(e.message);
    if (!isDuplicateColumn) throw e;
  }
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

    CREATE TABLE IF NOT EXISTS pdf_pages (
      id TEXT PRIMARY KEY,
      pdfId TEXT NOT NULL REFERENCES pdfs(id) ON DELETE CASCADE,
      pageNumber INTEGER NOT NULL,
      text TEXT NOT NULL
    );
  `);

  addColumnIfMissing(db, "pdfs", "folderId", "folderId TEXT REFERENCES folders(id) ON DELETE CASCADE");
  addColumnIfMissing(db, "pdf_pages", "emphasizedText", "emphasizedText TEXT NOT NULL DEFAULT ''");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pdfs_folderId ON pdfs(folderId);

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
