"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Cable as CableIcon, Zap, GitBranch, Network } from "lucide-react";
import type { CableType, Project, RoutingMode } from "@/domain";
import { SPEAKER_CABLE_TYPES } from "@/domain";
import { KpiCard, Button } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { useEditorStore } from "@/features/editor/store";
import { computeCircuitWarnings, computeLegacyWarnings } from "@/features/editor/warnings";
import { RoutingCanvas } from "./RoutingCanvas";
import { CableListTable } from "./CableListTable";
import { MaterialListTab } from "./MaterialListTab";
import { LoxoneListTab } from "./LoxoneListTab";
import { TreeBranchesTab } from "./TreeBranchesTab";
import { CircuitOverviewCard } from "./CircuitOverviewCard";
import { SystemOverviewCard } from "./SystemOverviewCard";
import { CabinetUtilizationCard } from "./CabinetUtilizationCard";
import { WarningsCard } from "./WarningsCard";
import { BottomLegend } from "./BottomLegend";

const ROUTING_MODES: RoutingMode[] = ["Boden", "Decke", "Hybrid"];

type Tab = "kabelliste" | "materialliste" | "loxone" | "tree";

export function RoutingWorkspace({ project }: { project: Project }) {
  const devices = useEditorStore((state) => state.devices);
  const rooms = useEditorStore((state) => state.rooms);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const smartHomeDevices = useEditorStore((state) => state.smartHomeDevices);
  const cables = useEditorStore((state) => state.cables);
  const roomCircuits = useEditorStore((state) => state.roomCircuits);
  const routingMode = useEditorStore((state) => state.routingMode);
  const setRoutingMode = useEditorStore((state) => state.setRoutingMode);
  const calculateRouting = useEditorStore((state) => state.calculateRouting);
  const floors = useEditorStore((state) => state.floors);
  const floorId = useEditorStore((state) => state.floorId);
  const switchFloor = useEditorStore((state) => state.switchFloor);
  const treeBranches = useEditorStore((state) => state.treeBranches);
  const deleteTreeBranch = useEditorStore((state) => state.deleteTreeBranch);
  const autoConnectTreeDevicesOnFloor = useEditorStore((state) => state.autoConnectTreeDevicesOnFloor);
  const audioZones = useEditorStore((state) => state.audioZones);
  const speakerCableType = useEditorStore((state) => state.speakerCableType);
  const setSpeakerCableType = useEditorStore((state) => state.setSpeakerCableType);

  const [tab, setTab] = useState<Tab>("kabelliste");
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);

  const totalLength = cables.reduce((sum, c) => sum + c.lengthMeters, 0);
  const circuitCount = new Set(Object.values(roomCircuits).filter(Boolean)).size;
  const smartHomeConnections = devices.filter(
    (d) => d.type === "sensor" || d.type === "network",
  ).length;

  const selectedCable = cables.find((c) => c.id === selectedCableId) ?? null;
  const planWarnings = [
    ...computeCircuitWarnings(rooms, devices, roomCircuits),
    ...computeLegacyWarnings(devices, smartHomeDevices, distributionBoard),
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-8 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-text-secondary">{project.name}</p>
          <h1 className="text-2xl font-semibold text-text">Kabelrouting</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {floors.length > 1 && (
            <LabeledSelect label="Etage" value={floorId ?? ""} onChange={switchFloor}>
              {[...floors]
                .sort((a, b) => a.floor.level - b.floor.level)
                .map((f) => (
                  <option key={f.floor.id} value={f.floor.id}>
                    {f.floor.name}
                  </option>
                ))}
            </LabeledSelect>
          )}
          <LabeledSelect
            label="Verlegeart"
            value={routingMode}
            onChange={(value) => setRoutingMode(value as RoutingMode)}
          >
            {ROUTING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </LabeledSelect>
          <LabeledSelect
            label="Lautsprecherkabel"
            value={speakerCableType}
            onChange={(value) => setSpeakerCableType(value as CableType)}
            title="Betrifft nur Audio-Lautsprecher — gilt nicht für Strom-, Netzwerk- oder Tree-Leitungen"
          >
            {SPEAKER_CABLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </LabeledSelect>
          <Button disabled={!distributionBoard} onClick={() => calculateRouting()}>
            Kabelwege berechnen
          </Button>
        </div>
      </div>

      {!distributionBoard && (
        <div className="flex items-start gap-1.5 rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Kabelwege berechnen</strong> ist erst verfügbar, sobald ein
            Schaltschrank platziert ist — er ist der Startpunkt jeder Leitung.
            Öffnen Sie den <strong>Editor</strong>, legen Sie einen
            Technikraum fest und platzieren Sie dort einen Schaltschrank.
            Danach werden hier alle Leitungen auf einmal berechnet: Strom,
            Netzwerk, Tree-Bus, Audio und feste Verbraucher.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Leitungen"
          value={String(cables.length)}
          icon={<CableIcon className="h-4 w-4" />}
          color="var(--color-secondary)"
        />
        <KpiCard
          label="Gesamtkabellänge"
          value={`${formatNumber(totalLength, 0)} m`}
          icon={<GitBranch className="h-4 w-4" />}
          color="var(--color-warning)"
        />
        <KpiCard
          label="Stromkreise"
          value={String(circuitCount)}
          icon={<Zap className="h-4 w-4" />}
          color="var(--color-success)"
        />
        <KpiCard
          label="Smart-Home-Verbindungen"
          value={String(smartHomeConnections)}
          icon={<Network className="h-4 w-4" />}
          color="var(--color-accent-violet)"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg-secondary">
          <RoutingCanvas selectedCableId={selectedCableId} onSelectCable={setSelectedCableId} />
        </div>

        <div className="flex min-w-0 flex-col rounded-[var(--radius-lg)] border border-border bg-panel">
          <div className="flex border-b border-border">
            {(
              [
                ["kabelliste", "Kabelliste"],
                ["materialliste", "Materialliste"],
                ["loxone", "Loxone"],
                ["tree", "Tree-Äste"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === id
                    ? "border-b-2 border-primary text-primary"
                    : "text-text-secondary hover:text-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "kabelliste" && (
            <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
              <CableListTable
                cables={cables}
                selectedCableId={selectedCableId}
                onSelectCable={setSelectedCableId}
              />
              {selectedCable && (
                <div className="mx-4 mb-4 mt-2 flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-panel-elevated px-4 py-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Ausgewählte Leitung
                  </p>
                  <Row label="Kabel ID" value={selectedCable.id} />
                  <Row label="Typ" value={selectedCable.type} />
                  <Row label="Start" value={selectedCable.startLabel} />
                  <Row label="Ziel" value={selectedCable.targetLabel} />
                  <Row label="Länge" value={`${formatNumber(selectedCable.lengthMeters, 1)} m`} />
                  <Row label="Verlegeart" value={selectedCable.mode} />
                </div>
              )}
            </div>
          )}

          {tab === "materialliste" && <MaterialListTab cables={cables} />}

          {tab === "loxone" && (
            <LoxoneListTab
              devices={devices}
              distributionBoard={distributionBoard}
              smartHomeDevices={smartHomeDevices}
              audioZones={audioZones}
            />
          )}

          {tab === "tree" && (
            <TreeBranchesTab
              treeBranches={treeBranches}
              devices={devices}
              smartHomeDevices={smartHomeDevices}
              cables={cables}
              onDeleteBranch={deleteTreeBranch}
              onAutoConnect={autoConnectTreeDevicesOnFloor}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <CircuitOverviewCard cables={cables} rooms={rooms} onShowAll={() => setTab("kabelliste")} />
        <SystemOverviewCard
          devices={devices}
          smartHomeDevices={smartHomeDevices}
          treeBranches={treeBranches}
          audioZones={audioZones}
        />
        <CabinetUtilizationCard distributionBoard={distributionBoard} />
        <WarningsCard warnings={planWarnings} />
      </div>

      <BottomLegend />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

/**
 * A `<select>` with a visible caption above it instead of a hover-only
 * `title` — the previous unlabeled Lautsprecherkabel dropdown sitting
 * right next to "Kabelwege berechnen" read as if it scoped what the
 * button calculates, when it only ever configures the audio cable type.
 */
function LabeledSelect({
  label,
  value,
  onChange,
  title,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1" title={title}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/60"
      >
        {children}
      </select>
    </label>
  );
}
