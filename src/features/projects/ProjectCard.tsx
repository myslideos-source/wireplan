"use client";

import Link from "next/link";
import { MapPin, ArrowUpRight, Building2, ScanSearch, Cable } from "lucide-react";
import { Card, CardContent, GeometryStatusBadge } from "@/components/ui";
import type { Project } from "@/domain";
import { formatLength } from "@/lib/utils";
import { useLiveProjectKpis } from "@/features/editor/store";

export function ProjectHeroCard({ project }: { project: Project }) {
  return (
    <Card className="overflow-hidden shadow-[var(--shadow-md)]">
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden border-b border-border bg-gradient-to-br from-primary-soft to-panel md:border-b-0 md:border-r">
          <div className="bg-grid absolute inset-0 opacity-70" aria-hidden />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary ring-8 ring-primary/5">
            <Building2 className="h-7 w-7" strokeWidth={1.75} />
          </span>
        </div>
        <CardContent className="flex flex-col justify-center gap-5 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-text">
                {project.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {project.address}
              </p>
            </div>
            <GeometryStatusBadge status={project.geometryStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/editor?project=${project.id}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_0_1px_rgba(27,122,74,0.25),0_2px_6px_rgba(27,122,74,0.25)] transition-colors hover:bg-primary/90"
            >
              Im Editor öffnen
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/analysis?project=${project.id}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-panel px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-primary/60 hover:text-primary"
            >
              <ScanSearch className="h-4 w-4" />
              KI-Analyse ansehen
            </Link>
            <Link
              href={`/routing?project=${project.id}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-panel px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-primary/60 hover:text-primary"
            >
              <Cable className="h-4 w-4" />
              Kabelrouting
            </Link>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function ProjectGridCard({ project }: { project: Project }) {
  const kpis = useLiveProjectKpis(project);
  return (
    <Link href={`/editor?project=${project.id}`}>
      <Card className="flex h-full flex-col gap-3 px-4 py-4 transition-colors hover:border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-text">{project.name}</h3>
          <GeometryStatusBadge status={project.geometryStatus} />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-text-secondary">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {project.address || "Keine Adresse hinterlegt"}
        </p>
        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
          <div>
            <p className="text-text-muted">Räume</p>
            <p className="tabular-nums-font font-medium text-text">
              {kpis.rooms}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Geräte</p>
            <p className="tabular-nums-font font-medium text-text">
              {kpis.devices}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Kabel</p>
            <p className="tabular-nums-font font-medium text-text">
              {formatLength(kpis.cableLengthMeters)}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
