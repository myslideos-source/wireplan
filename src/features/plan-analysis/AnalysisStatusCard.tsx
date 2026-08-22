import { CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, ProgressBar } from "@/components/ui";
import type { FloorAnalysisResult } from "./types";
import { confidenceTone } from "./types";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-b-0">
      <span className="text-text-secondary">{label}</span>
      <span className="tabular-nums-font font-medium text-text">{value}</span>
    </div>
  );
}

function ConfidenceRow({
  label,
  confidence,
}: {
  label: string;
  confidence: number;
}) {
  const tone = confidenceTone(confidence);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span
          className={
            "tabular-nums-font font-medium " +
            (tone === "success"
              ? "text-success"
              : tone === "warning"
                ? "text-warning"
                : "text-error")
          }
        >
          {confidence} %
        </span>
      </div>
      <ProgressBar value={confidence} tone={tone} />
    </div>
  );
}

export function AnalysisStatusCard({
  result,
}: {
  result: FloorAnalysisResult;
}) {
  const overallTone = confidenceTone(result.overallConfidence);

  return (
    <Card>
      <CardHeader>
        <CardTitle>KI-Analyse Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          Analyse abgeschlossen
        </div>

        <div>
          <StatRow
            label="Erkannte Räume"
            value={`${result.roomsDetected.found} / ${result.roomsDetected.expected}`}
          />
          <StatRow label="Wände" value={String(result.wallsCount)} />
          <StatRow label="Türen" value={String(result.doorsCount)} />
          <StatRow label="Fenster" value={String(result.windowsCount)} />
          <StatRow label="Treppen" value={String(result.stairsCount)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-text">Gesamtvertrauen</span>
            <span
              className={
                "tabular-nums-font font-semibold " +
                (overallTone === "success"
                  ? "text-success"
                  : overallTone === "warning"
                    ? "text-warning"
                    : "text-error")
              }
            >
              {result.overallConfidence} %
            </span>
          </div>
          <ProgressBar value={result.overallConfidence} tone={overallTone} />
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          {result.elementConfidence.map((element) => (
            <ConfidenceRow
              key={element.type}
              label={element.label}
              confidence={element.confidence}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
