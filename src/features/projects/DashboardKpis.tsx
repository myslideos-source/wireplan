"use client";

import { Building2, DoorOpen, Plug, Cable as CableIcon, Zap } from "lucide-react";
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
      <KpiCard
        label="Stockwerke"
        value={String(kpis.floors)}
        icon={<Building2 className="h-4 w-4" />}
        color="var(--color-secondary)"
      />
      <KpiCard
        label="Räume"
        value={String(kpis.rooms)}
        icon={<DoorOpen className="h-4 w-4" />}
        color="var(--color-primary)"
      />
      <KpiCard
        label="Geräte"
        value={String(kpis.devices)}
        icon={<Plug className="h-4 w-4" />}
        color="var(--color-accent-violet)"
      />
      <KpiCard
        label="Kabellänge"
        value={formatLength(kpis.cableLengthMeters)}
        icon={<CableIcon className="h-4 w-4" />}
        color="var(--color-warning)"
      />
      <KpiCard
        label="Stromkreise"
        value={String(kpis.circuits)}
        icon={<Zap className="h-4 w-4" />}
        color="var(--color-success)"
      />
    </div>
  );
}
