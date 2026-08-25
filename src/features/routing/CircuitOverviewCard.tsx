"use client";

import { Zap } from "lucide-react";
import type { Cable, Room } from "@/domain";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { getCircuit } from "@/features/electrical/mock-circuits";
import { formatNumber } from "@/lib/utils";

/**
 * §21 (mockup) — a compact "Stromkreise" card: one row per loop-through
 * circuit cable (§Phase15 — outlets/lights/switches on the same circuit
 * share one cable instead of individual home-runs), not per individual
 * cable. Single-device home-run cables (sensors, network, Tree/Audio)
 * aren't "Stromkreise" in this sense, so they're excluded here — they
 * already have their own rows in the Kabelliste tab.
 */
export function CircuitOverviewCard({
  cables,
  rooms,
  onShowAll,
}: {
  cables: Cable[];
  rooms: Room[];
  onShowAll: () => void;
}) {
  const groups = new Map<string, { label: string; deviceCount: number; lengthMeters: number }>();
  for (const cable of cables) {
    if (!cable.deviceIds || !cable.circuitGroupId) continue;
    let label: string;
    if (cable.circuitGroupId.startsWith("circuit:")) {
      label = getCircuit(cable.circuitGroupId.slice("circuit:".length))?.label ?? cable.circuitGroupId;
    } else if (cable.circuitGroupId.startsWith("room:")) {
      const roomId = cable.circuitGroupId.slice("room:".length);
      label = rooms.find((r) => r.id === roomId)?.name ?? "Unbenannter Raum";
    } else {
      continue;
    }
    groups.set(cable.circuitGroupId, {
      label,
      deviceCount: cable.deviceIds.length,
      lengthMeters: cable.lengthMeters,
    });
  }
  const rows = [...groups.values()].sort((a, b) => b.deviceCount - a.deviceCount);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-success" />
          Stromkreise
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        {rows.length === 0 ? (
          <p className="text-xs text-text-muted">
            Noch keine Stromkreise berechnet.
          </p>
        ) : (
          rows.slice(0, 5).map((row) => (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span className="flex-1 truncate font-medium text-text">{row.label}</span>
              <span className="shrink-0 text-text-muted">{row.deviceCount} Geräte</span>
              <span className="tabular-nums-font shrink-0 font-medium text-text">
                {formatNumber(row.lengthMeters, 1)} m
              </span>
            </div>
          ))
        )}
        {rows.length > 0 && (
          <button
            type="button"
            onClick={onShowAll}
            className="mt-1 self-start text-xs font-medium text-primary hover:underline"
          >
            Alle Stromkreise anzeigen
          </button>
        )}
      </CardContent>
    </Card>
  );
}
