import type { Point } from "./geometry";
import type { ElectricalDeviceType } from "./electrical";

/**
 * Smart-home integrations (Loxone and future systems) must stay generic —
 * never hard-coded as `if (loxone)` throughout the app (§56). Loxone is
 * just the first entry in SMART_HOME_CATALOGS; a second system adds its
 * own catalog entry, no branching logic elsewhere.
 */
export interface SmartHomeSystem {
  id: string;
  name: string;
}

/** A standalone smart-home device placed directly on the plan — not tied
 * to one of the five electrical device categories (e.g. a Weather Station
 * mounted outside, or a Room Comfort Sensor floating in a room with no
 * outlet/light of its own). Point-mounted like a ceiling device (§66);
 * the user picks any catalog model freely, not narrowed by category. */
export interface SmartHomeDevice {
  id: string;
  floorId: string;
  systemId: string;
  modelId: string;
  position: Point;
  roomId: string | null;
  /** Which Tree branch this device's Tree bus cable belongs to — only
   * meaningful when the model is a Tree device. */
  treeBranchId?: string;
  /** Auto-assigned display number (§26), unique per prefix per floor. */
  number: number;
}

export const LOXONE_SYSTEM: SmartHomeSystem = {
  id: "loxone",
  name: "Loxone",
};

/** Broad hardware role, used to suggest relevant catalog entries for a
 * given electrical device type rather than showing the entire catalog
 * everywhere. */
export type SmartHomeDeviceCategory =
  | "controller"
  | "actuator"
  | "input"
  | "sensor"
  | "climate";

export const SMART_HOME_CATEGORY_LABELS: Record<SmartHomeDeviceCategory, string> = {
  controller: "Steuerung",
  actuator: "Aktor",
  input: "Bedienung",
  sensor: "Sensor",
  climate: "Klima",
};

/** Which physical layer a device belongs to — the load-bearing distinction
 * for cabling (§33/§60): Tree devices share one bus per branch, Air
 * devices are wireless (no Tree cable at all), audio/network/230V each
 * get their own separate cable type and are never counted as Tree. */
export type SmartHomeTechnology = "loxone-tree" | "loxone-air" | "network" | "audio" | "230v";

export interface SmartHomeDeviceModel {
  id: string;
  systemId: string;
  category: SmartHomeDeviceCategory;
  label: string;
  description: string;
  technology: SmartHomeTechnology;
  /** True only for genuine Loxone Tree devices — these share a Tree bus
   * and count against a branch's 50-device / 500m limits. Air, network,
   * audio and 230V hardware are never Tree devices even though some sit
   * in the same physical room (§62). */
  countsAsTreeDevice: boolean;
}

/**
 * Loxone's Tree/Air product line — the genuine hardware names a planner
 * would actually assign, not a fabricated placeholder catalog.
 *
 * NOT live-verified: this session has no network access to loxone.com
 * (blocked by egress policy), so these entries come from training
 * knowledge, not a live fetch of the current Loxone catalog. Treat this
 * as a starting point to review against the official Loxone documentation
 * before ordering hardware, not as a verified source of truth (§46).
 */
