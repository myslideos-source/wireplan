"use client";

import Link from "next/link";
import { Plug, LayoutGrid } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/ui";
import { useEditorStore } from "@/features/editor/store";
import { DEVICE_TYPE_LABELS, findSmartHomeModel, type ElectricalDeviceType } from "@/domain";

/**
 * A cross-project device overview needs persistence (Supabase) that
 * doesn't exist yet — but the devices placed in the editor this session
 * genuinely live in the client store, so this shows the currently open
 * floor's real devices instead of a flat "coming soon" (§85). Switching
 * floors or projects happens in the editor; this page just reflects
 * whatever is currently loaded there.
 */
export function DevicesOverview() {
  const floorId = useEditorStore((state) => state.floorId);
  const rooms = useEditorStore((state) => state.rooms);
  const devices = useEditorStore((state) => state.devices);
  const smartHomeDevices = useEditorStore((state) => state.smartHomeDevices);

  if (!floorId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-8 py-16 text-center">
        <Plug className="h-10 w-10 text-text-muted" />
        <h1 className="text-xl font-semibold text-text">
          Noch kein Projekt im Editor geöffnet
        </h1>
        <p className="text-sm text-text-secondary">
          Eine projektübergreifende Geräte-Übersicht braucht eine Datenbank,
          die hier noch nicht angebunden ist. Diese Seite zeigt stattdessen
          ehrlich die Geräte der Etage, die aktuell im Editor geöffnet ist.
        </p>
        <Link href="/dashboard">
          <Button>Zum Dashboard</Button>
        </Link>
      </div>
    );
  }

  const deviceCounts: Record<ElectricalDeviceType, number> = {
    outlet: 0,
    light: 0,
    switch: 0,
    sensor: 0,
    network: 0,
  };
  for (const device of devices) deviceCounts[device.type] += 1;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Geräte</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Aktuell im Editor geöffnete Etage — nicht projektübergreifend.
          </p>
        </div>
        <Link href="/editor">
          <Button variant="secondary" size="sm">
            <LayoutGrid className="h-4 w-4" />
            Im Editor bearbeiten
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(Object.keys(deviceCounts) as ElectricalDeviceType[]).map((type) => (
          <div
            key={type}
            className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-border bg-panel px-4 py-3"
          >
            <span className="text-xs text-text-muted">{DEVICE_TYPE_LABELS[type]}</span>
            <span className="tabular-nums-font text-xl font-semibold text-text">
              {deviceCounts[type]}
            </span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Geräteliste</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {devices.length === 0 && smartHomeDevices.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Noch keine Geräte auf dieser Etage platziert.
            </p>
          ) : (
            <>
              {devices.map((device) => {
                const room = rooms.find((r) => r.id === device.roomId);
                const model = device.smartHomeModelId
                  ? findSmartHomeModel(device.smartHomeModelId)
                  : undefined;
                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-text">{DEVICE_TYPE_LABELS[device.type]}</span>
                      <span className="text-xs text-text-muted">{room?.name ?? "—"}</span>
                    </div>
                    {model && (
                      <span className="text-xs text-text-secondary">{model.label}</span>
                    )}
                  </div>
                );
              })}
              {smartHomeDevices.map((device) => {
                const room = rooms.find((r) => r.id === device.roomId);
                const model = findSmartHomeModel(device.modelId);
                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="text-text">Smart-Home-Gerät</span>
                      <span className="text-xs text-text-muted">{room?.name ?? "—"}</span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {model?.label ?? device.modelId}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
