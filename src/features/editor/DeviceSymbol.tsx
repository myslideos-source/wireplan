import type { MouseEvent as ReactMouseEvent } from "react";
import type { ElectricalDevice, Point } from "@/domain";

const RADIUS = 130;

const DEVICE_COLORS: Record<ElectricalDevice["type"], string> = {
  outlet: "#D9A441",
  light: "#D9A441",
  switch: "#6B6459",
  sensor: "#7A9D6E",
  network: "#4A8FA8",
};

function Glyph({ type, color }: { type: ElectricalDevice["type"]; color: string }) {
  switch (type) {
    case "outlet":
      return (
        <>
          <circle cx={-40} cy={0} r={22} fill={color} />
          <circle cx={40} cy={0} r={22} fill={color} />
        </>
      );
    case "light":
      return (
        <>
          <circle cx={0} cy={0} r={55} fill={color} />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <line
              key={angle}
              x1={Math.cos((angle * Math.PI) / 180) * 75}
              y1={Math.sin((angle * Math.PI) / 180) * 75}
              x2={Math.cos((angle * Math.PI) / 180) * 105}
              y2={Math.sin((angle * Math.PI) / 180) * 105}
              stroke={color}
              strokeWidth={14}
            />
          ))}
        </>
      );
    case "switch":
      return <line x1={-45} y1={45} x2={45} y2={-45} stroke={color} strokeWidth={18} strokeLinecap="round" />;
    case "sensor":
      return (
        <>
          <circle cx={0} cy={0} r={30} fill={color} />
          <path
            d="M -90 40 A 100 100 0 0 1 90 40"
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeDasharray="24 18"
          />
        </>
      );
    case "network":
      return <rect x={-38} y={-38} width={76} height={76} fill="none" stroke={color} strokeWidth={16} />;
    default:
      return null;
  }
}

export function DeviceSymbol({
  device,
  position,
  selected,
  clickable,
  onSelect,
  onDragStart,
  dimmed,
  multiSelected,
}: {
  device: ElectricalDevice;
  position: Point;
  selected: boolean;
  clickable: boolean;
  onSelect: (event: ReactMouseEvent) => void;
  onDragStart?: (event: ReactMouseEvent) => void;
  /** §67 Tree View — fades out devices that aren't Tree hardware while
   * the user focuses on Tree cabling, without hiding them entirely. */
  dimmed?: boolean;
  /** §49 — part of the current multi-selection (Shift+Click). */
  multiSelected?: boolean;
}) {
  const color = DEVICE_COLORS[device.type];

  return (
    <g
      transform={`translate(${position.x} ${position.y})`}
      opacity={dimmed ? 0.25 : 1}
      className={clickable ? "cursor-grab" : undefined}
      onClick={(event) => {
        if (!clickable) return;
        event.stopPropagation();
        onSelect(event);
      }}
      onMouseDown={(event) => {
        if (!clickable || !onDragStart) return;
        event.stopPropagation();
        onDragStart(event);
      }}
    >
      {multiSelected && (
        <circle r={RADIUS + 50} fill="none" stroke="#C96F5B" strokeWidth={14} strokeDasharray="30 20" />
      )}
      <circle
        r={RADIUS}
        fill="#FFFFFF"
        stroke={selected ? "#C96F5B" : color}
        strokeWidth={selected ? 26 : 16}
      />
      <Glyph type={device.type} color={selected ? "#C96F5B" : color} />
    </g>
  );
}
