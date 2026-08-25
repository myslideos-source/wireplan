"use client";

import { useState, type ReactNode } from "react";
import { MousePointer2, Plug, Lightbulb, ToggleLeft, Radar, Wifi, Trash2, Copy, Server, Home, Zap, GitFork, ChevronDown, X, type LucideIcon } from "lucide-react";
import { Badge, Button, KpiCard } from "@/components/ui";
import {
  DEVICE_TYPE_LABELS,
  DEVICE_WATTAGE,
  getSmartHomeCatalog,
  findSmartHomeModel,
  LOXONE_SYSTEM,
  DEVICE_TYPE_SMART_HOME_CATEGORIES,
  ALL_SMART_HOME_CATEGORIES,
  PLANNING_CATEGORY_LABELS,
  PLANNING_CATEGORY_ORDER,
  numberingPrefixFor,
  formatDeviceNumber,
  MAX_TREE_DEVICES_PER_BRANCH,
  fixedConsumerLabel,
  NETWORK_DEVICE_LABELS,
  type ElectricalDeviceType,
  type CableType,
  type NetworkDeviceSubtype,
  type SmartHomeDeviceModel,
  type PlanningCategory,
} from "@/domain";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { cn, formatArea, formatNumber } from "@/lib/utils";
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

/** §17 (mockup) — each section is independently collapsible, so a device
 * with several groups (Allgemein/Stromkreis/Verkabelung/Loxone) doesn't
 * have to show all of them expanded at once. */
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-shell-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-shell-text-muted">
          {title}
        </h3>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-shell-text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="flex flex-col gap-3 px-5 pb-4">{children}</div>}
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
      <span className="text-shell-text-muted">{label}</span>
      {children}
    </Tag>
  );
}

const inputClass =
  "w-32 rounded-[var(--radius-sm)] border border-shell-border bg-shell-bg-elevated px-2 py-1 text-right text-sm text-shell-text outline-none focus:border-shell-accent/60 disabled:cursor-not-allowed disabled:opacity-50";

// The shared Button's "secondary" variant assumes a light panel
// (border-border/text-text) — this panel is dark shell chrome, so every
// secondary Button here needs an explicit override or its label is
// unreadable (dark text on a dark background).
const secondaryButtonClass =
  "border-shell-border text-shell-text hover:border-shell-accent/60 hover:text-shell-accent";

function DemoField({ value }: { value: string }) {
  return (
    <input value={value} disabled className={inputClass} title="Demnächst" />
  );
}

/** Groups a filtered model list into `<optgroup>`s by planning category, in
 * the spec's own section order — shared by the floorplan device picker and
 * the cabinet component picker below, since the catalog is ~110 entries
 * and a flat list would be unreadable. */
function groupByPlanningCategory(models: SmartHomeDeviceModel[]): [string, SmartHomeDeviceModel[]][] {
  const byCategory = new Map<PlanningCategory, SmartHomeDeviceModel[]>();
  for (const model of models) {
    const list = byCategory.get(model.planningCategory) ?? [];
    list.push(model);
    byCategory.set(model.planningCategory, list);
  }
  return PLANNING_CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => [
    PLANNING_CATEGORY_LABELS[category],
    byCategory.get(category)!,
  ]);
}

