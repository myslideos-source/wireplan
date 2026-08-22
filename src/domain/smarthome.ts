/**
 * Smart-home integrations (Loxone and future systems) must stay generic —
 * never hard-coded as `if (loxone)` throughout the app (§56).
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
