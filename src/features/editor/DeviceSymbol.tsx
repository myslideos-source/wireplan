import type { MouseEvent as ReactMouseEvent } from "react";
import type { ElectricalDevice, Point } from "@/domain";
import { findSmartHomeModel, numberingPrefixFor, formatDeviceNumber } from "@/domain";
import { SMART_HOME_ICONS } from "./smart-home-icons";

// §70 — shrunk to ~65% of the original size so dense real-world plans
// (many spots in small rooms) keep enough overview/space; every glyph
// coordinate below is scaled by the same factor as RADIUS to stay
// proportionate rather than just shrinking the outer circle.
const RADIUS = 85;

// §12 (mockup) — the technical color code: Steckdose/Licht get their own
// colors, Netzwerk its own; a generic Schalter/Sensor symbol isn't one of
// §12's explicit categories (those cover specific device families, not
// plain electrical fixtures), so both fall back to Neutral rather than
// claiming a category they aren't.
const DEVICE_COLORS: Record<ElectricalDevice["type"], string> = {
  outlet: "#EB5757",
  light: "#F2C94C",
  switch: "#7F8C8D",
  sensor: "#7F8C8D",
  network: "#9B51E0",
};

function Glyph({ type, color }: { type: ElectricalDevice["type"]; color: string }) {
  switch (type) {
    case "outlet":
      return (
        <>
          <circle cx={-26} cy={0} r={14} fill={color} />
          <circle cx={26} cy={0} r={14} fill={color} />
        </>
      );
    case "light":
      return (
        <>
          <circle cx={0} cy={0} r={36} fill={color} />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <line
              key={angle}
              x1={Math.cos((angle * Math.PI) / 180) * 49}
              y1={Math.sin((angle * Math.PI) / 180) * 49}
              x2={Math.cos((angle * Math.PI) / 180) * 69}
              y2={Math.sin((angle * Math.PI) / 180) * 69}
              stroke={color}
              strokeWidth={9}
            />
          ))}
        </>
      );
    case "switch":
      return <line x1={-29} y1={29} x2={29} y2={-29} stroke={color} strokeWidth={12} strokeLinecap="round" />;
    case "sensor":
      return (
        <>
          <circle cx={0} cy={0} r={20} fill={color} />
          <path
            d="M -59 26 A 65 65 0 0 1 59 26"
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeDasharray="16 12"
          />
        </>
      );
    case "network":
      return <rect x={-25} y={-25} width={50} height={50} fill="none" stroke={color} strokeWidth={10} />;
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
  // A device with a Loxone (or other smart-home system) hardware model
  // assigned renders that model's own color/icon (§28) — falling back to
  // the plain per-ElectricalDeviceType glyph exactly as before when no
  // model is assigned, so an ordinary "Steckdose" with no Loxone hardware
  // chosen looks unchanged.
  const model = device.smartHomeModelId ? findSmartHomeModel(device.smartHomeModelId) : undefined;
  const color = model?.color ?? DEVICE_COLORS[device.type];
  const Icon = model ? SMART_HOME_ICONS[model.icon] : null;
  // §10 (mockup) — a small ID badge under the symbol (e.g. "SD04") so a
  // dense plan stays legible without opening the properties panel for
  // every device.
  const numberLabel = formatDeviceNumber(
    numberingPrefixFor({ type: device.type, networkDeviceSubtype: device.networkDeviceSubtype }),
    device.number,
  );

  return (
    <g
      transform={`translate(${position.x} ${position.y}) rotate(${device.rotation ?? 0})`}
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
        <circle r={RADIUS + 33} fill="none" stroke="#27AE60" strokeWidth={9} strokeDasharray="20 13" />
      )}
      <circle
        r={RADIUS}
        fill="#FFFFFF"
        stroke={selected ? "#27AE60" : color}
        strokeWidth={selected ? 17 : 10}
      />
      {Icon ? (
        <Icon x={-46} y={-46} width={92} height={92} color={selected ? "#27AE60" : color} />
      ) : (
        <Glyph type={device.type} color={selected ? "#27AE60" : color} />
      )}
      {/* Counter-rotate so the ID label always reads upright regardless
       * of the device's own rotation. */}
      <g transform={`rotate(${-(device.rotation ?? 0)})`}>
        <text
          x={0}
          y={RADIUS + 38}
          textAnchor="middle"
          fontSize={38}
          fontWeight={600}
          fill="#23272D"
          pointerEvents="none"
        >
          {numberLabel}
        </text>
      </g>
    </g>
  );
}
