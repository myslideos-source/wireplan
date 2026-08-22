"use client";

import * as React from "react";
import { Modal, Button } from "@/components/ui";
import { formatArea } from "@/lib/utils";
import { isAxisAlignedRectangle, splitRectangle, type SplitDirection } from "./geometry-utils";
import { polygonAreaSqMeters } from "@/domain";
import { useEditorStore } from "./store";
import type { Room } from "@/domain";

export function SplitRoomDialog({
  room,
  open,
  onClose,
  onSuccess,
}: {
  room: Room;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const splitRoom = useEditorStore((state) => state.splitRoom);
  const [direction, setDirection] = React.useState<SplitDirection>("vertical");
  const [ratio, setRatio] = React.useState(50);
  const [nameA, setNameA] = React.useState(`${room.name} 1`);
  const [nameB, setNameB] = React.useState(`${room.name} 2`);
  const [error, setError] = React.useState<string | null>(null);

  const canSplit = isAxisAlignedRectangle(room.polygon);
  const preview = canSplit
    ? splitRectangle(room.polygon, direction, ratio / 100)
    : null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const success = splitRoom(room.id, direction, ratio / 100, nameA.trim(), nameB.trim());
    if (!success) {
      setError("Automatische Teilung ist nur für rechteckige Räume verfügbar.");
      return;
    }
    onSuccess();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raum teilen"
      description={`${room.name} in zwei Räume aufteilen.`}
    >
      {!canSplit ? (
        <p className="text-sm text-warning">
          Automatische Teilung ist nur für rechteckige Räume verfügbar. Dieser
          Raum hat eine unregelmäßige Form.
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-secondary">
              Trennlinie
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={direction === "vertical" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setDirection("vertical")}
              >
                Links / Rechts
              </Button>
              <Button
                type="button"
                variant={direction === "horizontal" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setDirection("horizontal")}
              >
                Oben / Unten
              </Button>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-secondary">
              Teilungsverhältnis
            </span>
            <input
              type="range"
              min={10}
              max={90}
              value={ratio}
              onChange={(event) => setRatio(Number(event.target.value))}
            />
          </label>

          {preview && (
            <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2 text-xs text-text-secondary">
              <div>
                <p className="text-text-muted">Raum A</p>
                <p className="tabular-nums-font font-medium text-text">
                  {formatArea(polygonAreaSqMeters(preview.polyA))}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Raum B</p>
                <p className="tabular-nums-font font-medium text-text">
                  {formatArea(polygonAreaSqMeters(preview.polyB))}
                </p>
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-text-secondary">Name Raum A</span>
            <input
              value={nameA}
              onChange={(event) => setNameA(event.target.value)}
              required
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/60"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-text-secondary">Name Raum B</span>
            <input
              value={nameB}
              onChange={(event) => setNameB(event.target.value)}
              required
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/60"
            />
          </label>

          {error && <p className="text-xs text-error">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit">Räume erstellen</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
