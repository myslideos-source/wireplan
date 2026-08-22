import { FileOutput } from "lucide-react";
import { getProjects, getProject } from "@/lib/mock-data";
import { getGeometriesForProject } from "@/features/editor/mock-geometry";
import { EntityProjectPicker } from "@/components/shell/EntityProjectPicker";
import { ExportsGate } from "@/features/exports/ExportsGate";

export default async function ExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectId } = await searchParams;
  const projects = await getProjects();
  const project = projectId ? await getProject(projectId) : undefined;

  if (!project) {
    const availability = await Promise.all(
      projects.map(async (p) => ({
        id: p.id,
        available: Boolean(await getGeometriesForProject(p.id)),
      })),
    );
    return (
      <EntityProjectPicker
        title="Exporte"
        subtitle="Wählen Sie ein Projekt, um Ergebnisse als PDF zu exportieren."
        projects={projects}
        availableProjectIds={availability
          .filter((entry) => entry.available)
          .map((entry) => entry.id)}
        basePath="/exports"
        icon={FileOutput}
        availableLabel="Exporte öffnen"
        unavailableLabel="Kein Grundriss"
      />
    );
  }

  const geometries = await getGeometriesForProject(project.id);
  if (!geometries) {
    return (
      <EntityProjectPicker
        title="Exporte"
        subtitle="Wählen Sie ein Projekt, um Ergebnisse als PDF zu exportieren."
        projects={projects}
        availableProjectIds={[]}
        basePath="/exports"
        icon={FileOutput}
        availableLabel="Exporte öffnen"
        unavailableLabel="Kein Grundriss"
      />
    );
  }

  return (
    <ExportsGate
      project={project}
      expectedFloorIds={geometries.map((g) => g.floor.id)}
    />
  );
}
