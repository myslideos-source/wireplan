import { useState } from "react";
import { AlertTriangle, GitBranch, Trash2 } from "lucide-react";
import type { Cable, ElectricalDevice, SmartHomeDevice, TreeBranch } from "@/domain";
import { findSmartHomeModel, treeBranchStatus, TREE_BRANCH_STATUS_LABELS, MAX_TREE_DEVICES_PER_BRANCH, MAX_TREE_CABLE_LENGTH_M } from "@/domain";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui";
import { computeTreeWarnings } from "@/features/editor/warnings";

const STATUS_DOT: Record<string, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-error",
};

export function TreeBranchesTab({
  treeBranches,
  devices,
  smartHomeDevices,
  cables,
  onDeleteBranch,
  onAutoConnect,
}: {
  treeBranches: TreeBranch[];
  devices: ElectricalDevice[];
  smartHomeDevices: SmartHomeDevice[];
  cables: Cable[];
  onDeleteBranch: (id: string) => void;
  /** §Phase14.2 — bulk-assigns every unassigned Tree-capable device on the
   * current floor; returns how many were newly connected. */
  onAutoConnect: () => number;
}) {
  const [lastResult, setLastResult] = useState<number | null>(null);

  const autoConnectButton = (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="secondary"
        onClick={() => setLastResult(onAutoConnect())}
        className="self-start"
      >
        <GitBranch className="h-4 w-4" />
        Loxone-Geräte auf diesem Stockwerk automatisch verbinden
      </Button>
      {lastResult !== null && (
        <p className="text-xs text-text-muted">
          {lastResult === 0
            ? "Alle Tree-Geräte auf diesem Stockwerk waren bereits einem Ast zugewiesen."
            : `${lastResult} Gerät${lastResult === 1 ? "" : "e"} neu einem Tree-Ast zugewiesen.`}
        </p>
      )}
    </div>
  );

  if (treeBranches.length === 0) {
    return (
      <div className="flex flex-col gap-4 px-5 py-6">
        <p className="text-sm text-text-secondary">
          Noch keine Tree-Äste angelegt. Sobald Sie im Editor ein Loxone-Tree-Gerät
          platzieren oder zuweisen, wird automatisch ein Tree-Ast vorgeschlagen —
          oder verbinden Sie alle bereits platzierten Geräte auf einmal:
        </p>
        {autoConnectButton}
      </div>
    );
  }

  const lengthByBranch: Record<string, number> = {};
  for (const cable of cables) {
    if (cable.treeBranchId) lengthByBranch[cable.treeBranchId] = cable.lengthMeters;
  }
  const countByBranch: Record<string, number> = {};
  for (const device of devices) {
    if (!device.treeBranchId) continue;
    if (!device.smartHomeModelId || !findSmartHomeModel(device.smartHomeModelId)?.countsAsTreeDevice) continue;
    countByBranch[device.treeBranchId] = (countByBranch[device.treeBranchId] ?? 0) + 1;
  }
  for (const device of smartHomeDevices) {
    if (!device.treeBranchId || !findSmartHomeModel(device.modelId)?.countsAsTreeDevice) continue;
    countByBranch[device.treeBranchId] = (countByBranch[device.treeBranchId] ?? 0) + 1;
  }

  const warnings = computeTreeWarnings(treeBranches, devices, smartHomeDevices, lengthByBranch);

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <p className="text-xs text-text-muted">
        Jeder Tree-Ast ist ein gemeinsamer Bus — die Länge kommt aus „Kabelwege
        berechnen“ oben; die Geräteanzahl ist immer live.
      </p>
      {autoConnectButton}
      {treeBranches.map((branch) => {
        const count = countByBranch[branch.id] ?? 0;
        const length = lengthByBranch[branch.id] ?? 0;
        const status = treeBranchStatus(count, length);
        return (
          <div
            key={branch.id}
            className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2.5 text-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: branch.colorHex }}
                />
                <span className="font-medium text-text">{branch.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                <span className="text-xs text-text-muted">{TREE_BRANCH_STATUS_LABELS[status]}</span>
                <button
                  type="button"
                  onClick={() => onDeleteBranch(branch.id)}
                  className="text-text-muted transition-colors hover:text-error"
                  title="Tree-Ast löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>
                Geräte: {count} / {MAX_TREE_DEVICES_PER_BRANCH}
              </span>
              <span>
                Leitung: {formatNumber(length, 0)} / {MAX_TREE_CABLE_LENGTH_M} m
              </span>
            </div>
          </div>
        );
      })}

      {warnings.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-3">
          {warnings.map((warning) => (
            <div key={warning.id} className="flex items-start gap-1.5 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
