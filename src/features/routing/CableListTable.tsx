"use client";

import type { Cable } from "@/domain";
import { formatNumber, cn } from "@/lib/utils";

export function CableListTable({
  cables,
  selectedCableId,
  onSelectCable,
}: {
  cables: Cable[];
  selectedCableId: string | null;
  onSelectCable: (id: string | null) => void;
}) {
  if (cables.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-text-secondary">
        Noch keine Kabelwege berechnet. Platzieren Sie einen Schaltschrank
        und Elektrogeräte, dann klicken Sie auf „Kabelwege berechnen“.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-1 pt-2">
      <p className="px-4 text-xs text-text-muted">
        Alle Leitungen starten am {cables[0].startLabel}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Ziel</th>
              <th className="px-3 py-2 font-medium">Typ</th>
              <th className="px-3 py-2 text-right font-medium">Länge</th>
            </tr>
          </thead>
          <tbody>
            {cables.map((cable) => (
              <tr
                key={cable.id}
                onClick={() =>
                  onSelectCable(selectedCableId === cable.id ? null : cable.id)
                }
                className={cn(
                  "cursor-pointer border-b border-border/60 transition-colors last:border-b-0",
                  selectedCableId === cable.id
                    ? "bg-primary/10"
                    : "hover:bg-panel-elevated",
                )}
              >
                <td className="tabular-nums-font px-3 py-2 text-text-secondary">
                  {cable.id}
                </td>
                <td className="px-3 py-2 text-text">{cable.targetLabel}</td>
                <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                  {cable.type}
                </td>
                <td className="tabular-nums-font px-3 py-2 text-right font-medium text-text">
                  {formatNumber(cable.lengthMeters, 1)} m
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
