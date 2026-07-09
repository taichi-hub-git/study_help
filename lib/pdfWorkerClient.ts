"use client";

import { pdfjs } from "react-pdf";

// Served locally from /public (see scripts/copy-pdf-worker.mjs) so the app
// never depends on a CDN for the pdf.js worker.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
