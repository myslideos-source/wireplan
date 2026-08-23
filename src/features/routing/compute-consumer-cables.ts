import type { Cable, DistributionBoard, FixedConsumer, Opening, RoutingMode, Wall } from "@/domain";
import { fixedConsumerLabel, formatDeviceNumber } from "@/domain";
import { pointAtOffset } from "@/features/editor/geometry-utils";
import { findWallAwarePath } from "./pathfind";

const FIXED_CONSUMER_PREFIX = "V";

/**
 * One dedicated home-run lead per fixed consumer (§10/§32) — each on its
 * own assigned cable type (Herd gets 5x2,5mm², a fridge gets 3x1,5mm²,
 * etc.), never a shared bus. "Wand" mode uses wall/door-aware pathfinding
 * (§16/§31) like computeCables; the reserve Leerrohr always shadows the
 * lead's own routed length.
 */
export function computeConsumerCables(
  consumers: FixedConsumer[],
  board: DistributionBoard,
  walls: Wall[],
  mode: RoutingMode,
  openings: Opening[] = [],
): Cable[] {
  const boardWall = walls.find((w) => w.id === board.wallId);
  if (!boardWall) return [];
  const boardPosition = pointAtOffset(boardWall, board.offset);

  return consumers.flatMap((consumer) => {
    let lengthMeters: number;
    let path: Cable["path"];
    if (mode === "Wand") {
      const routed = findWallAwarePath(boardPosition, consumer.position, walls, openings);
      lengthMeters = routed.lengthMm / 1000;
      path = routed.path;
    } else {
      lengthMeters =
        (Math.abs(consumer.position.x - boardPosition.x) + Math.abs(consumer.position.y - boardPosition.y)) /
        1000;
    }
    const label = `${fixedConsumerLabel(consumer)} · ${formatDeviceNumber(FIXED_CONSUMER_PREFIX, consumer.number)}`;
    const lead: Cable = {
      id: `V-${consumer.id}`,
      deviceId: consumer.id,
      type: consumer.cableType,
      lengthMeters,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: label,
      path,
    };
    if (!consumer.reserveConduit) return [lead];
    const reserve: Cable = {
      id: `V-${consumer.id}-reserve`,
      deviceId: consumer.id,
      type: "Leerrohr M25",
      lengthMeters,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: `${label} (Reserve-Leerrohr)`,
      path,
    };
    return [lead, reserve];
  });
}
