import type { ElectricalDevice, Point } from "@/domain";

const RADIUS = 130;

const DEVICE_COLORS: Record<ElectricalDevice["type"], string> = {
  outlet: "#e9ba4d",
  light: "#e9ba4d",
  switch: "#9aa7b3",
  sensor: "#68d56b",
  network: "#25b7f2",
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
}: {
  device: ElectricalDevice;
  position: Point;
  selected: boolean;
  clickable: boolean;
  onSelect: () => void;
}) {
  const color = DEVICE_COLORS[device.type];

  return (
    <g
      transform={`translate(${position.x} ${position.y})`}
      className={clickable ? "cursor-pointer" : undefined}
      onClick={(event) => {
        if (!clickable) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      <circle
        r={RADIUS}
        fill="#0b1520"
        stroke={selected ? "#16d8c4" : color}
        strokeWidth={selected ? 26 : 16}
      />
      <Glyph type={device.type} color={selected ? "#16d8c4" : color} />
    </g>
  );
}
