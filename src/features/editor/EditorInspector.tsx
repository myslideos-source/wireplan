"use client";

import type { ReactNode } from "react";
import { MousePointer2, Plug, Lightbulb, ToggleLeft, Radar, Wifi, Trash2, Server, type LucideIcon } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { wallLengthMeters, DEVICE_TYPE_LABELS, DEVICE_WATTAGE, type ElectricalDeviceType } from "@/domain";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { formatArea, formatNumber } from "@/lib/utils";
import { MOCK_CIRCUITS, getCircuit } from "@/features/electrical/mock-circuits";
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

const DEVICE_ICONS: Record<ElectricalDeviceType, LucideIcon> = {
  outlet: Plug,
  light: Lightbulb,
  switch: ToggleLeft,
  sensor: Radar,
  network: Wifi,
};

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

/**
 * `<label>` only wraps an actual form control (input/select) — one is
 * genuinely being labelled. A row whose control is a button/badge uses a
 * plain `<div>` instead: wrapping a button in a label with unrelated text
 * corrupts its accessible name (confirmed via Playwright's role query
 * returning zero matches for a button that plainly has that text).
 */
function FieldRow({
  label,
  children,
  as: Tag = "label",
}: {
  label: string;
  children: ReactNode;
  as?: "label" | "div";
}) {
  return (
    <Tag className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-secondary">{label}</span>
      {children}
    </Tag>
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
  const devices = useEditorStore((state) => state.devices);
  const roomCircuits = useEditorStore((state) => state.roomCircuits);
  const updateRoom = useEditorStore((state) => state.updateRoom);
  const updateWallThickness = useEditorStore((state) => state.updateWallThickness);
  const setRoomCircuit = useEditorStore((state) => state.setRoomCircuit);
  const deleteDevice = useEditorStore((state) => state.deleteDevice);
  const select = useEditorStore((state) => state.select);
  const technikraumRoomId = useEditorStore((state) => state.technikraumRoomId);
  const setTechnikraum = useEditorStore((state) => state.setTechnikraum);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const deleteDistributionBoard = useEditorStore((state) => state.deleteDistributionBoard);

  const electricalEnabled = isFeatureEnabled("ELECTRICAL_EDITOR");
  const loxoneEnabled = isFeatureEnabled("LOXONE");

  if (!selected) {
    return (
      <aside className="flex w-80 shrink-0 flex-col items-center justify-center gap-3 border-l border-border bg-bg-secondary px-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel-elevated text-text-muted">
          <MousePointer2 className="h-4 w-4" />
        </span>
        <p className="text-sm text-text-secondary">
          Kein Element ausgewählt. Wählen Sie einen Raum, eine Wand oder ein
          Gerät im Grundriss.
        </p>
      </aside>
    );
  }

  if (selected.type === "device") {
    const device = devices.find((d) => d.id === selected.id);
    if (!device) return null;
    const Icon = DEVICE_ICONS[device.type];
    const room = device.roomId ? rooms.find((r) => r.id === device.roomId) : undefined;
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-elevated text-text-secondary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Gerät
            </p>
            <h2 className="text-sm font-semibold text-text">
              {DEVICE_TYPE_LABELS[device.type]}
            </h2>
          </div>
        </div>
        <Section title="Gerät">
          <FieldRow label="Typ">
            <span className="text-sm text-text">{DEVICE_TYPE_LABELS[device.type]}</span>
          </FieldRow>
          <FieldRow label="Montage">
            <span className="text-sm text-text">
              {device.mount.kind === "wall" ? "Wand" : "Decke"}
            </span>
          </FieldRow>
          <FieldRow label="Höhe">
            <span className="tabular-nums-font text-sm text-text">
              {formatNumber(device.mount.height / 1000, 2)} m
            </span>
          </FieldRow>
          <FieldRow label="Raum">
            <span className="text-sm text-text">{room?.name ?? "—"}</span>
          </FieldRow>
        </Section>
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              deleteDevice(device.id);
              select(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Gerät löschen
          </Button>
        </div>
      </aside>
    );
  }

  if (selected.type === "board") {
    if (!distributionBoard) return null;
    const room = rooms.find((r) => r.id === distributionBoard.roomId);
    const wall = walls.find((w) => w.id === distributionBoard.wallId);
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
            <Server className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Verteiler
            </p>
            <h2 className="text-sm font-semibold text-text">Schaltschrank</h2>
          </div>
        </div>
        <Section title="Schaltschrank">
          <FieldRow label="Raum">
            <span className="text-sm text-text">{room?.name ?? "—"}</span>
          </FieldRow>
          <FieldRow label="Breite">
            <span className="tabular-nums-font text-sm text-text">
              {formatNumber(distributionBoard.width / 1000, 2)} m
            </span>
          </FieldRow>
          <FieldRow label="Höhe">
            <span className="tabular-nums-font text-sm text-text">
              {formatNumber(distributionBoard.height / 1000, 2)} m
            </span>
          </FieldRow>
          <FieldRow label="Wand">
            <span className="text-sm text-text">{wall?.id ?? "—"}</span>
          </FieldRow>
        </Section>
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              deleteDistributionBoard();
              select(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Schaltschrank entfernen
          </Button>
        </div>
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

  const roomDevices = devices.filter((d) => d.roomId === room.id);
  const circuitId = roomCircuits[room.id] ?? null;
  const circuit = getCircuit(circuitId);
  const totalWatts = roomDevices.reduce((sum, d) => sum + DEVICE_WATTAGE[d.type], 0);

  const deviceCounts: Record<ElectricalDeviceType, number> = {
    outlet: 0,
    light: 0,
    switch: 0,
    sensor: 0,
    network: 0,
  };
  for (const device of roomDevices) deviceCounts[device.type] += 1;

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
        <FieldRow label="Technikraum" as="div">
          {technikraumRoomId === room.id ? (
            <Badge tone="success">Festgelegt</Badge>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTechnikraum(room.id)}
            >
              Als Technikraum festlegen
            </Button>
          )}
        </FieldRow>
      </Section>

      <Section title="Elektrisch">
        <FieldRow label="Stromkreis">
          {electricalEnabled ? (
            <select
              value={circuitId ?? ""}
              onChange={(event) =>
                setRoomCircuit(room.id, event.target.value || null)
              }
              className={inputClass}
            >
              <option value="">—</option>
              {MOCK_CIRCUITS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <DemoField value="—" />
          )}
        </FieldRow>
        <FieldRow label="FI / RCD">
          {electricalEnabled ? (
            <span className="text-sm text-text">{circuit?.rcd ?? "—"}</span>
          ) : (
            <DemoField value="—" />
          )}
        </FieldRow>
        <FieldRow label="Leistung gesamt">
          {electricalEnabled ? (
            <span className="tabular-nums-font text-sm font-medium text-text">
              {formatNumber(totalWatts / 1000, 2)} kW
            </span>
          ) : (
            <DemoField value="—" />
          )}
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
          <span className="tabular-nums-font text-sm text-text">{deviceCounts.outlet}</span>
        </FieldRow>
        <FieldRow label="Lichtpunkte">
          <span className="tabular-nums-font text-sm text-text">{deviceCounts.light}</span>
        </FieldRow>
        <FieldRow label="Schalter / Taster">
          <span className="tabular-nums-font text-sm text-text">{deviceCounts.switch}</span>
        </FieldRow>
        <FieldRow label="Netzwerkdosen">
          <span className="tabular-nums-font text-sm text-text">{deviceCounts.network}</span>
        </FieldRow>
        <FieldRow label="Sensoren">
          <span className="tabular-nums-font text-sm text-text">{deviceCounts.sensor}</span>
        </FieldRow>
      </Section>
    </aside>
  );
}
