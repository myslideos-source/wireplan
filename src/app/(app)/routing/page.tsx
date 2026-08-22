import { Cable } from "lucide-react";
import { getProjects, getProject } from "@/lib/mock-data";
import { getGeometriesForProject } from "@/features/editor/mock-geometry";
import { EntityProjectPicker } from "@/components/shell/EntityProjectPicker";
import { RoutingGate } from "@/features/routing/RoutingGate";

export default async function RoutingPage({
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
        title="Kabelrouting"
        subtitle="Wählen Sie ein Projekt, um Kabelwege zu berechnen."
        projects={projects}
        availableProjectIds={availability
          .filter((entry) => entry.available)
          .map((entry) => entry.id)}
        basePath="/routing"
        icon={Cable}
        availableLabel="Routing öffnen"
        unavailableLabel="Kein Grundriss"
      />
    );
  }

  const geometries = await getGeometriesForProject(project.id);
  if (!geometries) {
    return (
      <EntityProjectPicker
        title="Kabelrouting"
        subtitle="Wählen Sie ein Projekt, um Kabelwege zu berechnen."
        projects={projects}
        availableProjectIds={[]}
        basePath="/routing"
        icon={Cable}
        availableLabel="Routing öffnen"
        unavailableLabel="Kein Grundriss"
      />
    );
  }

  return (
    <RoutingGate
      project={project}
      expectedFloorIds={geometries.map((g) => g.floor.id)}
    />
  );
}
