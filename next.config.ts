import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas (used by pdfjs-dist for server-side page rendering, via
  // lib/pdf.ts) loads a native .node addon in a way Turbopack can't bundle;
  // keep it (and pdfjs-dist, which requires it) external so it's loaded via
  // plain `require` at runtime instead.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
};

export default nextConfig;
