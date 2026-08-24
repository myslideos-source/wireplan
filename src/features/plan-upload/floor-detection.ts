import type { PdfPageImage } from "./pdf-pages";
import type { FloorLabelDetection } from "@/app/api/detect-floor-label/route";

/** One page of a multi-page plan under review before it becomes a floor —
 * shared between the "Etage anlegen" and "Grundriss hochladen" dialogs so
 * both offer the identical review/confirm step for a split PDF. */
export interface PageDraft {
  page: PdfPageImage;
  name: string;
  level: number;
  include: boolean;
  confidence: number | null;
  detectionFailed: boolean;
}

export function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  return fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => new File([blob], filename, { type: blob.type || "image/png" }));
}

/** Falls back to a plain sequential label rather than guessing a real
 * floor name — used only when the AI detection call itself failed or
 * came back very unsure. */
export function sequentialFallbackName(index: number): string {
  if (index === 0) return "Erdgeschoss";
  if (index === 1) return "Obergeschoss";
  return `Geschoss ${index}`;
}

export async function detectFloorLabel(
  page: PdfPageImage,
  totalPages: number,
): Promise<{ label: string; level: number; confidence: number } | null> {
  try {
    const file = await dataUrlToFile(page.dataUrl, `seite-${page.pageNumber}.png`);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pageNumber", String(page.pageNumber));
    formData.append("totalPages", String(totalPages));
    const response = await fetch("/api/detect-floor-label", { method: "POST", body: formData });
    if (!response.ok) return null;
    const parsed = (await response.json()) as FloorLabelDetection;
    return parsed;
  } catch {
    return null;
  }
}
