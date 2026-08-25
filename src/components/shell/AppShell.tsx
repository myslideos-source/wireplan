import type { ReactNode } from "react";
import { Rail } from "./Rail";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-bg">
      <Rail />
      <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
        {children}
      </main>
    </div>
  );
}
