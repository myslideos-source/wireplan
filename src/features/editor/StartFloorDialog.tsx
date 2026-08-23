"use client";

import * as React from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button, Modal } from "@/components/ui";

export interface StartFloorInput {
  name: string;
  level: number;
  backgroundImage?: { dataUrl: string; naturalWidth: number; naturalHeight: number };
}

function StartFloorDialogContent({
  suggestedName,
  suggestedLevel,
  onCreate,
  onClose,
}: {
  suggestedName: string;
  suggestedLevel: number;
  onCreate: (input: StartFloorInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(suggestedName);
  const [level, setLevel] = React.useState(suggestedLevel);
  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (!file) {
      onCreate({ name: trimmedName, level });
      onClose();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        onCreate({
          name: trimmedName,
          level,
          backgroundImage: { dataUrl, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight },
        });
        onClose();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Name der Etage
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="z. B. Erdgeschoss"
          className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
        Ebene (0 = Erdgeschoss, 1 = 1. OG, -1 = Keller, ...)
        <input
          type="number"
          value={level}
          onChange={(event) => setLevel(Number(event.target.value))}
          className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-bg px-6 py-6 text-center transition-colors hover:border-primary/60"
      >
        <UploadCloud className="h-6 w-6 text-text-muted" />
        <p className="text-sm font-medium text-text">
          {file ? file.name : "Originalplan hochladen (optional)"}
        </p>
        <p className="text-xs text-text-muted">
          PNG, JPG — wird als fixierter Hintergrund übernommen, nie
          automatisch neu gezeichnet. Kann auch später über das Werkzeug
          &quot;Hintergrundbild&quot; hinzugefügt werden.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-text-muted" />
            <span className="truncate text-sm text-text">{file.name}</span>
          </div>
          <button
            type="button"
            aria-label="Datei entfernen"
            onClick={() => setFile(null)}
            className="text-text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="button" disabled={!name.trim()} onClick={handleSubmit}>
          Etage anlegen
        </Button>
      </div>
    </div>
  );
}

export function StartFloorDialog({
  suggestedName,
  suggestedLevel,
  triggerLabel,
  trigger,
  onCreate,
}: {
  suggestedName: string;
  suggestedLevel: number;
  triggerLabel: string;
  /** Custom trigger render — e.g. a compact icon button in a toolbar
   * instead of the default full-width primary button. */
  trigger?: (onOpen: () => void) => React.ReactNode;
  onCreate: (input: StartFloorInput) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {trigger ? trigger(() => setOpen(true)) : <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neue Etage anlegen"
        description="Der Originalplan wird als fixiertes Bild übernommen — nie automatisch neu gezeichnet oder interpretiert."
      >
        <StartFloorDialogContent
          suggestedName={suggestedName}
          suggestedLevel={suggestedLevel}
          onCreate={onCreate}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
