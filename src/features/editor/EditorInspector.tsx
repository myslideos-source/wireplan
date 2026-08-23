"use client";

import type { ReactNode } from "react";
import { MousePointer2, Plug, Lightbulb, ToggleLeft, Radar, Wifi, Trash2, Server, Home, DoorOpen, AppWindow, Zap, GitFork, type LucideIcon } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import {
  wallLengthMeters,
  DEVICE_TYPE_LABELS,
  DEVICE_WATTAGE,
  getSmartHomeCatalog,
  findSmartHomeModel,
  LOXONE_SYSTEM,
  DEVICE_TYPE_SMART_HOME_CATEGORIES,
  DISTRIBUTION_BOARD_SMART_HOME_CATEGORIES,
  ALL_SMART_HOME_CATEGORIES,
  numberingPrefixFor,
  formatDeviceNumber,
  MAX_TREE_DEVICES_PER_BRANCH,
  fixedConsumerLabel,
  NETWORK_DEVICE_LABELS,
  type ElectricalDeviceType,
  type CableType,
  type NetworkDeviceSubtype,
} from "@/domain";
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

const FIXED_CONSUMER_CABLE_OPTIONS: CableType[] = [
  "NYM-J 3x1,5",
  "NYM-J 3x2,5",
  "NYM-J 5x2,5",
  "NYM-J 5x6",
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

/** Loxone (or future system) hardware picker, narrowed to the categories
 * relevant for the given context (a device type or the distribution
 * board) rather than showing the entire catalog everywhere. */
function SmartHomeModelSelect({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string | undefined;
  onChange: (modelId: string | null) => void;
}) {
  const showLegacyDevices = useEditorStore((state) => state.showLegacySmartHomeDevices);
  const options = getSmartHomeCatalog(LOXONE_SYSTEM.id).filter(
    (model) =>
      categories.includes(model.category) && (showLegacyDevices || !model.legacy || model.id === value),
  );
  if (options.length === 0) {
    return <DemoField value="—" />;
  }
  return (
    <select
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      className={inputClass}
    >
      <option value="">— keins —</option>
      {options.map((model) => (
        <option key={model.id} value={model.id}>
          {model.label}
          {model.legacy ? " (Legacy)" : ""}
        </option>
      ))}
    </select>
  );
}

/** Tree-Ast picker (§27/§34) — only rendered once a genuine Tree model is
 * assigned. Lets the user override the auto-suggested branch (§77) or
 * start a new one, without ever requiring manual technical setup. */
function TreeBranchSelect({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (branchId: string | null) => void;
}) {
  const treeBranches = useEditorStore((state) => state.treeBranches);
  const devices = useEditorStore((state) => state.devices);
  const smartHomeDevices = useEditorStore((state) => state.smartHomeDevices);
  const createTreeBranch = useEditorStore((state) => state.createTreeBranch);

  function countFor(branchId: string): number {
    const inDevices = devices.filter(
      (d) =>
        d.treeBranchId === branchId &&
        d.smartHomeModelId &&
        findSmartHomeModel(d.smartHomeModelId)?.countsAsTreeDevice,
    ).length;
    const inSmartHome = smartHomeDevices.filter(
      (d) => d.treeBranchId === branchId && findSmartHomeModel(d.modelId)?.countsAsTreeDevice,
    ).length;
    return inDevices + inSmartHome;
  }

  return (
    <select
      value={value ?? ""}
      onChange={(event) => {
        if (event.target.value === "__new__") {
          onChange(createTreeBranch());
          return;
        }
        onChange(event.target.value || null);
      }}
      className={inputClass}
    >
      <option value="">— kein Tree-Ast —</option>
      {treeBranches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.label} ({countFor(branch.id)}/{MAX_TREE_DEVICES_PER_BRANCH})
        </option>
      ))}
      <option value="__new__">+ Neuer Tree-Ast</option>
    </select>
  );
}

/** Audio-Zone picker (§12/§27) — only rendered for speakers. Same
 * "suggest, never force" pattern as TreeBranchSelect. */
