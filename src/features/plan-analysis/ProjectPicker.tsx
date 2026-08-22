import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { Card, GeometryStatusBadge, Badge } from "@/components/ui";
import type { Project } from "@/domain";

export function ProjectPicker({
  projects,
  availableProjectIds,
}: {
  projects: Project[];
  availableProjectIds: string[];
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">KI-Analyse</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Wählen Sie ein Projekt, um den Original-vs-Digital-Vergleich zu
          öffnen.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {projects.map((project) => {
          const available = availableProjectIds.includes(project.id);
          const content = (
            <Card
              className={
                "flex items-center justify-between gap-4 px-5 py-4 transition-colors" +
                (available ? " hover:border-primary/40" : " opacity-60")
              }
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-text">
                    {project.name}
                  </h2>
                  <GeometryStatusBadge status={project.geometryStatus} />
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {project.address || "Keine Adresse hinterlegt"}
                </p>
              </div>
              {available ? (
                <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                  <ScanSearch className="h-4 w-4" />
                  Analyse öffnen
                </span>
              ) : (
                <Badge tone="neutral">Noch keine Analyse</Badge>
              )}
            </Card>
          );

          return available ? (
            <Link key={project.id} href={`/analysis?project=${project.id}`}>
              {content}
            </Link>
          ) : (
            <div key={project.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
