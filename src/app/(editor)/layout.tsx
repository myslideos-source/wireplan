import type { ReactNode } from "react";
import { TopNavigation } from "@/components/shell/TopNavigation";

/**
 * §Phase20 — the editor gets its own full-bleed content area (floor tabs
 * + tool sidebar + canvas + properties panel, built by EditorWorkspace)
 * sitting under the same global TopNavigation every other page uses,
 * instead of stacking a second nav bar on top of the editor's own
 * project/floor bar.
 */
export default function EditorGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-bg">
      <TopNavigation />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
