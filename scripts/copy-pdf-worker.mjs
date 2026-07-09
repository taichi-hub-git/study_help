// react-pdf bundles its own pdfjs-dist version; the worker file served to the
// browser must match that exact version, so it's copied from react-pdf's
// nested dependency (not the top-level pdfjs-dist used for server-side text
// extraction) rather than fetched from a CDN.
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const src = path.join(
  process.cwd(),
  "node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
);
const dest = path.join(process.cwd(), "public/pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.warn(`[copy-pdf-worker] source not found: ${src}`);
  process.exit(0);
}
copyFileSync(src, dest);
console.log(`[copy-pdf-worker] copied worker to ${dest}`);
