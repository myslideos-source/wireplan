"use client";

import { useState } from "react";
import { Cable as CableIcon, Zap, GitBranch, Network } from "lucide-react";
import type { Project, RoutingMode } from "@/domain";
import { KpiCard, Button } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { useEditorStore } from "@/features/editor/store";
import { RoutingCanvas } from "./RoutingCanvas";
import { CableListTable } from "./CableListTable";
import { MaterialListTab } from "./MaterialListTab";
import { LoxoneListTab } from "./LoxoneListTab";

const ROUTING_MODES: RoutingMode[] = ["Boden", "Decke", "Wand", "Hybrid"];

type Tab = "kabelliste" | "materialliste" | "loxone";

export function RoutingWorkspace({ project }: { project: Project }) {
  const devices = useEditorStore((state) => state.devices);
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

  const [tab, setTab] = useState<Tab>("kabelliste");
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);

  const totalLength = cables.reduce((sum, c) => sum + c.lengthMeters, 0);
  const circuitCount = new Set(Object.values(roomCircuits).filter(Boolean)).size;
  const smartHomeConnections = devices.filter(
    (d) => d.type === "sensor" || d.type === "network",
  ).length;

  const selectedCable = cables.find((c) => c.id === selectedCableId) ?? null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-8 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-text-secondary">{project.name}</p>
          <h1 className="text-2xl font-semibold text-text">Kabelrouting</h1>
        </div>
        <div className="flex items-center gap-2">
          {floors.length > 1 && (
            <select
              value={floorId ?? ""}
              onChange={(event) => switchFloor(event.target.value)}
              className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/60"
            >
              {[...floors]
                .sort((a, b) => a.floor.level - b.floor.level)
                .map((f) => (
                  <option key={f.floor.id} value={f.floor.id}>
                    {f.floor.name}
                  </option>
                ))}
            </select>
          )}
          <select
            value={routingMode}
            onChange={(event) => setRoutingMode(event.target.value as RoutingMode)}
            className="rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/60"
          >
            {ROUTING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <Button
            disabled={!distributionBoard}
            title={!distributionBoard ? "Zuerst Schaltschrank im Editor platzieren" : undefined}
            onClick={() => calculateRouting()}
          >
            Kabelwege berechnen
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Leitungen" value={String(cables.length)} icon={<CableIcon className="h-4 w-4" />} />
        <KpiCard
          label="Gesamtkabellänge"
          value={`${formatNumber(totalLength, 0)} m`}
          icon={<GitBranch className="h-4 w-4" />}
        />
        <KpiCard label="Stromkreise" value={String(circuitCount)} icon={<Zap className="h-4 w-4" />} />
        <KpiCard
          label="Smart-Home-Verbindungen"
          value={String(smartHomeConnections)}
          icon={<Network className="h-4 w-4" />}
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
            />
          )}
        </div>
      </div>
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
