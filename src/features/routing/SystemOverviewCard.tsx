"use client";

import { GitBranch, Wifi as AirIcon, Wifi, Volume2 } from "lucide-react";
import type { AudioZone, ElectricalDevice, SmartHomeDevice, TreeBranch } from "@/domain";
import { findSmartHomeModel, MAX_TREE_DEVICES_PER_BRANCH } from "@/domain";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

/**
 * §22 (mockup) — a "System Übersicht" card. Only shows metrics this app's
 * domain model can actually back with a real count/limit: Loxone doesn't
 * publish a fixed catalog-wide capacity for Relais-Ausgänge or 24V-
 * Leistung in our SmartHomeDeviceModel data, so — rather than inventing
 * a denominator — this only lists Tree-Geräte (real per-branch limit,
 * MAX_TREE_DEVICES_PER_BRANCH), Air-Geräte, Netzwerkdosen, and Audio-
 * Zonen, all plain counts computed from the live store.
 */
export function SystemOverviewCard({
  devices,
  smartHomeDevices,
  treeBranches,
  audioZones,
}: {
  devices: ElectricalDevice[];
  smartHomeDevices: SmartHomeDevice[];
  treeBranches: TreeBranch[];
  audioZones: AudioZone[];
}) {
  let treeDeviceCount = 0;
  let airDeviceCount = 0;
  for (const device of devices) {
    const model = device.smartHomeModelId ? findSmartHomeModel(device.smartHomeModelId) : undefined;
    if (model?.countsAsTreeDevice) treeDeviceCount += 1;
    if (model?.connectionType === "Air") airDeviceCount += 1;
  }
  for (const device of smartHomeDevices) {
    const model = findSmartHomeModel(device.modelId);
    if (model?.countsAsTreeDevice) treeDeviceCount += 1;
    if (model?.connectionType === "Air") airDeviceCount += 1;
  }
  const treeCapacity = treeBranches.length * MAX_TREE_DEVICES_PER_BRANCH;
  const networkDeviceCount = devices.filter((d) => d.type === "network").length;

  const rows = [
    {
      icon: GitBranch,
      label: "Tree-Geräte",
      value: treeCapacity > 0 ? `${treeDeviceCount} / ${treeCapacity}` : String(treeDeviceCount),
    },
    { icon: AirIcon, label: "Air-Geräte", value: String(airDeviceCount) },
    { icon: Wifi, label: "Netzwerkdosen", value: String(networkDeviceCount) },
    { icon: Volume2, label: "Audio-Zonen", value: String(audioZones.length) },
  ];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm">System Übersicht</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2.5 text-xs">
            <row.icon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            <span className="flex-1 text-text-secondary">{row.label}</span>
            <span className="tabular-nums-font font-medium text-text">{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
