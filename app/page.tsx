"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PdfRecord } from "@/lib/schemas";

interface FolderWithCount {
  id: string;
  name: string;
  createdAt: string;
  pdfCount: number;
}

export default function Home() {
  const [pdfs, setPdfs] = useState<PdfRecord[] | null>(null);
  const [folders, setFolders] = useState<FolderWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const [pdfsRes, foldersRes] = await Promise.all([
        fetch("/api/pdfs"),
        fetch("/api/folders"),
      ]);
      if (!pdfsRes.ok || !foldersRes.ok) throw new Error("一覧の取得に失敗しました");
      const pdfsData = await pdfsRes.json();
      const foldersData = await foldersRes.json();
      setPdfs(pdfsData.pdfs);
      setFolders(foldersData.folders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "一覧の取得に失敗しました");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/pdfs", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "アップロードに失敗しました");
      } finally {
        setUploading(false);
      }
    },
    [load]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "フォルダの作成に失敗しました");
      setNewFolderName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "フォルダの作成に失敗しました");
    } finally {
      setCreatingFolder(false);
    }
  };

  const deleteFolder = async (folder: FolderWithCount) => {
    if (
      !window.confirm(
        `フォルダ「${folder.name}」と、中の${folder.pdfCount}件のPDFをすべて完全に削除します。この操作は取り消せません。よろしいですか？`
      )
    ) {
      return;
    }
    await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
    await load();
  };

  const deletePdf = async (pdf: PdfRecord) => {
    if (!window.confirm(`「${pdf.filename}」を完全に削除します。この操作は取り消せません。よろしいですか？`)) {
      return;
    }
    await fetch(`/api/pdfs/${pdf.id}`, { method: "DELETE" });
    await load();
  };

  const movePdf = async (pdfId: string, folderId: string | null) => {
    await fetch(`/api/pdfs/${pdfId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    await load();
  };

  const unfiledPdfs = pdfs?.filter((p) => !p.folderId) ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            テスト対策アプリ
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            講義PDFをアップロードして、要約・クイズ・フラッシュカード・マインドマップ・暗記で学習できます。
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragOver
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          {uploading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              アップロード中・テキスト抽出中...
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                PDFをドラッグ&ドロップ、またはクリックして選択
              </p>
              <p className="text-xs text-zinc-400">.pdf ファイルのみ（未分類として追加されます）</p>
            </>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              フォルダ
            </h2>
          </div>

          <div className="flex gap-2">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createFolder();
              }}
              placeholder="新しいフォルダ名"
              className="flex-1 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              onClick={createFolder}
              disabled={creatingFolder || !newFolderName.trim()}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              作成
            </button>
          </div>

          {folders === null ? (
            <p className="text-sm text-zinc-400">読み込み中...</p>
          ) : folders.length === 0 ? (
            <p className="text-sm text-zinc-400">フォルダはまだありません。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {folders.map((folder) => (
                <li
                  key={folder.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Link
                    href={`/folder/${folder.id}`}
                    className="flex min-w-0 flex-1 items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <span>📁</span>
                    <span className="truncate font-medium text-zinc-800 dark:text-zinc-100">
                      {folder.name}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {folder.pdfCount}件
                    </span>
                  </Link>
                  <button
                    onClick={() => deleteFolder(folder)}
                    className="ml-4 shrink-0 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            未分類のPDF
          </h2>
          {pdfs === null ? (
            <p className="text-sm text-zinc-400">読み込み中...</p>
          ) : unfiledPdfs.length === 0 ? (
            <p className="text-sm text-zinc-400">未分類のPDFはありません。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {unfiledPdfs.map((pdf) => (
                <li
                  key={pdf.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <Link
                    href={`/pdf/${pdf.id}`}
                    className="min-w-0 flex-1 truncate font-medium text-zinc-800 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                  >
                    {pdf.filename}
                  </Link>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {pdf.pageCount}ページ ・{" "}
                    {new Date(pdf.uploadedAt).toLocaleDateString("ja-JP")}
                  </span>
                  {folders && folders.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) movePdf(pdf.id, e.target.value);
                        e.target.value = "";
                      }}
                      defaultValue=""
                      className="shrink-0 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="" disabled>
                        フォルダへ移動
                      </option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => deletePdf(pdf)}
                    className="shrink-0 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
