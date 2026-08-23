import type { Cable, DistributionBoard, FixedConsumer, RoutingMode, Wall } from "@/domain";
import { fixedConsumerLabel, formatDeviceNumber } from "@/domain";
import { pointAtOffset } from "@/features/editor/geometry-utils";

const FIXED_CONSUMER_PREFIX = "V";

/**
 * One dedicated home-run lead per fixed consumer (§10/§32) — each on its
 * own assigned cable type (Herd gets 5x2,5mm², a fridge gets 3x1,5mm²,
 * etc.), never a shared bus.
 */
export function computeConsumerCables(
  consumers: FixedConsumer[],
  board: DistributionBoard,
  walls: Wall[],
  mode: RoutingMode,
): Cable[] {
  const boardWall = walls.find((w) => w.id === board.wallId);
  if (!boardWall) return [];
  const boardPosition = pointAtOffset(boardWall, board.offset);

  return consumers.map((consumer) => {
    const lengthMm =
      Math.abs(consumer.position.x - boardPosition.x) + Math.abs(consumer.position.y - boardPosition.y);
    return {
      id: `V-${consumer.id}`,
      deviceId: consumer.id,
      type: consumer.cableType,
      lengthMeters: lengthMm / 1000,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: `${fixedConsumerLabel(consumer)} · ${formatDeviceNumber(FIXED_CONSUMER_PREFIX, consumer.number)}`,
    };
  });
}
