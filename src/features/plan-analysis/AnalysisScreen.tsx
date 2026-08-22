import { Stepper } from "@/components/ui";
import { DemoDataBanner } from "@/components/shell/DemoDataBanner";
import type { Project } from "@/domain";
import type { FloorAnalysisResult } from "./types";
import { CompareSlider } from "./CompareSlider";
import { AnalysisStatusCard } from "./AnalysisStatusCard";
import { ReviewModeCard } from "./ReviewModeCard";
import { ReviewActions } from "./ReviewActions";

export function AnalysisScreen({
  project,
  analysis,
}: {
  project: Project;
  analysis: FloorAnalysisResult;
}) {
  const hasCriticalIssues = analysis.flaggedAreas.some(
    (area) => area.severity === "critical",
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-8 py-8">
      <div>
        <p className="text-sm text-text-secondary">{project.name}</p>
        <div className="mt-4">
          <Stepper steps={project.stages} />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-text">
          Grundriss-Upload &amp; KI-Analyse
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Vergleichen Sie den hochgeladenen Plan mit dem von unserer KI
          digitalisierten Grundriss.
        </p>
      </div>

      <DemoDataBanner>
        Diese Ansicht zeigt Beispieldaten. Die echte KI-Grundrissanalyse
        (AI_PLAN_ANALYSIS) ist noch nicht angebunden — nichts hier wurde aus
        einem echten Plan berechnet.
      </DemoDataBanner>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <CompareSlider />
          <p className="text-xs text-text-muted">
            {analysis.floorName} · Ziehen Sie den Regler, um Original und
            digitalisierten Grundriss zu vergleichen.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <AnalysisStatusCard result={analysis} />
          <ReviewModeCard
            flaggedAreas={analysis.flaggedAreas}
            estimatedReviewMinutes={analysis.estimatedReviewMinutes}
          />
        </div>
      </div>

      <ReviewActions
        projectId={project.id}
        hasCriticalIssues={hasCriticalIssues}
      />
    </div>
  );
}
