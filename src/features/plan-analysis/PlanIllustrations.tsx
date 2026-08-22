/**
 * Illustrative stand-ins for the real upload/render pipeline (§69), used
 * only to demonstrate the original-vs-digital comparison UI (§11–12) until
 * a live plan is actually rendered from an uploaded PDF. Both illustrate
 * the same fictional floor plan: the left one cluttered like an architect
 * scan (dimensions, title block, hatching), the right one the cleaned-up
 * vector result WIREPLAN would produce (walls, rooms, doors, windows only).
 */

const ROOMS = [
  { x: 90, y: 70, w: 340, h: 240, name: "Wohnen / Essen", area: "25,46 m²" },
  { x: 430, y: 70, w: 280, h: 240, name: "Küche", area: "14,20 m²" },
  { x: 90, y: 350, w: 210, h: 160, name: "Zimmer 1", area: "13,80 m²" },
  { x: 300, y: 350, w: 150, h: 160, name: "Bad", area: "6,40 m²" },
  { x: 450, y: 350, w: 260, h: 160, name: "Zimmer 2", area: "15,10 m²" },
];

const DOORS: [number, number, "h" | "v"][] = [
  [260, 310, "h"],
  [385, 310, "h"],
  [190, 350, "v"],
  [300, 420, "v"],
  [450, 420, "v"],
];

const WINDOWS: [number, number, "h" | "v"][] = [
  [180, 70, "h"],
  [550, 70, "h"],
  [90, 180, "v"],
  [710, 180, "v"],
  [710, 420, "v"],
  [150, 510, "h"],
  [550, 510, "h"],
];

export function OriginalPlanSvg() {
  return (
    <svg
      viewBox="0 0 800 560"
      className="h-full w-full"
      role="img"
      aria-label="Originaler, eingescannter Architektenplan mit Bemaßungen und Planrahmen"
    >
      <rect x={0} y={0} width={800} height={560} fill="#eae6da" />
      <g stroke="#8a8474" strokeWidth={0.5} opacity={0.5}>
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={560} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 50} x2={800} y2={i * 50} />
        ))}
      </g>

      {/* Outer + inner walls, drawn thick/hatched like a scanned plan */}
      <g stroke="#2b2a26" strokeWidth={6} fill="none">
        <rect x={90} y={70} width={620} height={440} />
        <line x1={430} y1={70} x2={430} y2={310} />
        <line x1={90} y1={310} x2={710} y2={310} />
        <line x1={300} y1={350} x2={300} y2={510} />
        <line x1={450} y1={350} x2={450} y2={510} />
        <line x1={90} y1={350} x2={710} y2={350} />
      </g>

      {DOORS.map(([x, y, dir], i) => (
        <path
          key={i}
          d={
            dir === "h"
              ? `M ${x} ${y} A 40 40 0 0 1 ${x + 40} ${y - 40}`
              : `M ${x} ${y} A 40 40 0 0 1 ${x + 40} ${y + 40}`
          }
          stroke="#2b2a26"
          strokeWidth={1}
          fill="none"
        />
      ))}

      {WINDOWS.map(([x, y, dir], i) => (
        <rect
          key={i}
          x={dir === "h" ? x : x - 3}
          y={dir === "h" ? y - 3 : y}
          width={dir === "h" ? 50 : 6}
          height={dir === "h" ? 6 : 50}
          fill="#5b7a96"
        />
      ))}

      {/* dimension lines */}
      <g stroke="#5a3d2b" strokeWidth={0.75} fill="none">
        <line x1={90} y1={40} x2={710} y2={40} />
        <line x1={90} y1={30} x2={90} y2={50} />
        <line x1={430} y1={30} x2={430} y2={50} />
        <line x1={710} y1={30} x2={710} y2={50} />
        <line x1={40} y1={70} x2={40} y2={510} />
        <line x1={30} y1={70} x2={50} y2={70} />
        <line x1={30} y1={310} x2={50} y2={310} />
        <line x1={30} y1={510} x2={50} y2={510} />
      </g>
      <g fill="#5a3d2b" fontSize={11} fontFamily="ui-monospace, monospace">
        <text x={250} y={33}>
          3,40 m
        </text>
        <text x={550} y={33}>
          2,80 m
        </text>
        <text x={12} y={195} transform="rotate(-90 12 195)">
          4,00 m
        </text>
        <text x={12} y={420} transform="rotate(-90 12 420)">
          3,20 m
        </text>
      </g>

      {ROOMS.map((room, i) => (
        <text
          key={i}
          x={room.x + room.w / 2}
          y={room.y + room.h / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#4a4638"
          fontFamily="ui-monospace, monospace"
        >
          <tspan x={room.x + room.w / 2} dy={-6}>
            {room.name.toUpperCase()}
          </tspan>
          <tspan x={room.x + room.w / 2} dy={14}>
            {room.area}
          </tspan>
        </text>
      ))}

      {/* stray annotations to sell the "cluttered scan" look */}
      <g fill="#8a5a3d" fontSize={9} fontFamily="ui-monospace, monospace">
        <text x={100} y={95}>
          FFB +0.00
        </text>
        <text x={620} y={505}>
          Achse A-A
        </text>
        <circle cx={745} cy={50} r={16} fill="none" stroke="#8a5a3d" />
        <text x={738} y={54}>
          N
        </text>
      </g>

      {/* title block / stamp */}
      <g>
        <rect
          x={560}
          y={520}
          width={230}
          height={32}
          fill="#eae6da"
          stroke="#2b2a26"
          strokeWidth={1}
        />
        <text
          x={570}
          y={534}
          fontSize={9}
          fill="#2b2a26"
          fontFamily="ui-monospace, monospace"
        >
          Neubau Mustermann · EG · M 1:100
        </text>
        <text
          x={570}
          y={546}
          fontSize={9}
          fill="#2b2a26"
          fontFamily="ui-monospace, monospace"
        >
          Architekturbüro Beispiel · Plan-Nr. 04-EG
        </text>
      </g>
    </svg>
  );
}

