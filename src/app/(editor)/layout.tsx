import type { ReactNode } from "react";
import { Rail } from "@/components/shell/Rail";

/**
 * §Phase19 — the editor gets its own full-bleed content area (tool
 * palette + canvas + inspector, built by EditorWorkspace) sitting next to
 * the same global Rail every other page uses, instead of stacking a
 * second global nav bar on top of the editor's own project/floor bar.
 */
export default function EditorGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-bg">
      <Rail />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
