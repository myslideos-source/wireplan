"use client";

import { useState } from "react";
import { FileDown, Image as ImageIcon, FileCode } from "lucide-react";
import type { Project } from "@/domain";
import { Card, CardHeader, CardTitle, CardContent, Button, KpiCard } from "@/components/ui";
import { useEditorStore } from "@/features/editor/store";
import { findSmartHomeModel, numberingPrefixFor, DEVICE_TYPE_LABELS, NETWORK_DEVICE_LABELS } from "@/domain";
import { formatNumber } from "@/lib/utils";
import { buildFloorPlanSvg } from "./svg-export";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportsWorkspace({ project }: { project: Project }) {
  const floors = useEditorStore((state) => state.floors);
  const floorId = useEditorStore((state) => state.floorId);
  const rooms = useEditorStore((state) => state.rooms);
  const backgroundImage = useEditorStore((state) => state.backgroundImage);
  const devices = useEditorStore((state) => state.devices);
  const smartHomeDevices = useEditorStore((state) => state.smartHomeDevices);
  const fixedConsumers = useEditorStore((state) => state.fixedConsumers);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const cables = useEditorStore((state) => state.cables);
  const roomCircuits = useEditorStore((state) => state.roomCircuits);
  const [generating, setGenerating] = useState(false);
  const [exportingImage, setExportingImage] = useState<"svg" | "png" | null>(null);

  const floorName = floors.find((f) => f.floor.id === floorId)?.floor.name ?? "";
  const totalCableLength = cables.reduce((sum, c) => sum + c.lengthMeters, 0);
  const circuitCount = new Set(Object.values(roomCircuits).filter(Boolean)).size;

  async function handleExport() {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const marginX = 15;
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 20;

      function line(text: string, size = 11, gap = 7) {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(size);
        doc.text(text, marginX, y);
        y += gap;
      }

      line(project.name, 18, 10);
      line(`${floorName} · Export erstellt am ${new Date().toLocaleString("de-DE")}`, 10, 12);

      line("Kennzahlen", 14, 8);
      line(`Räume: ${rooms.length}`);
      line(`Geräte: ${devices.length + smartHomeDevices.length}`);
      line(`Kabellänge gesamt: ${formatNumber(totalCableLength, 1)} m`);
      line(`Stromkreise: ${circuitCount}`);
      line(`Schaltschrank: ${distributionBoard ? "platziert" : "nicht platziert"}`, 11, 12);

      line("Kabelliste", 14, 8);
      if (cables.length === 0) {
        line("Noch keine Kabelwege berechnet.");
      } else {
        for (const cable of cables) {
          line(
            `${cable.id} · ${cable.targetLabel} · ${cable.type} · ${formatNumber(cable.lengthMeters, 1)} m`,
            10,
            6,
          );
        }
      }
      y += 4;

      line("Materialliste", 14, 8);
      if (cables.length === 0) {
        line("Aus der Kabelliste abgeleitet — noch keine Daten.");
      } else {
        const totalsByType = new Map<string, number>();
        for (const cable of cables) {
          totalsByType.set(cable.type, (totalsByType.get(cable.type) ?? 0) + cable.lengthMeters);
        }
        for (const [type, meters] of totalsByType.entries()) {
          line(`${type}: ${formatNumber(meters, 1)} m`, 10, 6);
        }
      }
      y += 4;

      line("Loxone-Geräte", 14, 8);
      const assignedDevices = devices.filter((d) => d.smartHomeModelId);
      const cabinetModelIds = distributionBoard?.cabinetComponentModelIds ?? [];
      if (assignedDevices.length === 0 && cabinetModelIds.length === 0 && smartHomeDevices.length === 0) {
        line("Noch keine Loxone-Hardware zugewiesen.");
      } else {
        for (const modelId of cabinetModelIds) {
          line(`Schaltschrank: ${findSmartHomeModel(modelId)?.label ?? modelId}`, 10, 6);
        }
        for (const device of assignedDevices) {
          line(
            `${device.type}: ${findSmartHomeModel(device.smartHomeModelId!)?.label ?? device.smartHomeModelId}`,
            10,
            6,
          );
        }
        for (const device of smartHomeDevices) {
          line(`Eigenständig: ${findSmartHomeModel(device.modelId)?.label ?? device.modelId}`, 10, 6);
        }
      }
      y += 4;

      line("Legende", 14, 8);
      const legend = new Map<string, string>();
      for (const device of devices) {
        const label = device.type === "network" ? NETWORK_DEVICE_LABELS[device.networkDeviceSubtype ?? "dose"] : DEVICE_TYPE_LABELS[device.type];
        legend.set(
          numberingPrefixFor({ type: device.type, networkDeviceSubtype: device.networkDeviceSubtype }),
          label,
        );
      }
      for (const device of smartHomeDevices) {
        const model = findSmartHomeModel(device.modelId);
        legend.set(
          numberingPrefixFor({ category: model?.category, technology: model?.technology }),
          model?.label ?? "Smart-Home-Gerät",
        );
      }
      if (fixedConsumers.length > 0) legend.set("V", "Fester Verbraucher");
      if (legend.size === 0) {
        line("Noch keine Geräte platziert.");
      } else {
        for (const [prefix, label] of [...legend.entries()].sort()) {
          line(`${prefix}xx = ${label}`, 10, 6);
        }
      }

      doc.save(`${project.name.replace(/\s+/g, "_")}_${floorName || "export"}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  function buildSvgString(): string {
    return buildFloorPlanSvg({
      projectName: project.name,
      floorName,
      rooms,
      devices,
      smartHomeDevices,
      fixedConsumers,
      distributionBoard,
      backgroundImage,
    });
  }

  function handleSvgExport() {
    setExportingImage("svg");
    try {
      const blob = new Blob([buildSvgString()], { type: "image/svg+xml" });
      downloadBlob(blob, `${project.name.replace(/\s+/g, "_")}_${floorName || "export"}.svg`);
    } finally {
      setExportingImage(null);
    }
  }

  async function handlePngExport() {
    setExportingImage("png");
    try {
      const svgBlob = new Blob([buildSvgString()], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);
      try {
        const img = new window.Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("SVG konnte nicht geladen werden"));
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        const scale = Math.min(3, 3000 / Math.max(img.naturalWidth, 1));
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#F5F8F6";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (pngBlob) downloadBlob(pngBlob, `${project.name.replace(/\s+/g, "_")}_${floorName || "export"}.png`);
      } finally {
        URL.revokeObjectURL(url);
      }
    } finally {
      setExportingImage(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">{project.name}</p>
          <h1 className="text-2xl font-semibold text-text">Exporte</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSvgExport} disabled={exportingImage !== null}>
            <FileCode className="h-4 w-4" />
            SVG
          </Button>
          <Button variant="secondary" onClick={handlePngExport} disabled={exportingImage !== null}>
            <ImageIcon className="h-4 w-4" />
            {exportingImage === "png" ? "Erstelle PNG…" : "PNG"}
          </Button>
          <Button onClick={handleExport} disabled={generating}>
            <FileDown className="h-4 w-4" />
            {generating ? "Erstelle PDF…" : "Als PDF exportieren"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Räume" value={String(rooms.length)} />
        <KpiCard label="Geräte" value={String(devices.length + smartHomeDevices.length)} />
        <KpiCard label="Kabellänge" value={`${formatNumber(totalCableLength, 0)} m`} />
        <KpiCard label="Stromkreise" value={String(circuitCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enthalten im Export</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            <strong className="text-text">PDF:</strong> Kennzahlen, Kabelliste,
            Materialliste, zugewiesene Loxone-Hardware und eine automatisch
            erzeugte Legende der aktuell im Editor geöffneten Etage (
            {floorName || "—"}).
            <br />
            <strong className="text-text">SVG/PNG:</strong> eine
            vektorbasierte bzw. hochauflösende Rastergrafik des Grundrisses
            mit allen platzierten Geräten und derselben Legende. Alles direkt
            im Browser erzeugt, ohne Server-Anbindung.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
