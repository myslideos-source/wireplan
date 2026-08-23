"use client";

import Link from "next/link";
import { UploadCloud, ScanSearch } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";
import { useRealAnalysisStore } from "@/features/plan-analysis/real-analysis-store";

/**
 * A real cross-session upload history needs persistence (Supabase) that
 * doesn't exist yet — but the current session's own upload is genuinely
 * available in the client stores, so this shows that instead of a flat
 * "coming soon", same honesty rule as everywhere else (§85): no history
 * from before a reload, no data that isn't actually there.
 */
export function UploadsOverview() {
  const result = useRealAnalysisStore((state) => state.result);

  if (!result) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-8 py-16 text-center">
        <UploadCloud className="h-10 w-10 text-text-muted" />
        <h1 className="text-xl font-semibold text-text">
          Noch kein Upload in dieser Sitzung
        </h1>
        <p className="text-sm text-text-secondary">
          Eine Übersicht früherer Uploads über mehrere Sitzungen hinweg
          braucht eine Datenbank, die hier noch nicht angebunden ist. Diese
          Seite zeigt stattdessen ehrlich, was in der aktuellen Sitzung
          hochgeladen wurde — nach einem Neuladen der Seite ist sie wieder
          leer.
        </p>
        <Link href="/dashboard">
          <Button>Grundriss hochladen</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">Uploads</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Diese Sitzung — nicht dauerhaft gespeichert.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{result.fileName}</CardTitle>
          <Badge tone="success">Analysiert</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            {new Date(result.analyzedAt).toLocaleString("de-DE")} ·{" "}
            {result.model}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/analysis/real">
              <Button variant="secondary" size="sm">
                <ScanSearch className="h-4 w-4" />
                KI-Analyse ansehen
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
