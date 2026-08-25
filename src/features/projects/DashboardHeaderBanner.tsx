/**
 * Decorative header banner above the "Willkommen zurück" greeting —
 * a simple line-art smart-home floor plan echoing the app's own
 * technical-color device language (§12), not a real project's data.
 */
export function DashboardHeaderBanner() {
  return (
    <div className="relative h-28 w-full overflow-hidden rounded-[var(--radius-lg)] border border-border bg-gradient-to-r from-primary-soft via-panel to-panel sm:h-32">
      <svg
        viewBox="0 0 1200 160"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="img"
        aria-label="Stilisierter Smart-Home-Grundriss"
      >
        <g opacity={0.9} stroke="#B9CBBF" strokeWidth={2.5} fill="none">
          <path d="M 60 130 V 40 H 260 V 20 H 460 V 60 H 620 V 20 H 900 V 100 H 1140 V 130" />
          <path d="M 260 130 V 70 H 460 V 130" />
          <path d="M 620 130 V 80 H 900" />
        </g>
        {[
          { x: 130, y: 85, color: "#F2C94C" },
          { x: 350, y: 100, color: "#EB5757" },
          { x: 540, y: 60, color: "#2D9CDB" },
          { x: 760, y: 115, color: "#9B51E0" },
          { x: 1020, y: 65, color: "#27AE60" },
          { x: 220, y: 45, color: "#F2994A" },
        ].map((dot, i) => (
          <g key={i}>
            <circle cx={dot.x} cy={dot.y} r={13} fill={dot.color} fillOpacity={0.16} stroke={dot.color} strokeWidth={2.5} />
            <circle cx={dot.x} cy={dot.y} r={4} fill={dot.color} />
          </g>
        ))}
      </svg>
    </div>
  );
}
