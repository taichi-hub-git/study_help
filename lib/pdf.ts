import "server-only";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
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

// Bundled font/CMap resources, needed so text using non-embedded standard
// fonts or CJK encodings renders (and therefore color-samples) correctly.
const STANDARD_FONT_DATA_URL =
  pathToFileURL(path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/")).href + "/";
const CMAP_URL =
  pathToFileURL(path.join(process.cwd(), "node_modules/pdfjs-dist/cmaps/")).href + "/";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  /** Text runs whose rendered ink color isn't black/gray (e.g. red text used
   * for emphasis in the source slides) — a strong "this may be on the test"
   * signal, kept separate from the full page text. */
  emphasizedText: string;
}

const RENDER_SCALE = 1.5;
// A pixel lighter than this (0-255 luma) is treated as background/paper,
// not glyph ink, when averaging a text item's rendered color.
const INK_LUMA_THRESHOLD = 200;
// A color whose channels are all within this range of each other reads as
// black/gray/neutral ink (ordinary body text), not an emphasis color.
const GRAYSCALE_CHANNEL_SPREAD = 24;

function isEmphasisColor(r: number, g: number, b: number): boolean {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread > GRAYSCALE_CHANNEL_SPREAD;
}

/** Averages the "ink" pixels (i.e. not background) within a text item's
 * rendered bounding box to get its effective color, then classifies it as
 * emphasized if that color isn't black/gray. Rendering happens once per
 * page and every item on the page reads from the same ImageData. */
function isItemEmphasized(
  item: { transform: number[]; width: number; height: number },
  convertPoint: (x: number, y: number) => number[],
  imageData: { data: Uint8ClampedArray; width: number; height: number }
): boolean {
  const [, , , , e, f] = item.transform;
  const corners = [
    [e, f],
    [e + item.width, f],
    [e, f + item.height],
    [e + item.width, f + item.height],
  ].map(([x, y]) => convertPoint(x, y));

  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(imageData.width - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(imageData.height - 1, Math.ceil(Math.max(...ys)));
  if (maxX <= minX || maxY <= minY) return false;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let inkCount = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * imageData.width + x) * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma < INK_LUMA_THRESHOLD) {
        rSum += r;
        gSum += g;
        bSum += b;
        inkCount++;
      }
    }
  }
  if (inkCount === 0) return false;
  return isEmphasisColor(rSum / inkCount, gSum / inkCount, bSum / inkCount);
}

export async function extractPdfPages(data: Uint8Array): Promise<ExtractedPage[]> {
  const loadingTask = getDocument({
    data,
    useSystemFonts: true,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
  });
  const doc = await loadingTask.promise;
  const pages: ExtractedPage[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    // @napi-rs/canvas's context implements the subset of the DOM
    // CanvasRenderingContext2D API that pdfjs actually uses at render time
    // (verified empirically), but not its full type surface (e.g. the
    // unused `drawFocusIfNeeded` a11y method) — hence the cast.
    const [textContent] = await Promise.all([
      page.getTextContent(),
      page.render({
        canvas: null,
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise,
    ]);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const convertPoint = (x: number, y: number) => viewport.convertToViewportPoint(x, y);

    const textParts: string[] = [];
    const emphasizedParts: string[] = [];
    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      textParts.push(item.str);
      if (isItemEmphasized(item, convertPoint, imageData)) {
        emphasizedParts.push(item.str);
      }
    }

    pages.push({
      pageNumber,
      text: textParts.join(" ").replace(/\s+/g, " ").trim(),
      emphasizedText: emphasizedParts.join(" ").replace(/\s+/g, " ").trim(),
    });
  }

  await loadingTask.destroy();
  return pages;
}
