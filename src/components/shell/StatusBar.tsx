import { CheckCircle2, CloudCheck } from "lucide-react";

export function StatusBar() {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between border-t border-shell-border bg-shell-bg px-6 text-xs text-shell-text-muted">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-shell-accent" />
        Keine Fehler
      </div>
      <div className="text-shell-text-muted">WIREPLAN v0.1 — Phase 7</div>
      <div className="flex items-center gap-1.5">
        <CloudCheck className="h-3.5 w-3.5 text-shell-accent" />
        Änderungen gespeichert
      </div>
    </footer>
  );
}
