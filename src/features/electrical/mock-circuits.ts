import type { Circuit } from "@/domain";

/**
 * Demo circuit registry a room's electrical panel can be assigned to
 * (§41). A real circuit plan (breaker sizing, load balancing) is Routing
 * / Material Calculation territory (Phase 7/9) — this is just the
 * assignable list the room inspector reads from.
 */
export const MOCK_CIRCUITS: Circuit[] = [
  { id: "l1", label: "L1 – C16", rcd: "30 mA Typ A" },
  { id: "l2", label: "L2 – C16", rcd: "30 mA Typ A" },
  { id: "l3", label: "L3 – C13", rcd: "30 mA Typ A" },
  { id: "kueche", label: "Küche – C16", rcd: "30 mA Typ A" },
];

export function getCircuit(id: string | null): Circuit | undefined {
  if (!id) return undefined;
  return MOCK_CIRCUITS.find((circuit) => circuit.id === id);
}
