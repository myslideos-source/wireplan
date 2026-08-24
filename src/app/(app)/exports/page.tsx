import { FileOutput } from "lucide-react";
import { getProjects, getProject } from "@/lib/mock-data";
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
    // Whether a project actually has floors is client-only state (the
    // editor store) until real persistence exists — this picker can't
    // know that server-side, so every project is offered; ExportsGate
    // shows the honest "open the editor first" message per project.
    return (
      <EntityProjectPicker
        title="Exporte"
        subtitle="Wählen Sie ein Projekt, um Ergebnisse als PDF zu exportieren."
        projects={projects}
        availableProjectIds={projects.map((p) => p.id)}
        basePath="/exports"
        icon={FileOutput}
        availableLabel="Exporte öffnen"
        unavailableLabel="Kein Grundriss"
      />
    );
  }

  return <ExportsGate project={project} />;
}
