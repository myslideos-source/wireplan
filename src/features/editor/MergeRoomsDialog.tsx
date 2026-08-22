"use client";

import * as React from "react";
import { Modal, Button } from "@/components/ui";
import { formatArea } from "@/lib/utils";
import { tryMergeAdjacentRects } from "./geometry-utils";
import { polygonAreaSqMeters } from "@/domain";
import { useEditorStore } from "./store";
import type { Room } from "@/domain";

export function MergeRoomsDialog({
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
  const rooms = useEditorStore((state) => state.rooms);
  const mergeRooms = useEditorStore((state) => state.mergeRooms);
  const [error, setError] = React.useState<string | null>(null);

  const candidates = React.useMemo(
    () =>
      rooms
        .filter((other) => other.id !== room.id)
        .map((other) => ({
          room: other,
          merge: tryMergeAdjacentRects(room.polygon, other.polygon),
        }))
        .filter((entry) => entry.merge !== null),
    [rooms, room],
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(
    candidates[0]?.room.id ?? null,
  );
  const [name, setName] = React.useState(room.name);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    const success = mergeRooms(room.id, selectedId, name.trim());
    if (!success) {
      setError("Diese Räume lassen sich nicht automatisch zusammenführen.");
      return;
    }
    onSuccess();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Räume verbinden"
      description={`${room.name} mit einem angrenzenden Raum zusammenführen.`}
    >
      {candidates.length === 0 ? (
        <p className="text-sm text-warning">
          Keine angrenzenden Räume gefunden, die sich automatisch mit „
          {room.name}“ zusammenführen lassen.
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-secondary">
              Mit welchem Raum verbinden?
            </span>
            {candidates.map(({ room: candidate, merge }) => (
              <label
                key={candidate.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="merge-candidate"
                    checked={selectedId === candidate.id}
                    onChange={() => setSelectedId(candidate.id)}
                  />
                  {candidate.name}
                </span>
                {merge && (
                  <span className="tabular-nums-font text-xs text-text-muted">
                    neu: {formatArea(polygonAreaSqMeters(merge.polygon))}
                  </span>
                )}
              </label>
            ))}
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-text-secondary">
              Name des zusammengeführten Raums
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/60"
            />
          </label>

          {error && <p className="text-xs text-error">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!selectedId}>
              Räume verbinden
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
