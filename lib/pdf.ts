import "server-only";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// pdfjs-dist runs a "fake worker" in Node by dynamically importing this file at
// runtime; without an explicit absolute path the bundler-relative "./pdf.worker.mjs"
// default fails to resolve once this module is bundled by Next.js.
GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
  )
).href;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export async function extractPdfPages(data: Uint8Array): Promise<ExtractedPage[]> {
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;
  const pages: ExtractedPage[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNumber, text });
  }

  await loadingTask.destroy();
  return pages;
}
