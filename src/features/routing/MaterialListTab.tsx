import type { Cable } from "@/domain";
import { formatNumber } from "@/lib/utils";

export function MaterialListTab({ cables }: { cables: Cable[] }) {
  if (cables.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-text-secondary">
        Die Materialliste wird aus den berechneten Kabelwegen abgeleitet —
        berechnen Sie zuerst die Kabelwege.
      </p>
    );
  }

  const totalsByType = new Map<string, number>();
  for (const cable of cables) {
    totalsByType.set(cable.type, (totalsByType.get(cable.type) ?? 0) + cable.lengthMeters);
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <p className="text-xs text-text-muted">
        Automatisch aus der Kabelliste berechnet (§54). Zugewiesene
        Loxone-Hardware (Miniserver, Tree-Geräte, …) sehen Sie im Tab
        „Loxone“.
      </p>
      {[...totalsByType.entries()].map(([type, meters]) => (
        <div
          key={type}
          className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2.5 text-sm"
        >
          <span className="text-text">{type}</span>
          <span className="tabular-nums-font font-medium text-text">
            {formatNumber(meters, 1)} m
          </span>
        </div>
      ))}
    </div>
  );
}
