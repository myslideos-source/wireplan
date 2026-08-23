import type {
  DistributionBoard,
  ElectricalDevice,
  FixedConsumer,
  Opening,
  Room,
  SmartHomeDevice,
  Wall,
} from "@/domain";
import { DEVICE_TYPE_LABELS, findSmartHomeModel, formatDeviceNumber, numberingPrefixFor, fixedConsumerLabel, NETWORK_DEVICE_LABELS } from "@/domain";
import {
  devicePosition,
  pointAtOffset,
  polygonCentroid,
  wallOrientation,
  wallsBoundingBox,
} from "@/features/editor/geometry-utils";

const DEVICE_COLORS: Record<ElectricalDevice["type"], string> = {
  outlet: "#D9A441",
  light: "#D9A441",
  switch: "#6B6459",
  sensor: "#7A9D6E",
  network: "#4A8FA8",
};

interface LegendEntry {
  prefix: string;
  label: string;
}

/**
 * A self-contained, static SVG rendering of the current floor (§42 legend
 * included, §72 vector export) — genuinely built from the same store data
 * as the interactive editor, not a placeholder. Deliberately simpler than
 * EditorCanvas (no interaction, no Tree-bus polylines) — good enough as a
 * faithful plan snapshot for printing/sharing, not a duplicate of every
 * interactive nuance.
 */
export function buildFloorPlanSvg(params: {
  projectName: string;
  floorName: string;
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
  devices: ElectricalDevice[];
  smartHomeDevices: SmartHomeDevice[];
  fixedConsumers: FixedConsumer[];
  distributionBoard: DistributionBoard | null;
}): string {
  const { projectName, floorName, walls, rooms, openings, devices, smartHomeDevices, fixedConsumers, distributionBoard } =
    params;
  const box = wallsBoundingBox(walls, 900);
  const legendHeight = 900;
  const totalHeight = box.height + legendHeight;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.minX} ${box.minY} ${box.width} ${totalHeight}" width="${box.width}" height="${totalHeight}" font-family="Inter, sans-serif">`,
  );
  parts.push(`<rect x="${box.minX}" y="${box.minY}" width="${box.width}" height="${totalHeight}" fill="#FAF8F4" />`);

  for (const room of rooms) {
    const points = room.polygon.map((p) => `${p.x},${p.y}`).join(" ");
    parts.push(`<polygon points="${points}" fill="#EFE7D8" />`);
    const centroid = polygonCentroid(room.polygon);
    parts.push(
      `<text x="${centroid.x}" y="${centroid.y}" text-anchor="middle" font-size="340" font-weight="600" fill="#303030">${escapeXml(room.name)}</text>`,
    );
  }

  for (const wall of walls) {
    parts.push(
      `<line x1="${wall.start.x}" y1="${wall.start.y}" x2="${wall.end.x}" y2="${wall.end.y}" stroke="#303030" stroke-width="${wall.thickness}" stroke-linecap="square" />`,
    );
  }

  for (const opening of openings) {
    const wall = walls.find((w) => w.id === opening.wallId);
    if (!wall) continue;
    const center = pointAtOffset(wall, opening.offset);
    const orientation = wallOrientation(wall);
    const across = wall.thickness + 60;
    const isWindow = opening.type === "window";
    const width = orientation === "h" ? opening.width : across;
    const height = orientation === "h" ? across : opening.width;
    parts.push(
      `<rect x="${center.x - width / 2}" y="${center.y - height / 2}" width="${width}" height="${height}" fill="${isWindow ? "#4A8FA8" : "#FFFFFF"}" />`,
    );
  }

  const legend = new Map<string, LegendEntry>();

  for (const device of devices) {
    const position = devicePosition(device, walls);
    if (!position) continue;
    const color = DEVICE_COLORS[device.type];
    const prefix = numberingPrefixFor({ type: device.type, networkDeviceSubtype: device.networkDeviceSubtype });
    const number = formatDeviceNumber(prefix, device.number);
    const label = device.type === "network" ? NETWORK_DEVICE_LABELS[device.networkDeviceSubtype ?? "dose"] : DEVICE_TYPE_LABELS[device.type];
    legend.set(prefix, { prefix, label });
    parts.push(`<circle cx="${position.x}" cy="${position.y}" r="130" fill="#FFFFFF" stroke="${color}" stroke-width="16" />`);
    parts.push(
      `<text x="${position.x}" y="${position.y + 230}" text-anchor="middle" font-size="150" fill="${color}">${number}</text>`,
    );
  }

  for (const device of smartHomeDevices) {
    const model = findSmartHomeModel(device.modelId);
    const prefix = numberingPrefixFor({ category: model?.category, technology: model?.technology });
    const number = formatDeviceNumber(prefix, device.number);
    legend.set(prefix, { prefix, label: model?.label ?? "Smart-Home-Gerät" });
    parts.push(`<circle cx="${device.position.x}" cy="${device.position.y}" r="160" fill="rgba(74,143,168,0.18)" stroke="#4A8FA8" stroke-width="24" />`);
    parts.push(
      `<text x="${device.position.x}" y="${device.position.y + 260}" text-anchor="middle" font-size="150" fill="#4A8FA8">${number}</text>`,
    );
  }

  for (const consumer of fixedConsumers) {
    const number = formatDeviceNumber("V", consumer.number);
    legend.set("V", { prefix: "V", label: "Fester Verbraucher" });
    parts.push(
      `<rect x="${consumer.position.x - 150}" y="${consumer.position.y - 150}" width="300" height="300" fill="rgba(196,83,74,0.15)" stroke="#C4534A" stroke-width="20" />`,
    );
    parts.push(
      `<text x="${consumer.position.x}" y="${consumer.position.y + 350}" text-anchor="middle" font-size="150" fill="#C4534A">${number} · ${escapeXml(fixedConsumerLabel(consumer))}</text>`,
    );
  }

  if (distributionBoard) {
    const wall = walls.find((w) => w.id === distributionBoard.wallId);
    if (wall) {
      const center = pointAtOffset(wall, distributionBoard.offset);
      parts.push(
        `<rect x="${center.x - 200}" y="${center.y - 125}" width="400" height="250" fill="rgba(122,157,110,0.15)" stroke="#7A9D6E" stroke-width="24" />`,
      );
      parts.push(
        `<text x="${center.x}" y="${center.y}" text-anchor="middle" font-size="180" fill="#7A9D6E">HV</text>`,
      );
    }
  }

  // §42 legend, §73 PDF/export metadata — drawn below the plan itself.
  const legendY = box.minY + box.height + 300;
  parts.push(
    `<text x="${box.minX}" y="${legendY}" font-size="320" font-weight="700" fill="#303030">${escapeXml(projectName)}</text>`,
  );
  parts.push(
    `<text x="${box.minX}" y="${legendY + 300}" font-size="200" fill="#6B6459">${escapeXml(floorName)} · Legende</text>`,
  );
  let legendCursor = legendY + 550;
  for (const entry of [...legend.values()].sort((a, b) => a.prefix.localeCompare(b.prefix))) {
    parts.push(
      `<text x="${box.minX}" y="${legendCursor}" font-size="180" fill="#303030">${entry.prefix}xx = ${escapeXml(entry.label)}</text>`,
    );
    legendCursor += 260;
  }

  parts.push("</svg>");
  return parts.join("\n");
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}
