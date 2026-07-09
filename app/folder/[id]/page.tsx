"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import FolderQuizView from "@/components/folder/FolderQuizView";
import FolderMemorizeView from "@/components/folder/FolderMemorizeView";
import type { FolderRecord, PdfRecord } from "@/lib/schemas";

type FolderTab = "quiz" | "memorize";

export default function FolderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const folderId = params.id;

  const [folder, setFolder] = useState<FolderRecord | null>(null);
  const [pdfs, setPdfs] = useState<PdfRecord[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<FolderTab>("quiz");
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<FolderTab>>(() => new Set(["quiz"]));
  if (!visitedTabs.has(activeTab)) {
    setVisitedTabs(new Set(visitedTabs).add(activeTab));
  }
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/folders/${folderId}`);
    if (!res.ok) {
      setNotFound(true);
      return;
    }
    const data = await res.json();
    setFolder(data.folder);
    setPdfs(data.pdfs);
  }, [folderId]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const uploadFile = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderId", folderId);
      const res = await fetch("/api/pdfs", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "アップロードに失敗しました");
      await load();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const removePdfFromFolder = async (pdfId: string) => {
    await fetch(`/api/pdfs/${pdfId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: null }),
    });
    await load();
  };

  const deletePdf = async (pdf: PdfRecord) => {
    if (!window.confirm(`「${pdf.filename}」を完全に削除します。この操作は取り消せません。よろしいですか？`)) {
      return;
    }
    await fetch(`/api/pdfs/${pdf.id}`, { method: "DELETE" });
    await load();
  };

  const deleteFolder = async () => {
    if (
      !window.confirm(
        `フォルダ「${folder?.name}」と、中の${pdfs?.length ?? 0}件のPDFをすべて完全に削除します。この操作は取り消せません。よろしいですか？`
      )
    ) {
      return;
    }
    await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    router.push("/");
  };

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-500">指定されたフォルダが見つかりませんでした。</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <Link
          href="/"
          className="shrink-0 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← 一覧
        </Link>
        <h1 className="flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          📁 {folder?.name ?? "読み込み中..."}
        </h1>
        <button
          onClick={deleteFolder}
          className="shrink-0 rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          フォルダを削除
        </button>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) uploadFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-6 text-center transition-colors ${
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {uploading ? "アップロード中..." : "PDFを追加"}
            </p>
          </div>
          {uploadError && (
            <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
          )}

          <div className="flex flex-col gap-2">
            {pdfs === null ? (
              <p className="text-xs text-zinc-400">読み込み中...</p>
            ) : pdfs.length === 0 ? (
              <p className="text-xs text-zinc-400">このフォルダにPDFはまだありません。</p>
            ) : (
              pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <Link
                    href={`/pdf/${pdf.id}`}
                    className="block truncate text-sm font-medium text-zinc-700 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-blue-400"
                  >
                    {pdf.filename}
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{pdf.pageCount}ページ</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => removePdfFromFolder(pdf.id)}
                        className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        フォルダから出す
                      </button>
                      <button
                        onClick={() => deletePdf(pdf)}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setActiveTab("quiz")}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "quiz"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              クイズ
            </button>
            <button
              onClick={() => setActiveTab("memorize")}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "memorize"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              暗記
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {pdfs && pdfs.length === 0 ? (
              <p className="p-6 text-sm text-zinc-400">
                フォルダにPDFを追加すると、テストや暗記を作成できます。
              </p>
            ) : (
              <>
                {visitedTabs.has("quiz") && (
                  <div className={activeTab === "quiz" ? "h-full" : "hidden"}>
                    <FolderQuizView folderId={folderId} />
                  </div>
                )}
                {visitedTabs.has("memorize") && (
                  <div className={activeTab === "memorize" ? "h-full" : "hidden"}>
                    <FolderMemorizeView folderId={folderId} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
