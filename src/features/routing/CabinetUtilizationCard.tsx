"use client";

import { Server } from "lucide-react";
import type { DistributionBoard } from "@/domain";
import { findSmartHomeModel, PLANNING_CATEGORY_LABELS } from "@/domain";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

/**
 * §23 (mockup) — "Schaltschrank-Auslastung". The reference shows TE-width
 * and wattage utilization bars, but SmartHomeDeviceModel has no
 * dinUnits/wattage fields yet (that's real domain modeling Phase 25's
 * dedicated cabinet view needs to add) — showing a fabricated percentage
 * here would be exactly the invented-data problem this app has
 * deliberately avoided elsewhere. Until that data exists, this card
 * honestly shows what's real: how many components are installed, and a
 * category breakdown.
 */
export function CabinetUtilizationCard({
  distributionBoard,
}: {
  distributionBoard: DistributionBoard | null;
}) {
  const modelIds = distributionBoard?.cabinetComponentModelIds ?? [];
  const countsByCategory = new Map<string, number>();
  for (const modelId of modelIds) {
    const category = findSmartHomeModel(modelId)?.planningCategory;
    const label = category ? PLANNING_CATEGORY_LABELS[category] : "Sonstiges";
    countsByCategory.set(label, (countsByCategory.get(label) ?? 0) + 1);
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Server className="h-4 w-4 text-text-muted" />
          Schaltschrank-Auslastung
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {!distributionBoard ? (
          <p className="text-xs text-text-muted">Noch kein Schaltschrank platziert.</p>
        ) : modelIds.length === 0 ? (
          <p className="text-xs text-text-muted">Noch keine Komponenten hinzugefügt.</p>
        ) : (
          <>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="flex-1 font-medium text-text">Komponenten installiert</span>
              <span className="tabular-nums-font font-medium text-text">{modelIds.length}</span>
            </div>
            {[...countsByCategory.entries()].map(([label, count]) => (
              <div key={label} className="flex items-center gap-2.5 text-xs">
                <span className="flex-1 text-text-secondary">{label}</span>
                <span className="tabular-nums-font text-text">{count}×</span>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
