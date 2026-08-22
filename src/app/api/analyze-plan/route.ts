import { NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type {
  ElementTypeConfidence,
  RealAnalysisResult,
} from "@/features/plan-analysis/types";
import type { AiGeometryDraft } from "@/features/plan-analysis/ai-geometry";

export const runtime = "nodejs";
// The geometry draft makes the response noticeably larger to generate than
// a plain count — this can take longer than Vercel's default function
// timeout (10s on Hobby). 60s is the maximum allowed on Hobby; upgrade this
// if the project moves to Pro and still needs more headroom.
export const maxDuration = 60;

const MODEL = "gemini-3.6-flash";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg", "application/pdf"];

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    roomsDetected: { type: Type.INTEGER },
    wallsCount: { type: Type.INTEGER },
    doorsCount: { type: Type.INTEGER },
    windowsCount: { type: Type.INTEGER },
    stairsCount: { type: Type.INTEGER },
    overallConfidence: {
      type: Type.INTEGER,
      description: "0-100, your own confidence in this reading of the plan",
    },
    elementConfidence: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ["room", "wall", "door", "window", "stair"],
          },
          label: { type: Type.STRING },
          count: { type: Type.INTEGER },
          confidence: { type: Type.INTEGER },
        },
        required: ["type", "label", "count", "confidence"],
      },
    },
    observations: {
      type: Type.ARRAY,
      description:
        "Notable ambiguities or uncertainties you actually found — empty array if none.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["warning", "critical"] },
        },
        required: ["title", "description", "severity"],
      },
    },
    summary: {
      type: Type.STRING,
      description: "One or two German sentences summarizing the plan.",
    },
    geometry: {
      type: Type.OBJECT,
      description:
        "A rough 2D geometry estimate for further manual review — not a survey.",
      properties: {
        rooms: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              roomType: { type: Type.STRING },
              polygonMeters: {
                type: Type.ARRAY,
                description:
                  "Closed polygon, clockwise, in meters, same shared coordinate system for the whole floor.",
                items: {
                  type: Type.OBJECT,
                  properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                  required: ["x", "y"],
                },
              },
              confidence: { type: Type.INTEGER },
            },
            required: ["name", "roomType", "polygonMeters", "confidence"],
          },
        },
        openings: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              kind: { type: Type.STRING, enum: ["door", "window"] },
              positionMeters: {
                type: Type.OBJECT,
                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } },
                required: ["x", "y"],
              },
              widthMeters: { type: Type.NUMBER },
              confidence: { type: Type.INTEGER },
            },
            required: ["kind", "positionMeters", "widthMeters", "confidence"],
          },
        },
      },
      required: ["rooms", "openings"],
    },
  },
  required: [
    "roomsDetected",
    "wallsCount",
    "doorsCount",
    "windowsCount",
    "stairsCount",
    "overallConfidence",
    "elementConfidence",
    "observations",
    "summary",
    "geometry",
  ],
};

const PROMPT = `Du analysierst einen hochgeladenen Gebäude-Grundrissplan (Bild oder PDF).
Zähle so genau wie möglich: Räume, Wände, Türen, Fenster, Treppen.
Gib für jeden Elementtyp eine eigene Konfidenz (0-100) an, sowie eine
Gesamtkonfidenz für deine gesamte Auswertung. Wenn etwas auf dem Plan unklar,
mehrdeutig oder schwer lesbar ist, trage das ehrlich als "observation" ein
(z.B. unklare Raumaufteilung, unlesbare Bemaßung) statt es zu raten oder zu
verschweigen. Antworte ausschließlich auf Deutsch. Erfinde keine Werte, die du
auf dem Bild nicht erkennen kannst — schätze in diesem Fall konservativ und
senke die Konfidenz entsprechend.

Zusätzlich: Schätze eine grobe 2D-Geometrie ("geometry") zur späteren
manuellen Prüfung — keine Vermessung, nur ein Entwurf. Verwende EIN
gemeinsames Koordinatensystem in Metern für den gesamten Grundriss (x nach
rechts, y nach unten), das für alle Räume konsistent ist. Gib pro Raum ein
geschlossenes Polygon im Uhrzeigersinn an ("polygonMeters"). WICHTIG: Wenn
zwei Räume an derselben Wand aneinandergrenzen, verwende für diese
gemeinsame Kante in beiden Polygonen exakt dieselben Koordinaten, damit die
Wand erkennbar als eine einzige gemeinsame Wand behandelt werden kann. Gib
für jede Tür/jedes Fenster eine ungefähre Position (im selben
Koordinatensystem) und Breite in Metern an. Vergib auch hier ehrliche,
konservative Konfidenzwerte statt zu raten.`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY ist auf dem Server nicht konfiguriert. Bitte als Umgebungsvariable hinterlegen.",
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Dateityp ${file.type || "unbekannt"} wird nicht unterstützt.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Datei ist zu groß (maximal 8 MB)." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64Data = bytes.toString("base64");

  const ai = new GoogleGenAI({ apiKey });

  let responseText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType: file.type, data: base64Data } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    responseText = response.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: `KI-Anfrage fehlgeschlagen: ${message}` },
      { status: 502 },
    );
  }

  if (!responseText) {
    return NextResponse.json(
      { error: "Die KI hat keine Antwort geliefert." },
      { status: 502 },
    );
  }

  let parsed: Omit<RealAnalysisResult, "fileName" | "model" | "analyzedAt"> & {
    geometry: AiGeometryDraft;
  };
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return NextResponse.json(
      { error: "Die KI-Antwort konnte nicht als JSON gelesen werden." },
      { status: 502 },
    );
  }

  const result: RealAnalysisResult & { geometryDraft: AiGeometryDraft } = {
    fileName: file.name,
    model: MODEL,
    analyzedAt: new Date().toISOString(),
    roomsDetected: parsed.roomsDetected,
    wallsCount: parsed.wallsCount,
    doorsCount: parsed.doorsCount,
    windowsCount: parsed.windowsCount,
    stairsCount: parsed.stairsCount,
    overallConfidence: parsed.overallConfidence,
    elementConfidence: parsed.elementConfidence as ElementTypeConfidence[],
    observations: parsed.observations,
    summary: parsed.summary,
    geometryDraft: parsed.geometry,
  };

  return NextResponse.json(result);
}
