"use client";

import type { ReactNode } from "react";
import { MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { wallLengthMeters } from "@/domain";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { formatArea, formatNumber } from "@/lib/utils";
import { useEditorStore } from "./store";

const ROOM_TYPES = [
  "Wohnzimmer",
  "Esszimmer",
  "Küche",
  "Schlafzimmer",
  "Bad",
  "Flur",
  "Arbeitszimmer",
  "Abstellraum",
  "Technikraum",
  "Sonstiges",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-border px-5 py-4 last:border-b-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-32 rounded-[var(--radius-sm)] border border-border bg-bg px-2 py-1 text-right text-sm text-text outline-none focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50";

function DemoField({ value }: { value: string }) {
  return (
    <input value={value} disabled className={inputClass} title="Demnächst" />
  );
}

export function EditorInspector() {
  const selected = useEditorStore((state) => state.selected);
  const rooms = useEditorStore((state) => state.rooms);
  const walls = useEditorStore((state) => state.walls);
  const updateRoom = useEditorStore((state) => state.updateRoom);
  const updateWallThickness = useEditorStore((state) => state.updateWallThickness);

  const electricalEnabled = isFeatureEnabled("ELECTRICAL_EDITOR");
  const loxoneEnabled = isFeatureEnabled("LOXONE");

  if (!selected) {
    return (
      <aside className="flex w-80 shrink-0 flex-col items-center justify-center gap-3 border-l border-border bg-bg-secondary px-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-elevated text-text-muted">
          <MousePointer2 className="h-4 w-4" />
        </span>
        <p className="text-sm text-text-secondary">
          Kein Element ausgewählt. Wählen Sie einen Raum oder eine Wand im
          Grundriss.
        </p>
      </aside>
    );
  }

  if (selected.type === "wall") {
    const wall = walls.find((w) => w.id === selected.id);
    if (!wall) return null;
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Wand
          </p>
          <h2 className="text-sm font-semibold text-text">{wall.id}</h2>
        </div>
        <Section title="Wand">
          <FieldRow label="Länge">
            <span className="tabular-nums-font text-sm font-medium text-text">
              {formatNumber(wallLengthMeters(wall), 2)} m
            </span>
          </FieldRow>
          <FieldRow label="Wandstärke">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step={10}
                min={60}
                max={400}
                value={wall.thickness}
                onChange={(event) =>
                  updateWallThickness(wall.id, Number(event.target.value))
                }
                className={inputClass}
              />
              <span className="text-xs text-text-muted">mm</span>
            </div>
          </FieldRow>
          <FieldRow label="Höhe">
            <span className="tabular-nums-font text-sm text-text">
              {formatNumber(wall.height / 1000, 2)} m
            </span>
          </FieldRow>
        </Section>
      </aside>
    );
  }

  const room = rooms.find((r) => r.id === selected.id);
  if (!room) return null;

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Raum
        </p>
        <h2 className="text-sm font-semibold text-text">{room.name}</h2>
      </div>

      <Section title="Raum">
        <FieldRow label="Name">
          <input
            value={room.name}
            onChange={(event) => updateRoom(room.id, { name: event.target.value })}
            className={inputClass}
          />
        </FieldRow>
        <FieldRow label="Fläche">
          <span className="tabular-nums-font text-sm font-medium text-text">
            {formatArea(room.area)}
          </span>
        </FieldRow>
        <FieldRow label="Raumtyp">
          <select
            value={room.type}
            onChange={(event) => updateRoom(room.id, { type: event.target.value })}
            className={inputClass}
          >
            {ROOM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Höhe">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step={0.05}
              min={2}
              max={4}
              value={room.height / 1000}
              onChange={(event) =>
                updateRoom(room.id, { height: Number(event.target.value) * 1000 })
              }
              className={inputClass}
            />
            <span className="text-xs text-text-muted">m</span>
          </div>
        </FieldRow>
      </Section>

      <Section title="Elektrisch">
        <FieldRow label="Stromkreis">
          <DemoField value="—" />
        </FieldRow>
        <FieldRow label="FI / RCD">
          <DemoField value="—" />
        </FieldRow>
        <FieldRow label="Leistung gesamt">
          <DemoField value="—" />
        </FieldRow>
        {!electricalEnabled && (
          <Badge tone="neutral" className="self-start">
            Folgt mit der Elektroplanung · Phase 5
          </Badge>
        )}
      </Section>

      <Section title="Smart Home (Loxone)">
        <FieldRow label="Raumfunktion">
          <DemoField value="—" />
        </FieldRow>
        <FieldRow label="Präsenzsteuerung">
          <DemoField value="—" />
        </FieldRow>
        <FieldRow label="Beleuchtungsgruppe">
          <DemoField value="—" />
        </FieldRow>
        <FieldRow label="Beschattung">
          <DemoField value="—" />
        </FieldRow>
        <button
          type="button"
          disabled={!loxoneEnabled}
          title="Demnächst — Phase 8"
          className="mt-1 flex items-center justify-center rounded-[var(--radius-sm)] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Loxone Geräte zuweisen — Demnächst
        </button>
      </Section>

      <Section title="Anzahl Elemente">
        <FieldRow label="Steckdosen">
          <span className="tabular-nums-font text-sm text-text">0</span>
        </FieldRow>
        <FieldRow label="Lichtpunkte">
          <span className="tabular-nums-font text-sm text-text">0</span>
        </FieldRow>
        <FieldRow label="Schalter / Taster">
          <span className="tabular-nums-font text-sm text-text">0</span>
        </FieldRow>
        <FieldRow label="Netzwerkdosen">
          <span className="tabular-nums-font text-sm text-text">0</span>
        </FieldRow>
        <FieldRow label="Sensoren">
          <span className="tabular-nums-font text-sm text-text">0</span>
        </FieldRow>
      </Section>
    </aside>
  );
}
