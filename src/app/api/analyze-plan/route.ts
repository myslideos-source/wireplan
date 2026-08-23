import { NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type {
  ElementTypeConfidence,
  RealAnalysisResult,
} from "@/features/plan-analysis/types";

export const runtime = "nodejs";
// 60s is the maximum allowed on Vercel Hobby; upgrade this if the project
// moves to Pro and still needs more headroom.
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
senke die Konfidenz entsprechend.`;

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

  let parsed: Omit<RealAnalysisResult, "fileName" | "model" | "analyzedAt">;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return NextResponse.json(
      { error: "Die KI-Antwort konnte nicht als JSON gelesen werden." },
      { status: 502 },
    );
  }

  const result: RealAnalysisResult = {
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
  };

  return NextResponse.json(result);
}
