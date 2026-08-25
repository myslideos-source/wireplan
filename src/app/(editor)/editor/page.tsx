import { LayoutGrid } from "lucide-react";
import { getProjects, getProject } from "@/lib/mock-data";
import { getAnalysisForProject } from "@/features/plan-analysis/mock-analysis";
import { EntityProjectPicker } from "@/components/shell/EntityProjectPicker";
import { EditorGate } from "@/features/editor/EditorGate";

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; review?: string }>;
}) {
  const { project: projectId, review } = await searchParams;
  const projects = await getProjects();
  const project = projectId ? await getProject(projectId) : undefined;

  if (!project) {
    // Every project is offered here — a project with no floors yet is not
    // "unavailable", it just opens into NoGeometryYet below instead of
    // straight into the workspace.
    return (
      <EntityProjectPicker
        title="Editor"
        subtitle="Wählen Sie ein Projekt, um den Grundriss- und Elektroeditor zu öffnen."
        projects={projects}
        availableProjectIds={projects.map((p) => p.id)}
        basePath="/editor"
        icon={LayoutGrid}
        availableLabel="Editor öffnen"
        unavailableLabel="Kein Grundriss"
      />
    );
  }

  const analysis = review === "1" ? await getAnalysisForProject(project.id) : undefined;

  // Whether this project already has a floor is client-only state (see
  // EditorGate) — never decided here, since the server has no persisted
  // geometry to check against.
  return <EditorGate project={project} reviewAreas={analysis?.flaggedAreas} />;
}
