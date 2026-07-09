"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import TabBar from "@/components/TabBar";
import SummaryTab from "@/components/tabs/SummaryTab";
import QuizTab from "@/components/tabs/QuizTab";
import FlashcardsTab from "@/components/tabs/FlashcardsTab";
import MindmapTab from "@/components/tabs/MindmapTab";
import MemorizeTab from "@/components/tabs/MemorizeTab";
import type { JumpRequest, TabId } from "@/lib/types";

// react-pdf/pdfjs-dist reference browser-only globals (e.g. DOMMatrix) at
// module scope, which crashes if evaluated during server-side rendering.
const PdfViewerTab = dynamic(() => import("@/components/tabs/PdfViewerTab"), {
  ssr: false,
});

export default function Pane({
  pdfId,
  initialTab = "pdf",
}: {
  pdfId: string;
  initialTab?: TabId;
}) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [jumpRequest, setJumpRequest] = useState<JumpRequest | null>(null);

  // Tabs stay mounted (just hidden) once visited, instead of being
  // unmounted on switch, so in-progress state (e.g. a quiz in progress)
  // survives jumping to the PDF tab and back. Tabs never visited are not
  // mounted at all, so features like summary don't auto-generate (and
  // spend API cost) before the user opens that tab.
  const [visited, setVisited] = useState<ReadonlySet<TabId>>(() => new Set([initialTab]));
  if (!visited.has(activeTab)) {
    setVisited(new Set(visited).add(activeTab));
  }

  const handleJumpToPage = useCallback((page: number) => {
    setActiveTab("pdf");
    setJumpRequest({ page, nonce: Date.now() });
  }, []);

  const paneClass = (tab: TabId) =>
    `h-full ${activeTab === tab ? "" : "hidden"}`;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <TabBar active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        {visited.has("pdf") && (
          <div className={paneClass("pdf")}>
            <PdfViewerTab pdfId={pdfId} jumpRequest={jumpRequest} />
          </div>
        )}
        {visited.has("summary") && (
          <div className={paneClass("summary")}>
            <SummaryTab pdfId={pdfId} />
          </div>
        )}
        {visited.has("quiz") && (
          <div className={paneClass("quiz")}>
            <QuizTab pdfId={pdfId} onJumpToPage={handleJumpToPage} />
          </div>
        )}
        {visited.has("flashcards") && (
          <div className={paneClass("flashcards")}>
            <FlashcardsTab pdfId={pdfId} onJumpToPage={handleJumpToPage} />
          </div>
        )}
        {visited.has("mindmap") && (
          <div className={paneClass("mindmap")}>
            <MindmapTab pdfId={pdfId} />
          </div>
        )}
        {visited.has("memorize") && (
          <div className={paneClass("memorize")}>
            <MemorizeTab pdfId={pdfId} onJumpToPage={handleJumpToPage} />
          </div>
        )}
      </div>
    </div>
  );
}
