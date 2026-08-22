"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Sparkles, Loader2 } from "lucide-react";
import { Button, Modal, Badge } from "@/components/ui";
import { useRealAnalysisStore } from "@/features/plan-analysis/real-analysis-store";
import type { RealAnalysisResult } from "@/features/plan-analysis/types";
import { cn } from "@/lib/utils";

const ACCEPTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg";

interface StagedFile {
  file: File;
  valid: boolean;
}

function UploadPlanDialogContent({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const setResult = useRealAnalysisStore((state) => state.setResult);
  const [files, setFiles] = React.useState<StagedFile[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const hasValidFile = files.length > 0 && files.every((f) => f.valid);

  function stageFiles(fileList: FileList | null) {
    if (!fileList) return;
    const staged = Array.from(fileList).map((file) => ({
      file,
      valid: ACCEPTED_MIME_TYPES.includes(file.type),
    }));
    setFiles((current) => [...current, ...staged]);
    setError(null);
  }

  async function startAnalysis() {
    const target = files[0];
    if (!target) return;

    setAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", target.file);
      const response = await fetch("/api/analyze-plan", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Analyse fehlgeschlagen.");
      }
      setResult(body as RealAnalysisResult);
      onClose();
      router.push("/analysis/real");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyse fehlgeschlagen.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          stageFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-bg px-6 py-8 text-center transition-colors",
          dragActive && "border-primary/60 bg-primary/5",
        )}
      >
        <UploadCloud className="h-8 w-8 text-text-muted" />
        <p className="text-sm font-medium text-text">
          Grundriss hierher ziehen oder klicken
        </p>
        <p className="text-xs text-text-muted">
          PDF, PNG, JPG · nur der erste Plan wird analysiert
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(event) => stageFiles(event.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((staged, index) => (
            <li
              key={`${staged.file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="truncate text-sm text-text">
                  {staged.file.name}
                </span>
                {!staged.valid && (
                  <Badge tone="error">Format nicht unterstützt</Badge>
                )}
              </div>
              <button
                type="button"
                aria-label="Datei entfernen"
                onClick={() =>
                  setFiles((current) => current.filter((_, i) => i !== index))
                }
                className="text-text-muted hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2.5 text-xs text-text-secondary">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
        <span>
          Nach dem Hochladen wertet eine echte KI (Google Gemini) Ihren
          Grundriss aus — Räume, Wände, Türen und Fenster werden gezählt.
          Eine bearbeitbare digitale Geometrie entsteht dabei noch nicht;
          nutzen Sie dafür den Editor.
        </span>
      </div>

      {error && (
        <p className="rounded-[var(--radius-sm)] border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-xs text-text-muted underline-offset-2 hover:text-text hover:underline"
          onClick={() => {
            onClose();
            router.push(`/analysis?project=${projectId}`);
          }}
        >
          Stattdessen Demo-Analyse ansehen
        </button>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Schließen
          </Button>
          <Button
            type="button"
            disabled={!hasValidFile || analyzing}
            onClick={startAnalysis}
          >
            {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
            {analyzing ? "Analysiere…" : "Analyse starten"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UploadPlanDialog({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="secondary" className={className} onClick={() => setOpen(true)}>
        <UploadCloud className="h-4 w-4" />
        Grundriss hochladen
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Grundriss hochladen"
        description="Unterstützte Formate: PDF, PNG, JPG, JPEG."
      >
        <UploadPlanDialogContent projectId={projectId} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
