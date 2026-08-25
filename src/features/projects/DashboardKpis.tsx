"use client";

import type { Project } from "@/domain";
import { KpiCard } from "@/components/ui";
import { formatLength } from "@/lib/utils";
import { useLiveProjectKpis } from "@/features/editor/store";

/**
 * Live if the editor is open on this project this session (real room/
 * device/cable-length totals), otherwise the static server-supplied
 * zeros — see `useLiveProjectKpis` for why this can't just always read
 * `project.kpis` (there's no persistence layer to keep that updated).
 */
export function DashboardKpis({ project }: { project: Project }) {
  const kpis = useLiveProjectKpis(project);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard label="Stockwerke" value={String(kpis.floors)} />
      <KpiCard label="Räume" value={String(kpis.rooms)} />
      <KpiCard label="Geräte" value={String(kpis.devices)} />
      <KpiCard label="Kabellänge" value={formatLength(kpis.cableLengthMeters)} />
      <KpiCard label="Stromkreise" value={String(kpis.circuits)} />
    </div>
  );
}