/** Loxone (or future system) hardware picker, narrowed to the categories
 * relevant for the given context (a device type or the distribution
 * board) rather than showing the entire catalog everywhere. Only ever
 * offers floorplan-placeable devices — cabinet-only hardware (Miniserver,
 * Extensions, ...) has its own picker below (`CabinetComponentSelect`). */
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
      categories.includes(model.category) &&
      model.isPlanableOnFloorplan &&
      (showLegacyDevices || !model.legacy || model.id === value),
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
      {groupByPlanningCategory(options).map(([groupLabel, models]) => (
        <optgroup key={groupLabel} label={groupLabel}>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
              {model.legacy ? " (Legacy)" : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Cabinet-hardware picker for the Schaltschrank panel — the mirror image
 * of `SmartHomeModelSelect`: only `isCabinetComponent` entries, and picking
 * one adds it to the board's component list rather than replacing a
 * single assignment. */
function CabinetComponentSelect({ onAdd }: { onAdd: (modelId: string) => void }) {
  const showLegacyDevices = useEditorStore((state) => state.showLegacySmartHomeDevices);
  const options = getSmartHomeCatalog(LOXONE_SYSTEM.id).filter(
    (model) => model.isCabinetComponent && (showLegacyDevices || !model.legacy),
  );
  return (
    <select
      value=""
      onChange={(event) => {
        if (event.target.value) onAdd(event.target.value);
      }}
      className={inputClass}
    >
      <option value="">+ Komponente hinzufügen</option>
      {groupByPlanningCategory(options).map(([groupLabel, models]) => (
        <optgroup key={groupLabel} label={groupLabel}>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
              {model.legacy ? " (Legacy)" : ""}
            </option>
          ))}
        </optgroup>
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

export function EditorInspector({
  mobileOpen,
  onMobileClose,
}: {
  /** §32 (mockup) — same pattern as EditorToolbar's mobileOpen: hidden by
   * default on a narrow viewport, shown as a full-screen overlay only
   * when explicitly opened. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
} = {}) {
  const selected = useEditorStore((state) => state.selected);
  const rooms = useEditorStore((state) => state.rooms);
  const devices = useEditorStore((state) => state.devices);
  const roomCircuits = useEditorStore((state) => state.roomCircuits);
  const updateRoom = useEditorStore((state) => state.updateRoom);
  const setRoomCircuit = useEditorStore((state) => state.setRoomCircuit);
  const deleteDevice = useEditorStore((state) => state.deleteDevice);
  const duplicateDevice = useEditorStore((state) => state.duplicateDevice);
  const select = useEditorStore((state) => state.select);
  const technikraumRoomId = useEditorStore((state) => state.technikraumRoomId);
  const setTechnikraum = useEditorStore((state) => state.setTechnikraum);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const deleteDistributionBoard = useEditorStore((state) => state.deleteDistributionBoard);
  const assignDeviceSmartHomeModel = useEditorStore((state) => state.assignDeviceSmartHomeModel);
  const addCabinetComponent = useEditorStore((state) => state.addCabinetComponent);
  const removeCabinetComponent = useEditorStore((state) => state.removeCabinetComponent);
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
  const updateDeviceMeta = useEditorStore((state) => state.updateDeviceMeta);

  const electricalEnabled = isFeatureEnabled("ELECTRICAL_EDITOR");

  if (!selected) {
    return (
      <aside className={cn("w-80 shrink-0 flex-col items-center justify-center gap-3 border-l border-shell-border bg-shell-bg px-6 text-center", mobileOpen ? "fixed inset-0 z-40 flex" : "hidden lg:flex")}>
        {mobileOpen && (
          <div className="flex items-center justify-between border-b border-shell-border px-5 py-3">
            <span className="text-sm font-semibold text-shell-text">Eigenschaften</span>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted hover:bg-shell-bg-elevated hover:text-shell-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-shell-bg-elevated text-shell-text-muted">
          <MousePointer2 className="h-4 w-4" />
        </span>
        <p className="text-sm text-shell-text-muted">
          Kein Element ausgewählt. Wählen Sie einen Raum oder ein Gerät im
          Grundriss.
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
      <aside className={cn("w-80 shrink-0 border-l border-shell-border bg-shell-bg", mobileOpen ? "fixed inset-0 z-40 flex flex-col overflow-y-auto" : "hidden overflow-y-auto scrollbar-thin-shell lg:block")}>
        {mobileOpen && (
          <div className="flex items-center justify-between border-b border-shell-border px-5 py-3">
            <span className="text-sm font-semibold text-shell-text">Eigenschaften</span>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted hover:bg-shell-bg-elevated hover:text-shell-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-shell-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-shell-bg-elevated text-shell-text-muted">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-shell-text-muted">
              Gerät · {deviceNumber}
            </p>
            <h2 className="text-sm font-semibold text-shell-text">{deviceLabel}</h2>
          </div>
        </div>
        <Section title="Gerät">
          <FieldRow label="Nummer">
            <span className="tabular-nums-font text-sm font-medium text-shell-text">{deviceNumber}</span>
          </FieldRow>
          <FieldRow label="Typ">
            <span className="text-sm text-shell-text">{DEVICE_TYPE_LABELS[device.type]}</span>
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
          <FieldRow label="Höhe">
            <span className="tabular-nums-font text-sm text-shell-text">
              {formatNumber(device.mount.height / 1000, 2)} m
            </span>
          </FieldRow>
          <FieldRow label="Raum">
            <span className="text-sm text-shell-text">{room?.name ?? "—"}</span>
          </FieldRow>
          <FieldRow label="Stromkreis">
            <span className="text-sm text-shell-text">
              {room ? (getCircuit(roomCircuits[room.id] ?? null)?.label ?? "—") : "—"}
            </span>
          </FieldRow>
          <FieldRow label="Position">
            <span className="tabular-nums-font text-sm text-shell-text">
              {formatNumber(device.mount.position.x / 1000, 2)} / {formatNumber(device.mount.position.y / 1000, 2)} m
            </span>
          </FieldRow>
          <FieldRow label="Rotation">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={359}
                step={15}
                value={device.rotation ?? 0}
                onChange={(event) => updateDeviceMeta(device.id, { rotation: Number(event.target.value) })}
                className={inputClass}
              />
              <span className="text-xs text-shell-text-muted">°</span>
            </div>
          </FieldRow>
          <FieldRow label="Notiz" as="div">
            <textarea
              value={device.notes ?? ""}
              onChange={(event) => updateDeviceMeta(device.id, { notes: event.target.value })}
              placeholder="Notiz hinzufügen…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
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
        <div className="flex gap-2 px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
            onClick={() => duplicateDevice(device.id)}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplizieren
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
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
    return (
      <aside className={cn("w-80 shrink-0 border-l border-shell-border bg-shell-bg", mobileOpen ? "fixed inset-0 z-40 flex flex-col overflow-y-auto" : "hidden overflow-y-auto scrollbar-thin-shell lg:block")}>
        {mobileOpen && (
          <div className="flex items-center justify-between border-b border-shell-border px-5 py-3">
            <span className="text-sm font-semibold text-shell-text">Eigenschaften</span>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted hover:bg-shell-bg-elevated hover:text-shell-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-shell-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
            <Server className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-shell-text-muted">
              Verteiler
            </p>
            <h2 className="text-sm font-semibold text-shell-text">Schaltschrank</h2>
          </div>
        </div>
        <Section title="Schaltschrank">
          <FieldRow label="Raum">
            <span className="text-sm text-shell-text">{room?.name ?? "—"}</span>
          </FieldRow>
          <FieldRow label="Breite">
            <span className="tabular-nums-font text-sm text-shell-text">
              {formatNumber(distributionBoard.width / 1000, 2)} m
            </span>
          </FieldRow>
          <FieldRow label="Höhe">
            <span className="tabular-nums-font text-sm text-shell-text">
              {formatNumber(distributionBoard.height / 1000, 2)} m
            </span>
          </FieldRow>
        </Section>
        <Section title="Schaltschrank-Komponenten">
          {distributionBoard.cabinetComponentModelIds.length === 0 ? (
            <p className="text-xs text-shell-text-muted">
              Noch keine Komponenten hinzugefügt.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {distributionBoard.cabinetComponentModelIds.map((modelId) => {
                const model = findSmartHomeModel(modelId);
                return (
                  <div
                    key={modelId}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-shell-border bg-shell-bg-elevated px-2.5 py-1.5"
                  >
                    <span className="text-sm text-shell-text">{model?.label ?? modelId}</span>
                    <button
                      type="button"
                      aria-label={`${model?.label ?? modelId} entfernen`}
                      onClick={() => removeCabinetComponent(modelId)}
                      className="text-shell-text-muted hover:text-error"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <CabinetComponentSelect onAdd={addCabinetComponent} />
        </Section>
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
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
      <aside className={cn("w-80 shrink-0 border-l border-shell-border bg-shell-bg", mobileOpen ? "fixed inset-0 z-40 flex flex-col overflow-y-auto" : "hidden overflow-y-auto scrollbar-thin-shell lg:block")}>
        {mobileOpen && (
          <div className="flex items-center justify-between border-b border-shell-border px-5 py-3">
            <span className="text-sm font-semibold text-shell-text">Eigenschaften</span>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted hover:bg-shell-bg-elevated hover:text-shell-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-shell-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10 text-secondary">
            <Home className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-shell-text-muted">
              Smart-Home-Gerät · {deviceNumber}
            </p>
            <h2 className="text-sm font-semibold text-shell-text">{model?.label ?? device.modelId}</h2>
          </div>
        </div>
        <Section title="Smart Home (Loxone)">
          <FieldRow label="Nummer">
            <span className="tabular-nums-font text-sm font-medium text-shell-text">{deviceNumber}</span>
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
              <span className="text-right text-xs text-shell-text-muted">{model.description}</span>
            </FieldRow>
          )}
          <FieldRow label="Raum">
            <span className="text-sm text-shell-text">{room?.name ?? "— (außerhalb eines Raums)"}</span>
          </FieldRow>
        </Section>
        {model && (
          <Section title="Anschluss">
            <FieldRow label="System">
              <span className="text-sm text-shell-text">{model.connectionType}</span>
            </FieldRow>
            <FieldRow label="Versorgung">
              <span className="text-sm text-shell-text">{model.powerSupply}</span>
            </FieldRow>
            <FieldRow label="Montage">
              <span className="text-sm text-shell-text">{model.mountingType}</span>
            </FieldRow>
            {model.cableType && (
              <FieldRow label="Kabeltyp">
                <span className="text-sm text-shell-text">{model.cableType}</span>
              </FieldRow>
            )}
          </Section>
        )}
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
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

  if (selected.type === "consumer") {
    const consumer = fixedConsumers.find((c) => c.id === selected.id);
    if (!consumer) return null;
    const room = consumer.roomId ? rooms.find((r) => r.id === consumer.roomId) : undefined;
    const number = formatDeviceNumber("V", consumer.number);
    return (
      <aside className={cn("w-80 shrink-0 border-l border-shell-border bg-shell-bg", mobileOpen ? "fixed inset-0 z-40 flex flex-col overflow-y-auto" : "hidden overflow-y-auto scrollbar-thin-shell lg:block")}>
        {mobileOpen && (
          <div className="flex items-center justify-between border-b border-shell-border px-5 py-3">
            <span className="text-sm font-semibold text-shell-text">Eigenschaften</span>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted hover:bg-shell-bg-elevated hover:text-shell-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-shell-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-error/10 text-error">
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-shell-text-muted">
              Fester Verbraucher · {number}
            </p>
            <h2 className="text-sm font-semibold text-shell-text">{fixedConsumerLabel(consumer)}</h2>
          </div>
        </div>
        <Section title="Verbraucher">
          <FieldRow label="Nummer">
            <span className="tabular-nums-font text-sm font-medium text-shell-text">{number}</span>
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
            <span className="text-sm text-shell-text">{room?.name ?? "— (außerhalb eines Raums)"}</span>
          </FieldRow>
          <label className="flex items-center gap-2 py-1 text-sm text-shell-text">
            <input
              type="checkbox"
              checked={consumer.reserveConduit}
              onChange={(event) => setFixedConsumerReserveConduit(consumer.id, event.target.checked)}
              className="h-4 w-4 rounded border-shell-border"
            />
            Reserve-Leerrohr mitführen
          </label>
        </Section>
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
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
      <aside className={cn("w-80 shrink-0 border-l border-shell-border bg-shell-bg", mobileOpen ? "fixed inset-0 z-40 flex flex-col overflow-y-auto" : "hidden overflow-y-auto scrollbar-thin-shell lg:block")}>
        {mobileOpen && (
          <div className="flex items-center justify-between border-b border-shell-border px-5 py-3">
            <span className="text-sm font-semibold text-shell-text">Eigenschaften</span>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted hover:bg-shell-bg-elevated hover:text-shell-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-shell-border px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
            <GitFork className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-shell-text-muted">
              Tree-Verzweigung
            </p>
            <h2 className="text-sm font-semibold text-shell-text">Verzweigungspunkt</h2>
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
            <span className="text-sm text-shell-text">{edgeCount}</span>
          </FieldRow>
        </Section>
        <div className="px-5 py-4">
          <Button
            variant="secondary"
            size="sm"
            className={secondaryButtonClass}
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
  const roomSmartHomeDevices = smartHomeDevices.filter((d) => d.roomId === room.id);
  const loxoneDeviceCount = roomDevices.filter((d) => d.smartHomeModelId).length + roomSmartHomeDevices.length;

  return (
    <aside className={cn("w-80 shrink-0 border-l border-shell-border bg-shell-bg", mobileOpen ? "fixed inset-0 z-40 flex flex-col overflow-y-auto" : "hidden overflow-y-auto scrollbar-thin-shell lg:block")}>
        {mobileOpen && (
          <div className="flex items-center justify-between border-b border-shell-border px-5 py-3">
            <span className="text-sm font-semibold text-shell-text">Eigenschaften</span>
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Schließen"
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-shell-text-muted hover:bg-shell-bg-elevated hover:text-shell-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      <div className="border-b border-shell-border px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-shell-text-muted">
          Raum
        </p>
        <h2 className="text-sm font-semibold text-shell-text">{room.name}</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 px-5 py-4">
        <KpiCard
          className="px-2 py-2.5"
          label="Steckdosen"
          value={String(deviceCounts.outlet)}
          color="var(--color-secondary)"
        />
        <KpiCard
          className="px-2 py-2.5"
          label="Licht"
          value={String(deviceCounts.light)}
          color="var(--color-warning)"
        />
        <KpiCard
          className="px-2 py-2.5"
          label="Loxone"
          value={String(loxoneDeviceCount)}
          color="var(--color-primary)"
        />
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
          <span className="tabular-nums-font text-sm font-medium text-shell-text">
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
            <span className="text-xs text-shell-text-muted">m</span>
          </div>
        </FieldRow>
        <FieldRow label="Technikraum" as="div">
          {technikraumRoomId === room.id ? (
            <Badge tone="success">Festgelegt</Badge>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className={secondaryButtonClass}
              onClick={() => setTechnikraum(room.id)}
            >
              Als Technikraum festlegen
            </Button>
          )}
        </FieldRow>
        <FieldRow label="Notizen" as="div">
          <textarea
            value={room.notes ?? ""}
            onChange={(event) => updateRoom(room.id, { notes: event.target.value })}
            placeholder="Notizen hinzufügen…"
            rows={3}
            className={`${inputClass} resize-none`}
          />
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
            <span className="text-sm text-shell-text">{circuit?.rcd ?? "—"}</span>
          ) : (
            <DemoField value="—" />
          )}
        </FieldRow>
        <FieldRow label="Leistung gesamt">
          {electricalEnabled ? (
            <span className="tabular-nums-font text-sm font-medium text-shell-text">
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
        <div className="flex flex-col gap-1.5 border-t border-shell-border pt-3">
          <p className="text-xs font-medium text-shell-text-muted">
            Zugewiesene Loxone-Geräte
          </p>
          {roomDevices.filter((d) => d.smartHomeModelId).length === 0 ? (
            <p className="text-xs text-shell-text-muted">
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
                    <span className="text-shell-text-muted">
                      {DEVICE_TYPE_LABELS[d.type]}
                    </span>
                    <span className="font-medium text-shell-text">
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
          <span className="tabular-nums-font text-sm text-shell-text">{deviceCounts.outlet}</span>
        </FieldRow>
        <FieldRow label="Lichtpunkte">
          <span className="tabular-nums-font text-sm text-shell-text">{deviceCounts.light}</span>
        </FieldRow>
        <FieldRow label="Schalter / Taster">
          <span className="tabular-nums-font text-sm text-shell-text">{deviceCounts.switch}</span>
        </FieldRow>
        <FieldRow label="Netzwerkdosen">
          <span className="tabular-nums-font text-sm text-shell-text">{deviceCounts.network}</span>
        </FieldRow>
        <FieldRow label="Sensoren">
          <span className="tabular-nums-font text-sm text-shell-text">{deviceCounts.sensor}</span>
        </FieldRow>
      </Section>
    </aside>
  );
}
