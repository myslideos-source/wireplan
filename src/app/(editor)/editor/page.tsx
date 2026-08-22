import { LayoutGrid } from "lucide-react";
import { getProjects, getProject } from "@/lib/mock-data";
import { getGeometryForProject } from "@/features/editor/mock-geometry";
import { getAnalysisForProject } from "@/features/plan-analysis/mock-analysis";
import { EntityProjectPicker } from "@/components/shell/EntityProjectPicker";
import { EditorWorkspace } from "@/features/editor/EditorWorkspace";
import { NoGeometryYet } from "@/features/editor/NoGeometryYet";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; review?: string }>;
}) {
  const { project: projectId, review } = await searchParams;
  const projects = await getProjects();
  const project = projectId ? await getProject(projectId) : undefined;

  if (!project) {
    const availability = await Promise.all(
      projects.map(async (p) => ({
        id: p.id,
        available: Boolean(await getGeometryForProject(p.id)),
      })),
    );
    return (
      <EntityProjectPicker
        title="Editor"
        subtitle="Wählen Sie ein Projekt, um den Grundriss- und Elektroeditor zu öffnen."
        projects={projects}
        availableProjectIds={availability
          .filter((entry) => entry.available)
          .map((entry) => entry.id)}
        basePath="/editor"
        icon={LayoutGrid}
        availableLabel="Editor öffnen"
        unavailableLabel="Kein Grundriss"
      />
    );
  }

  const geometry = await getGeometryForProject(project.id);
  if (!geometry) {
    return <NoGeometryYet project={project} />;
  }

  const analysis = review === "1" ? await getAnalysisForProject(project.id) : undefined;

  return (
    <EditorWorkspace
      project={project}
      geometry={geometry}
      reviewAreas={analysis?.flaggedAreas}
    />
  );
}