function AudioZoneSelect({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (zoneId: string | null) => void;
}) {
  const audioZones = useEditorStore((state) => state.audioZones);
  const createAudioZone = useEditorStore((state) => state.createAudioZone);

  return (
    <select
      value={value ?? ""}
      onChange={(event) => {
        if (event.target.value === "__new__") {
          onChange(createAudioZone());
          return;
        }
        onChange(event.target.value || null);
      }}
      className={inputClass}
    >
      <option value="">— keine Audio-Zone —</option>
      {audioZones.map((zone) => (
        <option key={zone.id} value={zone.id}>
          {zone.name}
        </option>
      ))}
      <option value="__new__">+ Neue Audio-Zone</option>
    </select>
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
  const assignDeviceSmartHomeModel = useEditorStore((state) => state.assignDeviceSmartHomeModel);
  const assignBoardSmartHomeModel = useEditorStore((state) => state.assignBoardSmartHomeModel);
  const smartHomeDevices = useEditorStore((state) => state.smartHomeDevices);
  const deleteSmartHomeDevice = useEditorStore((state) => state.deleteSmartHomeDevice);
  const setSmartHomeDeviceModel = useEditorStore((state) => state.setSmartHomeDeviceModel);
  const assignDeviceToTreeBranch = useEditorStore((state) => state.assignDeviceToTreeBranch);
  const assignDeviceToAudioZone = useEditorStore((state) => state.assignDeviceToAudioZone);
  const fixedConsumers = useEditorStore((state) => state.fixedConsumers);
  const treeJunctions = useEditorStore((state) => state.treeJunctions);
  const treeEdges = useEditorStore((state) => state.treeEdges);
  const assignJunctionToTreeBranch = useEditorStore((state) => state.assignJunctionToTreeBranch);
  const deleteTreeJunction = useEditorStore((state) => state.deleteTreeJunction);
  const deleteFixedConsumer = useEditorStore((state) => state.deleteFixedConsumer);
  const updateFixedConsumerCableType = useEditorStore((state) => state.updateFixedConsumerCableType);
  const setFixedConsumerReserveConduit = useEditorStore((state) => state.setFixedConsumerReserveConduit);
  const updateDeviceNetworkSubtype = useEditorStore((state) => state.updateDeviceNetworkSubtype);
  const openings = useEditorStore((state) => state.openings);
  const deleteOpening = useEditorStore((state) => state.deleteOpening);
  const updateOpeningWidth = useEditorStore((state) => state.updateOpeningWidth);

  const electricalEnabled = isFeatureEnabled("ELECTRICAL_EDITOR");

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
    const assignedModel = device.smartHomeModelId ? findSmartHomeModel(device.smartHomeModelId) : undefined;
    const networkSubtype = device.networkDeviceSubtype ?? "dose";
    const deviceLabel = device.type === "network" ? NETWORK_DEVICE_LABELS[networkSubtype] : DEVICE_TYPE_LABELS[device.type];
    const deviceNumber = formatDeviceNumber(
      numberingPrefixFor({ type: device.type, networkDeviceSubtype: networkSubtype }),
      device.number,
    );
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-elevated text-text-secondary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Gerät · {deviceNumber}
            </p>
            <h2 className="text-sm font-semibold text-text">{deviceLabel}</h2>
          </div>
        </div>
        <Section title="Gerät">
          <FieldRow label="Nummer">
            <span className="tabular-nums-font text-sm font-medium text-text">{deviceNumber}</span>
          </FieldRow>
          <FieldRow label="Typ">
            <span className="text-sm text-text">{DEVICE_TYPE_LABELS[device.type]}</span>
          </FieldRow>
          {device.type === "network" && (
            <FieldRow label="Subtyp">
              <select
                value={networkSubtype}
                onChange={(event) =>
                  updateDeviceNetworkSubtype(device.id, event.target.value as NetworkDeviceSubtype)
                }
                className={inputClass}
              >
                {(Object.entries(NETWORK_DEVICE_LABELS) as [NetworkDeviceSubtype, string][]).map(
                  ([subtype, label]) => (
                    <option key={subtype} value={subtype}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </FieldRow>
          )}
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
        <Section title="Smart Home (Loxone)">
          <FieldRow label="Loxone-Gerät">
            <SmartHomeModelSelect
              categories={DEVICE_TYPE_SMART_HOME_CATEGORIES[device.type] ?? []}
              value={device.smartHomeModelId}
              onChange={(modelId) => assignDeviceSmartHomeModel(device.id, modelId)}
            />
          </FieldRow>
          {assignedModel?.countsAsTreeDevice && (
            <FieldRow label="Tree-Ast">
              <TreeBranchSelect
                value={device.treeBranchId}
                onChange={(branchId) => assignDeviceToTreeBranch(device.id, branchId)}
              />
            </FieldRow>
          )}
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
        <Section title="Smart Home (Loxone)">
          <FieldRow label="Loxone-Gerät">
            <SmartHomeModelSelect
              categories={DISTRIBUTION_BOARD_SMART_HOME_CATEGORIES}
              value={distributionBoard.smartHomeModelId}
              onChange={(modelId) => assignBoardSmartHomeModel(modelId)}
            />
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

  if (selected.type === "smarthome") {
    const device = smartHomeDevices.find((d) => d.id === selected.id);
    if (!device) return null;
    const room = device.roomId ? rooms.find((r) => r.id === device.roomId) : undefined;
    const model = findSmartHomeModel(device.modelId);
    const deviceNumber = formatDeviceNumber(
      numberingPrefixFor({ category: model?.category, technology: model?.technology }),
      device.number,
    );
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <Home className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Smart-Home-Gerät · {deviceNumber}
            </p>
            <h2 className="text-sm font-semibold text-text">{model?.label ?? device.modelId}</h2>
          </div>
        </div>
        <Section title="Smart Home (Loxone)">
          <FieldRow label="Nummer">
            <span className="tabular-nums-font text-sm font-medium text-text">{deviceNumber}</span>
          </FieldRow>
          <FieldRow label="Loxone-Gerät">
            <SmartHomeModelSelect
              categories={ALL_SMART_HOME_CATEGORIES}
              value={device.modelId}
              onChange={(modelId) => modelId && setSmartHomeDeviceModel(device.id, modelId)}
            />
          </FieldRow>
          {model?.countsAsTreeDevice && (
            <FieldRow label="Tree-Ast">
              <TreeBranchSelect
                value={device.treeBranchId}
                onChange={(branchId) => assignDeviceToTreeBranch(device.id, branchId)}
              />
            </FieldRow>
          )}
          {model?.technology === "audio" && (
            <FieldRow label="Audio-Zone">
              <AudioZoneSelect
                value={device.audioZoneId}
                onChange={(zoneId) => assignDeviceToAudioZone(device.id, zoneId)}
              />
            </FieldRow>
          )}
          {model && (
            <FieldRow label="Beschreibung" as="div">
              <span className="text-right text-xs text-text-secondary">{model.description}</span>
            </FieldRow>
          )}
          <FieldRow label="Raum">
            <span className="text-sm text-text">{room?.name ?? "— (außerhalb eines Raums)"}</span>
          </FieldRow>
        </Section>
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              deleteSmartHomeDevice(device.id);
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

  if (selected.type === "opening") {
    const opening = openings.find((o) => o.id === selected.id);
    if (!opening) return null;
    const wall = walls.find((w) => w.id === opening.wallId);
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            {opening.type === "door" ? (
              <DoorOpen className="h-4 w-4" />
            ) : (
              <AppWindow className="h-4 w-4" />
            )}
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Öffnung
            </p>
            <h2 className="text-sm font-semibold text-text">
              {opening.type === "door" ? "Tür" : "Fenster"}
            </h2>
          </div>
        </div>
        <Section title="Öffnung">
          <FieldRow label="Typ">
            <span className="text-sm text-text">
              {opening.type === "door" ? "Tür" : "Fenster"}
            </span>
          </FieldRow>
          <FieldRow label="Breite">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step={50}
                min={300}
                max={3000}
                value={opening.width}
                onChange={(event) => updateOpeningWidth(opening.id, Number(event.target.value))}
                className={inputClass}
              />
              <span className="text-xs text-text-muted">mm</span>
            </div>
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
              deleteOpening(opening.id);
              select(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {opening.type === "door" ? "Tür" : "Fenster"} löschen
          </Button>
        </div>
      </aside>
    );
  }

  if (selected.type === "consumer") {
    const consumer = fixedConsumers.find((c) => c.id === selected.id);
    if (!consumer) return null;
    const room = consumer.roomId ? rooms.find((r) => r.id === consumer.roomId) : undefined;
    const number = formatDeviceNumber("V", consumer.number);
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-error/10 text-error">
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Fester Verbraucher · {number}
            </p>
            <h2 className="text-sm font-semibold text-text">{fixedConsumerLabel(consumer)}</h2>
          </div>
        </div>
        <Section title="Verbraucher">
          <FieldRow label="Nummer">
            <span className="tabular-nums-font text-sm font-medium text-text">{number}</span>
          </FieldRow>
          <FieldRow label="Zuleitung">
            <select
              value={consumer.cableType}
              onChange={(event) =>
                updateFixedConsumerCableType(consumer.id, event.target.value as CableType)
              }
              className={inputClass}
            >
              {FIXED_CONSUMER_CABLE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Raum">
            <span className="text-sm text-text">{room?.name ?? "— (außerhalb eines Raums)"}</span>
          </FieldRow>
          <label className="flex items-center gap-2 py-1 text-sm text-text">
            <input
              type="checkbox"
              checked={consumer.reserveConduit}
              onChange={(event) => setFixedConsumerReserveConduit(consumer.id, event.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Reserve-Leerrohr mitführen
          </label>
        </Section>
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              deleteFixedConsumer(consumer.id);
              select(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Verbraucher löschen
          </Button>
        </div>
      </aside>
    );
  }

  if (selected.type === "junction") {
    const junction = treeJunctions.find((j) => j.id === selected.id);
    if (!junction) return null;
    const edgeCount = treeEdges.filter(
      (e) => e.fromRef === `junction:${junction.id}` || e.toRef === `junction:${junction.id}`,
    ).length;
    return (
      <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-bg-secondary scrollbar-thin">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
            <GitFork className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Tree-Verzweigung
            </p>
            <h2 className="text-sm font-semibold text-text">Verzweigungspunkt</h2>
          </div>
        </div>
        <Section title="Verzweigung">
          <FieldRow label="Tree-Ast">
            <TreeBranchSelect
              value={junction.treeBranchId}
              onChange={(branchId) => assignJunctionToTreeBranch(junction.id, branchId)}
            />
          </FieldRow>
          <FieldRow label="Verbindungen">
            <span className="text-sm text-text">{edgeCount}</span>
          </FieldRow>
        </Section>
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              deleteTreeJunction(junction.id);
              select(null);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Verzweigung löschen
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
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-text-secondary">
            Zugewiesene Loxone-Geräte
          </p>
          {roomDevices.filter((d) => d.smartHomeModelId).length === 0 ? (
            <p className="text-xs text-text-muted">
              Noch keinem Gerät in diesem Raum ist Loxone-Hardware zugewiesen.
              Wählen Sie dazu ein Gerät im Grundriss aus.
            </p>
          ) : (
            roomDevices
              .filter((d) => d.smartHomeModelId)
              .map((d) => {
                const model = findSmartHomeModel(d.smartHomeModelId!);
                return (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">
                      {DEVICE_TYPE_LABELS[d.type]}
                    </span>
                    <span className="font-medium text-text">
                      {model?.label ?? d.smartHomeModelId}
                    </span>
                  </div>
                );
              })
          )}
        </div>
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