export function DigitalPlanSvg() {
  return (
    <svg
      viewBox="0 0 800 560"
      className="h-full w-full"
      role="img"
      aria-label="Digitalisierter Vektorgrundriss mit Räumen, Wänden, Türen und Fenstern"
    >
      <rect x={0} y={0} width={800} height={560} fill="#0b1520" />
      <g stroke="#1a2833" strokeWidth={1}>
        {Array.from({ length: 33 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 25} y1={0} x2={i * 25} y2={560} />
        ))}
        {Array.from({ length: 23 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 25} x2={800} y2={i * 25} />
        ))}
      </g>

      {ROOMS.map((room, i) => (
        <rect
          key={i}
          x={room.x}
          y={room.y}
          width={room.w}
          height={room.h}
          fill="#13212d"
        />
      ))}

      <g stroke="#f5f7f9" strokeWidth={4} fill="none" strokeLinecap="square">
        <rect x={90} y={70} width={620} height={440} />
        <line x1={430} y1={70} x2={430} y2={310} />
        <line x1={90} y1={310} x2={710} y2={310} />
        <line x1={300} y1={350} x2={300} y2={510} />
        <line x1={450} y1={350} x2={450} y2={510} />
        <line x1={90} y1={350} x2={710} y2={350} />
      </g>

      {DOORS.map(([x, y, dir], i) => (
        <g key={i} stroke="#9aa7b3" strokeWidth={1.25} fill="none">
          <path
            d={
              dir === "h"
                ? `M ${x} ${y} A 40 40 0 0 1 ${x + 40} ${y - 40}`
                : `M ${x} ${y} A 40 40 0 0 1 ${x + 40} ${y + 40}`
            }
          />
          <line
            x1={x}
            y1={y}
            x2={dir === "h" ? x : x + 40}
            y2={dir === "h" ? y - 40 : y}
          />
        </g>
      ))}

      {WINDOWS.map(([x, y, dir], i) => (
        <rect
          key={i}
          x={dir === "h" ? x : x - 3}
          y={dir === "h" ? y - 3 : y}
          width={dir === "h" ? 50 : 6}
          height={dir === "h" ? 6 : 50}
          fill="#25b7f2"
        />
      ))}

      {ROOMS.map((room, i) => (
        <text
          key={i}
          x={room.x + room.w / 2}
          y={room.y + room.h / 2}
          textAnchor="middle"
          fontSize={12}
          fontFamily="var(--font-inter), sans-serif"
        >
          <tspan x={room.x + room.w / 2} dy={-6} fill="#f5f7f9" fontWeight={600}>
            {room.name}
          </tspan>
          <tspan x={room.x + room.w / 2} dy={16} fill="#9aa7b3">
            {room.area}
          </tspan>
        </text>
      ))}
    </svg>
  );
}
