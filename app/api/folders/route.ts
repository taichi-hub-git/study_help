import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import type { FolderRecord } from "@/lib/schemas";

export async function GET() {
  const folders = db
    .prepare("SELECT * FROM folders ORDER BY createdAt ASC")
    .all() as FolderRecord[];

  const countRow = db.prepare(
    "SELECT folderId, COUNT(*) as count FROM pdfs WHERE folderId IS NOT NULL GROUP BY folderId"
  );
  const counts = new Map<string, number>(
    (countRow.all() as { folderId: string; count: number }[]).map((r) => [r.folderId, r.count])
  );

  return NextResponse.json({
    folders: folders.map((f) => ({ ...f, pdfCount: counts.get(f.id) ?? 0 })),
  });
}

const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const body = createFolderSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "フォルダ名を入力してください" }, { status: 400 });
  }

  const folder: FolderRecord = {
    id: randomUUID(),
    name: body.data.name,
    createdAt: new Date().toISOString(),
  };
  db.prepare("INSERT INTO folders (id, name, createdAt) VALUES (@id, @name, @createdAt)").run(
    folder
  );

  return NextResponse.json({ folder }, { status: 201 });
}
