"use client";

/**
 * Client-side PDF page rasterization (Phase 12 — multi-page plan import).
 * The uploaded PDF is never sent anywhere for geometry estimation; each
 * page is rendered to a plain raster image in the browser and that image
 * becomes a floor's locked background, unchanged, per the "never redraw
 * the architectural geometry" principle established in Phase 11.
 */
export interface PdfPageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

const RENDER_SCALE = 2.5;

export async function renderPdfPages(file: File): Promise<PdfPageImage[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PdfPageImage[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    pages.push({
      pageNumber,
      dataUrl: canvas.toDataURL("image/png"),
      width: viewport.width,
      height: viewport.height,
    });
  }
  return pages;
}
