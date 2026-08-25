const CATEGORY_LEGEND: { label: string; color: string }[] = [
  { label: "Tree", color: "var(--color-tech-tree)" },
  { label: "Air", color: "var(--color-tech-air)" },
  { label: "Licht", color: "var(--color-tech-light)" },
  { label: "Steckdose", color: "var(--color-tech-outlet)" },
  { label: "Beschattung", color: "var(--color-tech-shading)" },
  { label: "Netzwerk", color: "var(--color-tech-network)" },
  { label: "Audio", color: "var(--color-tech-audio)" },
  { label: "Heizung/Klima", color: "var(--color-tech-heating)" },
  { label: "Sicherheit", color: "var(--color-tech-security)" },
  { label: "230/400V", color: "var(--color-tech-power)" },
];

const LINE_LEGEND: { label: string; color: string; dashed: boolean }[] = [
  { label: "Stromkreis", color: "var(--color-tech-outlet)", dashed: true },
  { label: "Tree", color: "var(--color-tech-tree)", dashed: false },
  { label: "Kabelweg", color: "var(--color-tech-neutral)", dashed: true },
];

/** §25 (mockup) — a single compact legend row at the very bottom of the
 * page, tying the technical color codes (§12) to their meaning. */
export function BottomLegend() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border px-1 py-3 text-xs text-text-secondary">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {CATEGORY_LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {LINE_LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <svg width="20" height="8" className="shrink-0">
              <line
                x1={0}
                y1={4}
                x2={20}
                y2={4}
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray={item.dashed ? "4 3" : undefined}
              />
            </svg>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
