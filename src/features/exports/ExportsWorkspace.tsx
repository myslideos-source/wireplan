"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import type { Project } from "@/domain";
import { Card, CardHeader, CardTitle, CardContent, Button, KpiCard } from "@/components/ui";
import { useEditorStore } from "@/features/editor/store";
import { findSmartHomeModel } from "@/domain";
import { formatNumber } from "@/lib/utils";

export function ExportsWorkspace({ project }: { project: Project }) {
  const floors = useEditorStore((state) => state.floors);
  const floorId = useEditorStore((state) => state.floorId);
  const rooms = useEditorStore((state) => state.rooms);
  const devices = useEditorStore((state) => state.devices);
  const smartHomeDevices = useEditorStore((state) => state.smartHomeDevices);
  const distributionBoard = useEditorStore((state) => state.distributionBoard);
  const cables = useEditorStore((state) => state.cables);
  const roomCircuits = useEditorStore((state) => state.roomCircuits);
  const [generating, setGenerating] = useState(false);

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
      const boardModelId = distributionBoard?.smartHomeModelId;
      if (assignedDevices.length === 0 && !boardModelId && smartHomeDevices.length === 0) {
        line("Noch keine Loxone-Hardware zugewiesen.");
      } else {
        if (boardModelId) {
          line(`Schaltschrank: ${findSmartHomeModel(boardModelId)?.label ?? boardModelId}`, 10, 6);
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

      doc.save(`${project.name.replace(/\s+/g, "_")}_${floorName || "export"}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">{project.name}</p>
          <h1 className="text-2xl font-semibold text-text">Exporte</h1>
        </div>
        <Button onClick={handleExport} disabled={generating}>
          <FileDown className="h-4 w-4" />
          {generating ? "Erstelle PDF…" : "Als PDF exportieren"}
        </Button>
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
            Kennzahlen, Kabelliste, Materialliste und zugewiesene
            Loxone-Hardware der aktuell im Editor geöffneten Etage (
            {floorName || "—"}) — als echtes PDF, direkt im Browser erzeugt,
            ohne Server-Anbindung.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
