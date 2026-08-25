import type { ReactNode } from "react";
import { TopNavigation } from "./TopNavigation";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-bg">
      <TopNavigation />
      <main className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </main>
    </div>
  );
}
