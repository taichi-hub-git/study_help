"use client";

import { useRef, useState } from "react";

export default function UploadDropzone({
  onFiles,
  uploading,
  progressLabel,
  hint,
  size = "large",
}: {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  progressLabel?: string;
  hint?: string;
  size?: "large" | "compact";
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickPdfFiles = (fileList: FileList | null): File[] => {
    if (!fileList) return [];
    return Array.from(fileList).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
  };

  const sizeClass =
    size === "large"
      ? "flex-col gap-2 px-6 py-12"
      : "flex-col gap-1 px-3 py-6";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = pickPdfFiles(e.dataTransfer.files);
        if (files.length > 0) onFiles(files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors ${sizeClass} ${
        dragOver
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = pickPdfFiles(e.target.files);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <p className={size === "large" ? "text-sm text-zinc-600 dark:text-zinc-300" : "text-xs text-zinc-500 dark:text-zinc-400"}>
          {progressLabel ?? "アップロード中・テキスト抽出＆要約生成中..."}
        </p>
      ) : size === "large" ? (
        <>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            PDFをドラッグ&ドロップ、またはクリックして選択（複数可）
          </p>
          {hint && <p className="text-xs text-zinc-400">{hint}</p>}
        </>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">PDFを追加（複数可）</p>
      )}
    </div>
  );
}