export const LOXONE_CATALOG: SmartHomeDeviceModel[] = [
  {
    id: "loxone-miniserver-gen2",
    systemId: LOXONE_SYSTEM.id,
    category: "controller",
    label: "Miniserver Gen. 2",
    description: "Zentrale Steuereinheit der gesamten Loxone-Installation.",
    technology: "loxone-tree",
    countsAsTreeDevice: false,
  },
  {
    id: "loxone-extension",
    systemId: LOXONE_SYSTEM.id,
    category: "controller",
    label: "Extension",
    description: "Erweitert den Miniserver um zusätzliche Ein-/Ausgänge.",
    technology: "loxone-tree",
    countsAsTreeDevice: false,
  },
  {
    id: "loxone-air-base-extension",
    systemId: LOXONE_SYSTEM.id,
    category: "controller",
    label: "Air Base Extension",
    description: "Funkbasis für kabellose Loxone Air Geräte.",
    technology: "loxone-tree",
    countsAsTreeDevice: false,
  },
  {
    id: "loxone-relay-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "actuator",
    label: "Relay Tree",
    description: "Schaltet bis zu 8 Stromkreise, z.B. Steckdosen.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-dimmer-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "actuator",
    label: "Dimmer Tree",
    description: "Dimmt bis zu 4 Beleuchtungskreise.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-nano-dimmer-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "actuator",
    label: "Nano Dimmer Tree",
    description: "Unterputz-Dimmer für eine einzelne Leuchte.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-touch-pure-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "input",
    label: "Touch Pure Tree",
    description: "Wandtaster mit Temperaturfühler und Statusanzeige.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-touch-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "input",
    label: "Touch Tree",
    description: "Einfacher beleuchteter Wandtaster.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-touch-pure-flex",
    systemId: LOXONE_SYSTEM.id,
    category: "input",
    label: "Touch Pure Flex",
    description: "Rahmenloser Wandtaster für den flächenbündigen Einbau.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-room-comfort-sensor-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Room Comfort Sensor Tree",
    description: "Misst Temperatur, Luftfeuchtigkeit und Luftqualität im Raum.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-motion-sensor-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Motion Sensor Tree",
    description: "Bewegungsmelder für Präsenzerkennung.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-presence-sensor-ceiling-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Präsenzmelder Deckeneinbau Tree",
    description: "Deckenbündiger Präsenzmelder für feine Bewegungserkennung im Raum.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-weather-station",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Weather Station",
    description: "Außensensor für Wind, Regen, Helligkeit und Temperatur.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-valve-actuator-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "climate",
    label: "Valve Actuator Tree",
    description: "Steuert Heizkörper- oder Fußbodenheizungsventile.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-led-spot-rgbw-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "actuator",
    label: "LED Spot RGBW Tree",
    description: "Deckenspot mit RGBW-Leuchtmittel und eigenem Tree-Anschluss.",
    technology: "loxone-tree",
    countsAsTreeDevice: true,
  },
  {
    id: "loxone-window-contact-air",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Fensterkontakt Air",
    description: "Funk-Öffnungsmelder für Fenster, verbunden über Air Base Extension.",
    technology: "loxone-air",
    countsAsTreeDevice: false,
  },
  {
    id: "loxone-door-contact-air",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Türkontakt Air",
    description: "Funk-Öffnungsmelder für Türen, verbunden über Air Base Extension.",
    technology: "loxone-air",
    countsAsTreeDevice: false,
  },
  {
    id: "loxone-ceiling-speaker",
    systemId: LOXONE_SYSTEM.id,
    category: "actuator",
    label: "Deckeneinbaulautsprecher",
    description: "Multiroom-Audio über eine Audio-Zone, eigenes Lautsprecherkabel statt Tree.",
    technology: "audio",
    countsAsTreeDevice: false,
  },
];

const SMART_HOME_CATALOGS: Record<string, SmartHomeDeviceModel[]> = {
  [LOXONE_SYSTEM.id]: LOXONE_CATALOG,
};

export function getSmartHomeCatalog(systemId: string): SmartHomeDeviceModel[] {
  return SMART_HOME_CATALOGS[systemId] ?? [];
}

export function findSmartHomeModel(modelId: string): SmartHomeDeviceModel | undefined {
  return Object.values(SMART_HOME_CATALOGS)
    .flat()
    .find((model) => model.id === modelId);
}

/** Which hardware categories are plausible for each placeable electrical
 * device type — narrows the picker instead of showing the full catalog
 * everywhere. Network sockets have no Loxone hardware role, so they're
 * simply omitted rather than mapped to something misleading. */
export const DEVICE_TYPE_SMART_HOME_CATEGORIES: Partial<
  Record<ElectricalDeviceType, SmartHomeDeviceCategory[]>
> = {
  outlet: ["actuator"],
  light: ["actuator"],
  switch: ["input"],
  sensor: ["sensor", "climate"],
};

export const DISTRIBUTION_BOARD_SMART_HOME_CATEGORIES: SmartHomeDeviceCategory[] = [
  "controller",
];

/** Every category — used by the standalone Smart-Home placement tool,
 * where the user picks freely from the whole catalog. */
export const ALL_SMART_HOME_CATEGORIES: SmartHomeDeviceCategory[] = [
  "controller",
  "actuator",
  "input",
  "sensor",
  "climate",
];
