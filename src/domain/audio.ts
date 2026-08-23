/**
 * Multiroom-Audio zones (§11/§12). A zone is just a named grouping — e.g.
 * "Wohnzimmer", "Küche", "Terrasse" — that speakers connect to; unlike a
 * Tree branch it carries no device/length limit, and each speaker still
 * gets its own home-run speaker cable rather than sharing a bus (§12
 * doesn't describe an audio bus the way Tree is one, so this stays a
 * star, just on its own cable type).
 */
export interface AudioZone {
  id: string;
  floorId: string;
  name: string;
}
