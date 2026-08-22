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

export interface SmartHomeDevice {
  id: string;
  manufacturerId: string;
  systemId: string;
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

export interface SmartHomeDeviceModel {
  id: string;
  systemId: string;
  category: SmartHomeDeviceCategory;
  label: string;
  description: string;
}

/** Loxone's real Tree/Air product line — the genuine hardware names a
 * planner would actually assign, not a fabricated placeholder catalog. */
export const LOXONE_CATALOG: SmartHomeDeviceModel[] = [
  {
    id: "loxone-miniserver-gen2",
    systemId: LOXONE_SYSTEM.id,
    category: "controller",
    label: "Miniserver Gen. 2",
    description: "Zentrale Steuereinheit der gesamten Loxone-Installation.",
  },
  {
    id: "loxone-extension",
    systemId: LOXONE_SYSTEM.id,
    category: "controller",
    label: "Extension",
    description: "Erweitert den Miniserver um zusätzliche Ein-/Ausgänge.",
  },
  {
    id: "loxone-air-base-extension",
    systemId: LOXONE_SYSTEM.id,
    category: "controller",
    label: "Air Base Extension",
    description: "Funkbasis für kabellose Loxone Air Geräte.",
  },
  {
    id: "loxone-relay-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "actuator",
    label: "Relay Tree",
    description: "Schaltet bis zu 8 Stromkreise, z.B. Steckdosen.",
  },
  {
    id: "loxone-dimmer-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "actuator",
    label: "Dimmer Tree",
    description: "Dimmt bis zu 4 Beleuchtungskreise.",
  },
  {
    id: "loxone-nano-dimmer-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "actuator",
    label: "Nano Dimmer Tree",
    description: "Unterputz-Dimmer für eine einzelne Leuchte.",
  },
  {
    id: "loxone-touch-pure-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "input",
    label: "Touch Pure Tree",
    description: "Wandtaster mit Temperaturfühler und Statusanzeige.",
  },
  {
    id: "loxone-touch-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "input",
    label: "Touch Tree",
    description: "Einfacher beleuchteter Wandtaster.",
  },
  {
    id: "loxone-room-comfort-sensor-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Room Comfort Sensor Tree",
    description: "Misst Temperatur, Luftfeuchtigkeit und Luftqualität im Raum.",
  },
  {
    id: "loxone-motion-sensor-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Motion Sensor Tree",
    description: "Bewegungsmelder für Präsenzerkennung.",
  },
  {
    id: "loxone-weather-station",
    systemId: LOXONE_SYSTEM.id,
    category: "sensor",
    label: "Weather Station",
    description: "Außensensor für Wind, Regen, Helligkeit und Temperatur.",
  },
  {
    id: "loxone-valve-actuator-tree",
    systemId: LOXONE_SYSTEM.id,
    category: "climate",
    label: "Valve Actuator Tree",
    description: "Steuert Heizkörper- oder Fußbodenheizungsventile.",
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
