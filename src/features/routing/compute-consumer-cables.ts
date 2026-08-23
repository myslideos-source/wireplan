import type { Cable, DistributionBoard, FixedConsumer, RoutingMode } from "@/domain";
import { fixedConsumerLabel, formatDeviceNumber } from "@/domain";

const FIXED_CONSUMER_PREFIX = "V";

/**
 * One dedicated home-run lead per fixed consumer (§10/§32) — each on its
 * own assigned cable type (Herd gets 5x2,5mm², a fridge gets 3x1,5mm²,
 * etc.), never a shared bus. Manhattan distance (§47) since the plan has
 * no wall vectors to route around; the reserve Leerrohr always shadows
 * the lead's own length.
 */
export function computeConsumerCables(
  consumers: FixedConsumer[],
  board: DistributionBoard,
  mode: RoutingMode,
): Cable[] {
  const boardPosition = board.position;

  return consumers.flatMap((consumer) => {
    const lengthMeters =
      (Math.abs(consumer.position.x - boardPosition.x) + Math.abs(consumer.position.y - boardPosition.y)) /
      1000;
    const label = `${fixedConsumerLabel(consumer)} · ${formatDeviceNumber(FIXED_CONSUMER_PREFIX, consumer.number)}`;
    const lead: Cable = {
      id: `V-${consumer.id}`,
      deviceId: consumer.id,
      type: consumer.cableType,
      lengthMeters,
      mode,
      startLabel: "Schaltschrank",
      targetLabel: label,
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
    };
    return [lead, reserve];
  });
}
