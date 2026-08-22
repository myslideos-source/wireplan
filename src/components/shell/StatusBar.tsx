import { CheckCircle2, CloudCheck } from "lucide-react";

export function StatusBar() {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-bg-secondary px-6 text-xs text-text-secondary">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        Keine Fehler
      </div>
      <div className="text-text-muted">WIREPLAN v0.1 — Phase 1</div>
      <div className="flex items-center gap-1.5">
        <CloudCheck className="h-3.5 w-3.5 text-success" />
        Änderungen gespeichert
      </div>
    </footer>
  );
}
