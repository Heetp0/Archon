import React from "react";
import { NotebookProvider, useNotebookContext } from "@/context/NotebookContext";
import NotebookSidebar from "../notebook/NotebookSidebar";
import ChatArea from "../notebook/ChatArea";
import SourceDrawer from "../notebook/SourceDrawer";
import CitationModal from "../notebook/CitationModal";
import StudioModal from "../notebook/StudioModal";
import StudioPanel from "../notebook/StudioPanel";

function NotebookModeContent() {
  const { selectedCitation, setSelectedCitation, isStudioOpen } = useNotebookContext();

  return (
    <div className="flex h-full w-full overflow-hidden bg-app-bg text-text-primary">
      {/* Sidebar Panel (Left) */}
      <NotebookSidebar />

      {/* Main Chat Panel (Center) */}
      <ChatArea />

      {/* Studio Panel (Right, Collapsible) */}
      {isStudioOpen && <StudioPanel />}

      {/* Right Upload Drawer */}
      <SourceDrawer />

      {/* Clickable Citation Detail View */}
      <CitationModal
        citation={selectedCitation}
        onOpenChange={(open) => { if (!open) setSelectedCitation(null); }}
      />

      {/* Full-screen Studio Artifact View */}
      <StudioModal />
    </div>
  );
}

export default function NotebookMode() {
  return (
    <NotebookProvider>
      <NotebookModeContent />
    </NotebookProvider>
  );
}
