import type { Point, Wall, Room, Opening, Floor, Project } from "@/domain";
import { polygonAreaSqMeters } from "@/domain";
import type { FloorGeometry } from "@/features/editor/mock-geometry";
import type { FlaggedArea } from "./types";

/**
 * Raw shape the AI is asked for: room polygons and door/window positions in
 * meters, one shared coordinate system for the whole floor. This is
 * deliberately a rough estimate, not a survey — every low-confidence room
 * or opening below becomes a review-mode flag rather than being presented
 * as settled fact (§85).
 */
export interface AiGeometryRoom {
  name: string;
  roomType: string;
  polygonMeters: Point[];
  confidence: number;
}

export interface AiGeometryOpening {
  kind: "door" | "window";
  positionMeters: Point;
  widthMeters: number;
  confidence: number;
}

export interface AiGeometryDraft {
  rooms: AiGeometryRoom[];
  openings: AiGeometryOpening[];
}

const LOW_CONFIDENCE = 85;
const CRITICAL_CONFIDENCE = 65;
/** Two room polygons' edges snap to the same wall if their endpoints are
 * within this tolerance — AI-estimated coordinates for a shared wall won't
 * land on the exact same mm, but should be close if the prompt asked the
 * model to reuse coordinates for shared edges. */
const SHARED_EDGE_TOLERANCE_MM = 150;

function toMm(point: Point): Point {
  return { x: Math.round(point.x * 1000), y: Math.round(point.y * 1000) };
}

function edgeKey(a: Point, b: Point): string {
  const round = (v: number) => Math.round(v / SHARED_EDGE_TOLERANCE_MM) * SHARED_EDGE_TOLERANCE_MM;
  const pa = `${round(a.x)},${round(a.y)}`;
  const pb = `${round(b.x)},${round(b.y)}`;
  return pa < pb ? `${pa}|${pb}` : `${pb}|${pa}`;
}

function closestPointOnSegment(
  point: Point,
  a: Point,
  b: Point,
): { offset: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const length = Math.sqrt(lengthSq);
  if (lengthSq === 0) return { offset: 0, distance: Math.hypot(point.x - a.x, point.y - a.y) };
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return {
    offset: t * length,
    distance: Math.hypot(point.x - projX, point.y - projY),
  };
}

export function buildGeometryFromAiDraft(
  draft: AiGeometryDraft,
  generalObservations: { title: string; description: string; severity: FlaggedArea["severity"] }[],
  fileName: string,
): { project: Project; geometry: FloorGeometry; flaggedAreas: FlaggedArea[] } {
  const floorId = "floor-ai-draft";
  const floor: Floor = {
    id: floorId,
    projectId: "ai-draft",
    name: "KI-Entwurf",
    level: 0,
  };

  const walls: Wall[] = [];
  const wallByKey = new Map<string, Wall>();
  let wallCounter = 0;
  const flaggedAreas: FlaggedArea[] = [];

  const rooms: Room[] = draft.rooms.map((aiRoom, index) => {
    const polygon = aiRoom.polygonMeters.map(toMm);
    for (let e = 0; e < polygon.length; e++) {
      const a = polygon[e];
      const b = polygon[(e + 1) % polygon.length];
      const key = edgeKey(a, b);
      if (!wallByKey.has(key)) {
        wallCounter += 1;
        const wall: Wall = {
          id: `wall-ai-${wallCounter}`,
          floorId,
          start: a,
          end: b,
          thickness: 150,
          height: 2500,
        };
        wallByKey.set(key, wall);
        walls.push(wall);
      }
    }

    const roomId = `room-ai-${index + 1}`;
    if (aiRoom.confidence < LOW_CONFIDENCE) {
      flaggedAreas.push({
        id: `flag-room-${index + 1}`,
        title: `Raum unsicher: ${aiRoom.name || "unbenannt"}`,
        description: `Die KI ist sich bei diesem Raum nur zu ${aiRoom.confidence}% sicher — bitte Form und Maße im Plan gegenprüfen.`,
        confidence: aiRoom.confidence,
        severity: aiRoom.confidence < CRITICAL_CONFIDENCE ? "critical" : "warning",
        target: { type: "room", id: roomId },
      });
    }

    return {
      id: roomId,
      floorId,
      name: aiRoom.name || `Raum ${index + 1}`,
      type: aiRoom.roomType || "Sonstiges",
      polygon,
      area: polygonAreaSqMeters(polygon),
      height: 2500,
    };
  });

  const openings: Opening[] = [];
  draft.openings.forEach((aiOpening, index) => {
    if (walls.length === 0) return;
    const point = toMm(aiOpening.positionMeters);
    let best: { wall: Wall; offset: number; distance: number } | null = null;
    for (const wall of walls) {
      const { offset, distance } = closestPointOnSegment(point, wall.start, wall.end);
      if (!best || distance < best.distance) best = { wall, offset, distance };
    }
    if (!best) return;

    const openingId = `opening-ai-${index + 1}`;
    openings.push({
      id: openingId,
      wallId: best.wall.id,
      type: aiOpening.kind,
      offset: best.offset,
      width: Math.round(aiOpening.widthMeters * 1000),
    });

    if (aiOpening.confidence < LOW_CONFIDENCE) {
      flaggedAreas.push({
        id: `flag-opening-${index + 1}`,
        title: aiOpening.kind === "door" ? "Tür unsicher erkannt" : "Fenster unsicher erkannt",
        description: `Position und Breite wurden nur zu ${aiOpening.confidence}% sicher geschätzt.`,
        confidence: aiOpening.confidence,
        severity: aiOpening.confidence < CRITICAL_CONFIDENCE ? "critical" : "warning",
        target: { type: "opening", id: openingId },
      });
    }
  });

  for (const [index, observation] of generalObservations.entries()) {
    flaggedAreas.push({
      id: `flag-general-${index + 1}`,
      title: observation.title,
      description: observation.description,
      confidence: 0,
      severity: observation.severity,
    });
  }

  const project: Project = {
    id: "ai-draft",
    name: fileName,
    address: "",
    geometryStatus: "IN_REVIEW",
    stages: [],
    kpis: {
      floors: 1,
      rooms: rooms.length,
      devices: 0,
      cableLengthMeters: 0,
      circuits: 0,
    },
    updatedAt: new Date().toISOString(),
  };

  return {
    project,
    geometry: { floor, walls, rooms, openings },
    flaggedAreas,
  };
}
