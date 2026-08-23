import type { Point } from "./geometry";
import type { CableType } from "./routing";

/**
 * Feste Verbraucher / Zuleitungen (§10) — dedicated home-run leads for
 * fixed appliances, distinct from the five general electrical device
 * types: a Herd needs its own 5x2,5mm² lead, not a generic outlet.
 */
export type FixedConsumerType =
  | "herd"
  | "backofen"
  | "kuehlschrank"
  | "gefrierschrank"
  | "geschirrspueler"
  | "waschmaschine"
  | "trockner"
  | "waermepumpe"
  | "lueftungsgeraet"
  | "elektroheizstab"
  | "durchlauferhitzer"
  | "wallbox"
  | "garage"
  | "garten"
  | "gartenhaus"
  | "pool"
  | "pooltechnik"
  | "sauna"
  | "klimaanlage"
  | "pv-wechselrichter"
  | "rollladen"
  | "raffstore"
  | "markise"
  | "torantrieb"
  | "custom";

export const FIXED_CONSUMER_LABELS: Record<FixedConsumerType, string> = {
  herd: "Herd / Kochfeld",
  backofen: "Backofen",
  kuehlschrank: "Kühlschrank",
  gefrierschrank: "Gefrierschrank",
  geschirrspueler: "Geschirrspüler",
  waschmaschine: "Waschmaschine",
  trockner: "Trockner",
  waermepumpe: "Wärmepumpe",
  lueftungsgeraet: "Lüftungsgerät",
  elektroheizstab: "Elektroheizstab",
  durchlauferhitzer: "Durchlauferhitzer",
  wallbox: "Wallbox",
  garage: "Garage",
  garten: "Garten",
  gartenhaus: "Gartenhaus",
  pool: "Pool",
  pooltechnik: "Pooltechnik",
  sauna: "Sauna",
  klimaanlage: "Klimaanlage",
  "pv-wechselrichter": "PV / Wechselrichter",
  rollladen: "Elektrische Rollläden",
  raffstore: "Raffstore",
  markise: "Markise",
  torantrieb: "Torantrieb",
  custom: "Eigener Verbraucher",
};

/** Sensible default lead per type — the user can still override per
 * instance, this just avoids everything defaulting to the same cable. */
export const FIXED_CONSUMER_DEFAULT_CABLE: Record<FixedConsumerType, CableType> = {
  herd: "NYM-J 5x2,5",
  backofen: "NYM-J 3x2,5",
  kuehlschrank: "NYM-J 3x1,5",
  gefrierschrank: "NYM-J 3x1,5",
  geschirrspueler: "NYM-J 3x1,5",
  waschmaschine: "NYM-J 3x1,5",
  trockner: "NYM-J 3x1,5",
  waermepumpe: "NYM-J 5x2,5",
  lueftungsgeraet: "NYM-J 3x1,5",
  elektroheizstab: "NYM-J 5x2,5",
  durchlauferhitzer: "NYM-J 5x2,5",
  wallbox: "NYM-J 5x6",
  garage: "NYM-J 5x2,5",
  garten: "NYM-J 5x2,5",
  gartenhaus: "NYM-J 5x2,5",
  pool: "NYM-J 5x2,5",
  pooltechnik: "NYM-J 5x2,5",
  sauna: "NYM-J 5x6",
  klimaanlage: "NYM-J 5x2,5",
  "pv-wechselrichter": "NYM-J 5x6",
  rollladen: "NYM-J 3x1,5",
  raffstore: "NYM-J 3x1,5",
  markise: "NYM-J 3x1,5",
  torantrieb: "NYM-J 5x2,5",
  custom: "NYM-J 3x2,5",
};

export interface FixedConsumer {
  id: string;
  floorId: string;
  type: FixedConsumerType;
  /** Only used when type === "custom" (§10 — "Der Benutzer muss eigene
   * Verbraucher hinzufügen können"). */
  customLabel?: string;
  position: Point;
  roomId: string | null;
  cableType: CableType;
  /** §40/§41 — lay a spare empty conduit (Leerrohr M25) alongside this
   * consumer's lead for future upgrades (e.g. a Wallbox destined for more
   * amperage later). Off by default; the user opts in per consumer. */
  reserveConduit: boolean;
  number: number;
}

export function fixedConsumerLabel(consumer: Pick<FixedConsumer, "type" | "customLabel">): string {
  if (consumer.type === "custom" && consumer.customLabel) return consumer.customLabel;
  return FIXED_CONSUMER_LABELS[consumer.type];
}
