import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { Card } from "@/components/ui";
import type { Project } from "@/domain";

export function NoAnalysisYet({ project }: { project: Project }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="flex max-w-md flex-col items-center gap-4 px-8 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <ScanSearch className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-text">
            Noch keine Analyse für {project.name}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Laden Sie zuerst einen Grundriss hoch, um die KI-Analyse für
            dieses Projekt zu sehen.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-primary hover:underline"
        >
          Zum Dashboard
        </Link>
      </Card>
    </div>
  );
}
