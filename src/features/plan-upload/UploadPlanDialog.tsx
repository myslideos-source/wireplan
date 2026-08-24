"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileText, X, Loader2, AlertTriangle } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Project } from "@/domain";
import { renderPdfPages } from "./pdf-pages";
import { detectFloorLabel, sequentialFallbackName, type PageDraft } from "./floor-detection";
import {
  SinglePlanForm,
  MultiPageReview,
  type StartFloorInput,
} from "@/features/editor/StartFloorDialog";
import { useNewFloorDraftStore, type NewFloorDraftEntry } from "@/features/editor/new-floor-draft-store";
import { useRealAnalysisStore } from "@/features/plan-analysis/real-analysis-store";
import type { RealAnalysisResult } from "@/features/plan-analysis/types";

const ACCEPTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"];

let nextUploadFloorId = 1;

/** Fire-and-forget informational plausibility check (Google Gemini) —
 * runs alongside the real 1:1 floor creation below, never gates or slows
 * it down. Its result only ever powers the separate, optional "Analyse"
 * pages; a failure here (e.g. no API key configured) is silent, since
 * nothing in this dialog claims it succeeded. */
function runBackgroundAnalysis(
  file: File,
  projectId: string,
  setResult: (result: RealAnalysisResult, projectId: string) => void,
) {
  const formData = new FormData();
  formData.append("file", file);
  fetch("/api/analyze-plan", { method: "POST", body: formData })
    .then(async (response) => {
      if (!response.ok) return;
      const body = (await response.json()) as RealAnalysisResult;
      setResult(body, projectId);
    })
    .catch(() => {});
}

function UploadPlanDialogContent({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const router = useRouter();
  const setDraft = useNewFloorDraftStore((state) => state.setDraft);
  const setAnalysisResult = useRealAnalysisStore((state) => state.setResult);

  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
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
    if (!ACCEPTED_MIME_TYPES.includes(selected.type)) {
      setError("Format nicht unterstützt — bitte PDF, PNG oder JPG hochladen.");
      setFile(null);
      return;
    }

    runBackgroundAnalysis(selected, project.id, setAnalysisResult);

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

  function handleCreate(inputs: StartFloorInput[]) {
    const floors: NewFloorDraftEntry[] = inputs.map((input) => ({
      geometry: {
        floor: {
          id: `floor-upload-${nextUploadFloorId++}`,
          projectId: project.id,
          name: input.name,
          level: input.level,
        },
        rooms: [],
      },
      backgroundImage: input.backgroundImage,
    }));
    setDraft({ project, floors });
    onClose();
    router.push("/editor/draft");
  }

  if (pageDrafts) {
    return (
      <MultiPageReview drafts={pageDrafts} onChange={setPageDrafts} onCreate={handleCreate} onClose={onClose} />
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
        suggestedName="Erdgeschoss"
        suggestedLevel={0}
        backgroundImage={singleImage}
        onCreate={handleCreate}
        onClose={onClose}
      />
    );
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
          handleFile(event.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-bg px-6 py-8 text-center transition-colors hover:border-primary/60",
          dragActive && "border-primary/60 bg-primary/5",
        )}
      >
        <UploadCloud className="h-8 w-8 text-text-muted" />
        <p className="text-sm font-medium text-text">Grundriss hierher ziehen oder klicken</p>
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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Schließen
        </Button>
      </div>
    </div>
  );
}

export function UploadPlanDialog({
  project,
  className,
}: {
  project: Project;
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
        description="Der Originalplan wird 1:1 als fixiertes Bild übernommen — nie automatisch neu gezeichnet oder interpretiert."
        className="max-w-lg"
      >
        <UploadPlanDialogContent project={project} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
