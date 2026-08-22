"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Sparkles } from "lucide-react";
import { Button, Modal, Badge } from "@/components/ui";
import { isFeatureEnabled } from "@/lib/feature-flags";
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
  const [files, setFiles] = React.useState<StagedFile[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const aiEnabled = isFeatureEnabled("AI_PLAN_ANALYSIS");

  function stageFiles(fileList: FileList | null) {
    if (!fileList) return;
    const staged = Array.from(fileList).map((file) => ({
      file,
      valid: ACCEPTED_MIME_TYPES.includes(file.type),
    }));
    setFiles((current) => [...current, ...staged]);
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
        <p className="text-xs text-text-muted">PDF, PNG, JPG · mehrere Pläne möglich</p>
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
          {aiEnabled
            ? "Nach dem Hochladen startet die KI-Analyse automatisch."
            : "Die KI-Grundrissanalyse folgt in Phase 2. Ihre Pläne werden hier bereits entgegengenommen, aber noch nicht automatisch digitalisiert."}
        </span>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Schließen
        </Button>
        <Button
          type="button"
          disabled={files.length === 0 || files.some((f) => !f.valid) || !aiEnabled}
          title={!aiEnabled ? "KI-Analyse folgt in Phase 2 — Demnächst" : undefined}
          onClick={() => {
            onClose();
            router.push(`/analysis?project=${projectId}`);
          }}
        >
          {aiEnabled ? "Analyse starten" : "Analyse starten — Demnächst"}
        </Button>
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
