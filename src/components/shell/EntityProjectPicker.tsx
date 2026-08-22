import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, GeometryStatusBadge, Badge } from "@/components/ui";
import type { Project } from "@/domain";

export function EntityProjectPicker({
  title,
  subtitle,
  projects,
  availableProjectIds,
  basePath,
  icon: Icon,
  availableLabel,
  unavailableLabel,
}: {
  title: string;
  subtitle: string;
  projects: Project[];
  availableProjectIds: string[];
  basePath: string;
  icon: LucideIcon;
  availableLabel: string;
  unavailableLabel: string;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
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
                  <Icon className="h-4 w-4" />
                  {availableLabel}
                </span>
              ) : (
                <Badge tone="neutral">{unavailableLabel}</Badge>
              )}
            </Card>
          );

          return available ? (
            <Link key={project.id} href={`${basePath}?project=${project.id}`}>
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
