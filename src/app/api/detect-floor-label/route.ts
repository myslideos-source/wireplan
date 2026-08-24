import { NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "gemini-3.6-flash";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["image/png", "image/jpeg"];

export interface FloorLabelDetection {
  label: string;
  level: number;
  confidence: number;
}

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    label: {
      type: Type.STRING,
      description:
        "Kurzes deutsches Geschoss-Label, z.B. 'Erdgeschoss', '1. Obergeschoss', 'Dachgeschoss', 'Kellergeschoss', oder 'Unbekannt' falls nicht erkennbar.",
    },
    level: {
      type: Type.INTEGER,
      description:
        "Numerische Ebene: Erdgeschoss=0, 1. Obergeschoss=1, 2. Obergeschoss=2, usw.; Kellergeschoss=-1, Tiefgeschoss=-2 usw. Beste Schätzung auch bei 'Unbekannt'.",
    },
    confidence: {
      type: Type.INTEGER,
      description: "0-100, ehrliche Konfidenz — niedrig ansetzen, wenn auf der Seite kein Geschoss-Hinweis erkennbar ist.",
    },
  },
  required: ["label", "level", "confidence"],
};

/**
 * One page of a multi-page plan upload (Phase 12) — a single, cheap Gemini
 * call per page to read whatever floor label the architect's plan already
 * carries (Planköpfe, Beschriftungen wie "EG"/"OG", Raumnamen). This never
 * estimates or redraws geometry — it only reads text/labels to suggest
 * which floor a page belongs to; the user always sees and can correct the
 * suggestion before any floor is created.
 */
const PROMPT_PREFIX = `Du siehst eine einzelne Seite eines mehrseitigen Gebäude-Grundrissplans.
Bestimme anhand von Beschriftungen auf dem Plan (Plankopf, Titel, "EG"/"OG"/"DG"/"KG",
Raumbezeichnungen wie "Garage" oder "Keller"), welches Geschoss diese Seite zeigt.
Erfinde nichts — wenn kein Hinweis erkennbar ist, antworte mit label="Unbekannt"
und einer niedrigen Konfidenz, aber schätze level trotzdem so gut wie möglich anhand
der Position im Dokument (spätere Seiten sind meist höhere Geschosse). Antworte
ausschließlich auf Deutsch.`;

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
    return NextResponse.json({ error: "Datei ist zu groß (maximal 8 MB)." }, { status: 400 });
  }

  const pageNumber = formData.get("pageNumber");
  const totalPages = formData.get("totalPages");
  const positionHint =
    typeof pageNumber === "string" && typeof totalPages === "string"
      ? `\n\nDies ist Seite ${pageNumber} von ${totalPages} in der hochgeladenen Datei.`
      : "";

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
            { text: PROMPT_PREFIX + positionHint },
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
    return NextResponse.json({ error: `KI-Anfrage fehlgeschlagen: ${message}` }, { status: 502 });
  }

  if (!responseText) {
    return NextResponse.json({ error: "Die KI hat keine Antwort geliefert." }, { status: 502 });
  }

  let parsed: FloorLabelDetection;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return NextResponse.json(
      { error: "Die KI-Antwort konnte nicht als JSON gelesen werden." },
      { status: 502 },
    );
  }

  return NextResponse.json(parsed);
}
