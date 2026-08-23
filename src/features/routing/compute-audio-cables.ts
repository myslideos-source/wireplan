import type { AudioZone, Cable, CableType, DistributionBoard, RoutingMode, SmartHomeDevice, Wall } from "@/domain";
import { findSmartHomeModel, formatDeviceNumber, numberingPrefixFor } from "@/domain";
import { pointAtOffset } from "@/features/editor/geometry-utils";

/**
 * One home-run speaker cable per speaker (§12) — unlike Tree, §12 never
 * describes an audio bus, so each speaker gets its own cable back to the
 * board, just on the speaker-cable type instead of NYM-J/CAT7.
 */
export function computeAudioCables(
  smartHomeDevices: SmartHomeDevice[],
  audioZones: AudioZone[],
  board: DistributionBoard,
  walls: Wall[],
  cableType: CableType,
  mode: RoutingMode,
): Cable[] {
  const boardWall = walls.find((w) => w.id === board.wallId);
  if (!boardWall) return [];
  const boardPosition = pointAtOffset(boardWall, board.offset);

  const cables: Cable[] = [];
  for (const device of smartHomeDevices) {
    const model = findSmartHomeModel(device.modelId);
    if (model?.technology !== "audio") continue;
    const lengthMm =
      Math.abs(device.position.x - boardPosition.x) + Math.abs(device.position.y - boardPosition.y);
    const zone = device.audioZoneId ? audioZones.find((z) => z.id === device.audioZoneId) : undefined;
    const number = formatDeviceNumber(
      numberingPrefixFor({ category: model.category, technology: model.technology }),
      device.number,
    );
    cables.push({
      id: `AUDIO-${device.id}`,
      deviceId: device.id,
      type: cableType,
      lengthMeters: lengthMm / 1000,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: `${zone?.name ?? "Ohne Zone"} · ${number}`,
    });
  }
  return cables;
}
