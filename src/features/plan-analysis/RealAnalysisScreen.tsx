"use client";

import Link from "next/link";
import { Sparkles, AlertTriangle, UploadCloud, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ProgressBar,
  Badge,
  Button,
} from "@/components/ui";
import { useRealAnalysisStore } from "./real-analysis-store";
import { confidenceTone } from "./types";

function toneClass(tone: "success" | "warning" | "error"): string {
  if (tone === "success") return "text-success";
  if (tone === "warning") return "text-warning";
  return "text-error";
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-panel px-4 py-3">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="tabular-nums-font text-xl font-semibold text-text">
        {value}
      </span>
    </div>
  );
}

export function RealAnalysisScreen() {
  const result = useRealAnalysisStore((state) => state.result);
  const projectId = useRealAnalysisStore((state) => state.projectId);

  if (!result) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-8 py-16 text-center">
        <UploadCloud className="h-10 w-10 text-text-muted" />
        <h1 className="text-xl font-semibold text-text">
          Noch keine echte KI-Analyse vorhanden
        </h1>
        <p className="text-sm text-text-secondary">
          Diese Ansicht zeigt das Ergebnis der zuletzt hochgeladenen Datei und
          wird nicht dauerhaft gespeichert — nach einem Neuladen der Seite ist
          sie leer. Laden Sie über das Dashboard einen Grundriss hoch, um eine
          neue Analyse zu starten.
        </p>
        <Link href="/dashboard">
          <Button>Zum Dashboard</Button>
        </Link>
      </div>
    );
  }

  const overallTone = confidenceTone(result.overallConfidence);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">
          Echte KI-Analyse
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {result.fileName} · analysiert{" "}
          {new Date(result.analyzedAt).toLocaleString("de-DE")}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          <span>
            Diese Auswertung stammt von einer echten KI ({result.model},
            Google Gemini) und wurde soeben für diese Datei erstellt — keine
            Demo-Daten. Sie ist eine Orientierung, keine bearbeitbare
            Geometrie.
          </span>
        </div>
        {projectId && (
          <Link href="/editor/draft" className="shrink-0">
            <Button size="sm">
              Weiter zum Editor
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Zusammenfassung</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{result.summary}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile label="Räume" value={result.roomsDetected} />
            <StatTile label="Wände" value={result.wallsCount} />
            <StatTile label="Türen" value={result.doorsCount} />
            <StatTile label="Fenster" value={result.windowsCount} />
            <StatTile label="Treppen" value={result.stairsCount} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Beobachtungen</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {result.observations.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Keine besonderen Unklarheiten gefunden.
                </p>
              ) : (
                result.observations.map((observation, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-1 rounded-[var(--radius-sm)] border border-border bg-panel px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 ${
                          observation.severity === "critical"
                            ? "text-error"
                            : "text-warning"
                        }`}
                      />
                      <span className="text-sm font-medium text-text">
                        {observation.title}
                      </span>
                      <Badge
                        tone={
                          observation.severity === "critical"
                            ? "error"
                            : "warning"
                        }
                      >
                        {observation.severity === "critical"
                          ? "Kritisch"
                          : "Hinweis"}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {observation.description}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>KI-Analyse Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text">Gesamtvertrauen</span>
                <span
                  className={`tabular-nums-font font-semibold ${toneClass(overallTone)}`}
                >
                  {result.overallConfidence} %
                </span>
              </div>
              <ProgressBar value={result.overallConfidence} tone={overallTone} />
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              {result.elementConfidence.map((element) => {
                const tone = confidenceTone(element.confidence);
                return (
                  <div key={element.type} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">
                        {element.label} ({element.count})
                      </span>
                      <span
                        className={`tabular-nums-font font-medium ${toneClass(tone)}`}
                      >
                        {element.confidence} %
                      </span>
                    </div>
                    <ProgressBar value={element.confidence} tone={tone} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
