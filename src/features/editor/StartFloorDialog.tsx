"use client";

import * as React from "react";
import { UploadCloud, FileText, X, Loader2, AlertTriangle } from "lucide-react";
import { Button, Modal, Badge } from "@/components/ui";
import { renderPdfPages } from "@/features/plan-upload/pdf-pages";
import {
  detectFloorLabel,
  sequentialFallbackName,
  type PageDraft,
} from "@/features/plan-upload/floor-detection";

export interface StartFloorInput {
  name: string;
  level: number;
  backgroundImage?: { dataUrl: string; naturalWidth: number; naturalHeight: number };
}

export function SinglePlanForm({
  suggestedName,
  suggestedLevel,
  backgroundImage,
  onCreate,
  onClose,
}: {
  suggestedName: string;
  suggestedLevel: number;
  backgroundImage: { dataUrl: string; naturalWidth: number; naturalHeight: number } | null;
  onCreate: (inputs: StartFloorInput[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(suggestedName);
  const [level, setLevel] = React.useState(suggestedLevel);

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onCreate([{ name: trimmedName, level, backgroundImage: backgroundImage ?? undefined }]);
    onClose();
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

      {backgroundImage && (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backgroundImage.dataUrl} alt="Vorschau des Originalplans" className="max-h-40 w-full object-contain" />
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

export function MultiPageReview({
  drafts,
  onChange,
  onCreate,
  onClose,
}: {
  drafts: PageDraft[];
  onChange: (drafts: PageDraft[]) => void;
  onCreate: (inputs: StartFloorInput[]) => void;
  onClose: () => void;
}) {
  const includedCount = drafts.filter((d) => d.include).length;

  function updateDraft(index: number, patch: Partial<PageDraft>) {
    onChange(drafts.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function handleSubmit() {
    const inputs: StartFloorInput[] = drafts
      .filter((d) => d.include && d.name.trim())
      .map((d) => ({
        name: d.name.trim(),
        level: d.level,
        backgroundImage: { dataUrl: d.page.dataUrl, naturalWidth: d.page.width, naturalHeight: d.page.height },
      }));
    if (inputs.length === 0) return;
    onCreate(inputs);
    onClose();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-secondary">
        {drafts.length} Seiten erkannt. Jede ausgewählte Seite wird 1:1 als
        eigene, fixierte Etage übernommen — der Plan wird dabei nie neu
        gezeichnet, nur zugeschnitten. Prüfen Sie die vorgeschlagenen Namen
        und korrigieren Sie sie bei Bedarf.
      </p>
      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
        {drafts.map((draft, index) => (
          <div
            key={draft.page.pageNumber}
            className="flex gap-3 rounded-[var(--radius-md)] border border-border bg-panel p-3"
          >
            <label className="flex items-start pt-1">
              <input
                type="checkbox"
                checked={draft.include}
                onChange={(event) => updateDraft(index, { include: event.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
            </label>
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.page.dataUrl}
                alt={`Seite ${draft.page.pageNumber}`}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-muted">
                  Seite {draft.page.pageNumber}
                </span>
                {draft.detectionFailed ? (
                  <Badge tone="warning">KI-Erkennung fehlgeschlagen</Badge>
                ) : draft.confidence !== null ? (
                  <Badge tone={draft.confidence >= 70 ? "success" : "warning"}>
                    {draft.confidence}% Konfidenz
                  </Badge>
                ) : null}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) => updateDraft(index, { name: event.target.value })}
                  disabled={!draft.include}
                  className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-sm text-text disabled:opacity-50"
                />
                <input
                  type="number"
                  value={draft.level}
                  onChange={(event) => updateDraft(index, { level: Number(event.target.value) })}
                  disabled={!draft.include}
                  title="Ebene"
                  className="w-16 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1.5 text-sm text-text disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="button" disabled={includedCount === 0} onClick={handleSubmit}>
          {includedCount} {includedCount === 1 ? "Etage" : "Etagen"} anlegen
        </Button>
      </div>
    </div>
  );
}

function StartFloorDialogContent({
  suggestedName,
  suggestedLevel,
  onCreate,
  onClose,
}: {
  suggestedName: string;
  suggestedLevel: number;
  onCreate: (inputs: StartFloorInput[]) => void;
  onClose: () => void;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [singleImage, setSingleImage] = React.useState<{
    dataUrl: string;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);
  const [pageDrafts, setPageDrafts] = React.useState<PageDraft[] | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [processingLabel, setProcessingLabel] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(selected: File | null) {
    setError(null);
    setSingleImage(null);
    setPageDrafts(null);
    setFile(selected);
    if (!selected) return;

    if (selected.type === "application/pdf") {
      setProcessing(true);
      setProcessingLabel("Seiten werden geladen…");
      try {
        const pages = await renderPdfPages(selected);
        if (pages.length === 0) {
          setError("Die PDF-Datei enthält keine lesbaren Seiten.");
          return;
        }
        if (pages.length === 1) {
          setSingleImage({ dataUrl: pages[0].dataUrl, naturalWidth: pages[0].width, naturalHeight: pages[0].height });
          return;
        }
        setProcessingLabel(`KI erkennt Geschosse (0/${pages.length})…`);
        const drafts: PageDraft[] = [];
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const detected = await detectFloorLabel(page, pages.length);
          const confident = detected && detected.confidence >= 40 && detected.label !== "Unbekannt";
          drafts.push({
            page,
            name: confident ? detected.label : sequentialFallbackName(i),
            level: detected ? detected.level : i,
            include: true,
            confidence: detected?.confidence ?? null,
            detectionFailed: !detected,
          });
          setProcessingLabel(`KI erkennt Geschosse (${i + 1}/${pages.length})…`);
        }
        setPageDrafts(drafts);
      } catch (err) {
        setError(
          err instanceof Error
            ? `PDF konnte nicht gelesen werden: ${err.message}`
            : "PDF konnte nicht gelesen werden.",
        );
      } finally {
        setProcessing(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        setSingleImage({ dataUrl, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(selected);
  }

  if (pageDrafts) {
    return (
      <MultiPageReview
        drafts={pageDrafts}
        onChange={setPageDrafts}
        onCreate={onCreate}
        onClose={onClose}
      />
    );
  }

  if (file && (singleImage || processing)) {
    if (processing) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-text-secondary">{processingLabel}</p>
        </div>
      );
    }
    return (
      <SinglePlanForm
        suggestedName={suggestedName}
        suggestedLevel={suggestedLevel}
        backgroundImage={singleImage}
        onCreate={onCreate}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-bg px-6 py-8 text-center transition-colors hover:border-primary/60"
      >
        <UploadCloud className="h-8 w-8 text-text-muted" />
        <p className="text-sm font-medium text-text">Originalplan hochladen</p>
        <p className="text-xs text-text-muted">
          PDF, PNG, JPG — wird 1:1 als fixierter Hintergrund übernommen, nie
          automatisch neu gezeichnet. Eine mehrseitige PDF wird automatisch
          in einzelne Etagen zerlegt (KI erkennt EG/OG anhand der
          Beschriftungen).
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {error && (
        <p className="flex items-start gap-1.5 rounded-[var(--radius-sm)] border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {file && !processing && !singleImage && (
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-text-muted" />
            <span className="truncate text-sm text-text">{file.name}</span>
          </div>
          <button
            type="button"
            aria-label="Datei entfernen"
            onClick={() => handleFile(null)}
            className="text-text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="text-xs text-text-muted underline-offset-2 hover:text-text hover:underline"
          onClick={() => {
            const trimmedName = suggestedName.trim() || "Erdgeschoss";
            onCreate([{ name: trimmedName, level: suggestedLevel }]);
            onClose();
          }}
        >
          Ohne Originalplan anlegen
        </button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Abbrechen
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
  onCreate: (inputs: StartFloorInput[]) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {trigger ? trigger(() => setOpen(true)) : <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neue Etage(n) anlegen"
        description="Der Originalplan wird 1:1 als fixiertes Bild übernommen — nie automatisch neu gezeichnet oder interpretiert."
        className="max-w-lg"
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
