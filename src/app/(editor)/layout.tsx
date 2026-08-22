import type { ReactNode } from "react";
import { TopNav } from "@/components/shell/TopNav";

/**
 * The editor gets its own full-bleed layout (§34): TopNav stays for global
 * navigation, but the generic Dashboard/Projekte/... sidebar is replaced
 * entirely by the editor's own tool palette + layers panel.
 */
export default function EditorGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-bg">
      <TopNav />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
