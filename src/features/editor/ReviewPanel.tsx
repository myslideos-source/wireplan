"use client";

import * as React from "react";
import {
  X,
  Check,
  Scissors,
  Combine,
  Trash2,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import type { FlaggedArea } from "@/features/plan-analysis/types";
import type { Room } from "@/domain";
import { useEditorStore } from "./store";
import { SplitRoomDialog } from "./SplitRoomDialog";
import { MergeRoomsDialog } from "./MergeRoomsDialog";

export function ReviewPanel() {
  const reviewActive = useEditorStore((state) => state.reviewActive);
  const reviewQueue = useEditorStore((state) => state.reviewQueue);
  const reviewIndex = useEditorStore((state) => state.reviewIndex);
  const goToProblem = useEditorStore((state) => state.goToProblem);
  const nextProblem = useEditorStore((state) => state.nextProblem);
  const exitReview = useEditorStore((state) => state.exitReview);
  const rooms = useEditorStore((state) => state.rooms);

  const problem = reviewQueue[reviewIndex];
  if (!reviewActive || !problem) return null;

  const targetRoom =
    problem.target?.type === "room"
      ? rooms.find((r) => r.id === problem.target?.id)
      : undefined;

  return (
    <div className="absolute right-4 top-4 z-20 w-80 rounded-[var(--radius-lg)] border border-border bg-panel-elevated shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Badge tone={problem.severity === "critical" ? "error" : "warning"}>
          Problem {reviewIndex + 1} von {reviewQueue.length}
        </Badge>
        <button
          type="button"
          onClick={exitReview}
          aria-label="Review beenden"
          className="rounded-[var(--radius-sm)] p-1 text-text-muted hover:bg-panel hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Keying by problem id resets all local (dialog/confirm) UI state
          whenever the reviewer moves to a different problem. */}
      <ReviewProblemBody
        key={problem.id}
        problem={problem}
        targetRoom={targetRoom}
        onAdvance={nextProblem}
      />

      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <button
          type="button"
          disabled={reviewIndex === 0}
          onClick={() => goToProblem(reviewIndex - 1)}
          className="flex items-center gap-1 text-xs text-text-secondary disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Zurück
        </button>
        <div className="flex gap-1">
          {reviewQueue.map((area, index) => (
            <span
              key={area.id}
              className={
                "h-1.5 w-1.5 rounded-full " +
                (index === reviewIndex ? "bg-primary" : "bg-border")
              }
            />
          ))}
        </div>
        <button
          type="button"
          disabled={reviewIndex === reviewQueue.length - 1}
          onClick={() => goToProblem(reviewIndex + 1)}
          className="flex items-center gap-1 text-xs text-text-secondary disabled:opacity-30"
        >
          Weiter
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ReviewProblemBody({
  problem,
  targetRoom,
  onAdvance,
}: {
  problem: FlaggedArea;
  targetRoom: Room | undefined;
  onAdvance: () => void;
}) {
  const deleteOpening = useEditorStore((state) => state.deleteOpening);
  const [splitOpen, setSplitOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [showWallHint, setShowWallHint] = React.useState(false);

  const target = problem.target;

  return (
    <>
      <div className="flex flex-col gap-3 px-4 py-4">
        <div>
          <h3 className="text-sm font-semibold text-text">{problem.title}</h3>
          <p className="mt-1 text-xs text-text-secondary">{problem.description}</p>
        </div>

        {showWallHint && (
          <p className="flex items-start gap-1.5 rounded-[var(--radius-sm)] border border-secondary/30 bg-secondary/10 px-2.5 py-2 text-xs text-text-secondary">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
            Passen Sie Länge und Wandstärke rechts im Inspector an, dann
            weiter mit „Korrekt“.
          </p>
        )}

        {confirmingDelete && (
          <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-error/30 bg-error/10 px-2.5 py-2 text-xs text-text">
            Element wirklich löschen?
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (target?.type === "opening") deleteOpening(target.id);
                  onAdvance();
                }}
                className="rounded-[var(--radius-sm)] bg-error px-2 py-1 font-medium text-white"
              >
                Ja, löschen
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-text-secondary"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={onAdvance}>
            <Check className="h-3.5 w-3.5" />
            Korrekt
          </Button>

          {target?.type === "room" && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setSplitOpen(true)}>
                <Scissors className="h-3.5 w-3.5" />
                Raum teilen
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setMergeOpen(true)}>
                <Combine className="h-3.5 w-3.5" />
                Räume verbinden
              </Button>
            </>
          )}

          {target?.type === "wall" && (
            <Button size="sm" variant="secondary" onClick={() => setShowWallHint(true)}>
              <Wand2 className="h-3.5 w-3.5" />
              Wand korrigieren
            </Button>
          )}

          {target?.type === "opening" && (
            <Button size="sm" variant="secondary" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Löschen
            </Button>
          )}

          <Button size="sm" variant="ghost" onClick={onAdvance}>
            <SkipForward className="h-3.5 w-3.5" />
            Überspringen
          </Button>
        </div>
      </div>

      {targetRoom && (
        <SplitRoomDialog
          room={targetRoom}
          open={splitOpen}
          onClose={() => setSplitOpen(false)}
          onSuccess={() => {
            setSplitOpen(false);
            onAdvance();
          }}
        />
      )}
      {targetRoom && (
        <MergeRoomsDialog
          room={targetRoom}
          open={mergeOpen}
          onClose={() => setMergeOpen(false)}
          onSuccess={() => {
            setMergeOpen(false);
            onAdvance();
          }}
        />
      )}
    </>
  );
}
