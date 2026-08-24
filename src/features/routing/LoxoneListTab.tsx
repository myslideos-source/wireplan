import type { AudioZone, ElectricalDevice, DistributionBoard, SmartHomeDevice } from "@/domain";
import {
  DEVICE_TYPE_LABELS,
  findSmartHomeModel,
  PLANNING_CATEGORY_LABELS,
  PLANNING_CATEGORY_ORDER,
} from "@/domain";

export function LoxoneListTab({
  devices,
  distributionBoard,
  smartHomeDevices,
  audioZones,
}: {
  devices: ElectricalDevice[];
  distributionBoard: DistributionBoard | null;
  smartHomeDevices: SmartHomeDevice[];
  audioZones: AudioZone[];
}) {
  const assignedDevices = devices.filter((d) => d.smartHomeModelId);
  const cabinetModelIds = distributionBoard?.cabinetComponentModelIds ?? [];

  if (assignedDevices.length === 0 && cabinetModelIds.length === 0 && smartHomeDevices.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-text-secondary">
        Noch keine Loxone-Hardware zugewiesen. Wählen Sie im Editor ein Gerät
        oder den Schaltschrank aus und ordnen Sie im Inspector unter „Smart
        Home (Loxone)“ ein Gerät aus dem Katalog zu — oder platzieren Sie mit
        dem Werkzeug „Smart Home“ ein eigenständiges Loxone-Gerät.
      </p>
    );
  }

  const countsByModel = new Map<string, number>();
  for (const modelId of cabinetModelIds) {
    countsByModel.set(modelId, (countsByModel.get(modelId) ?? 0) + 1);
  }
  for (const device of assignedDevices) {
    const id = device.smartHomeModelId!;
    countsByModel.set(id, (countsByModel.get(id) ?? 0) + 1);
  }
  for (const device of smartHomeDevices) {
    countsByModel.set(device.modelId, (countsByModel.get(device.modelId) ?? 0) + 1);
  }

  // Grouped by planning category now that the catalog is ~110 entries —
  // a flat list of that many rows would be unreadable.
  const entriesByCategory = new Map<string, [string, number][]>();
  for (const entry of countsByModel.entries()) {
    const [modelId] = entry;
    const category = findSmartHomeModel(modelId)?.planningCategory;
    const key = category ? PLANNING_CATEGORY_LABELS[category] : "Sonstiges";
    const list = entriesByCategory.get(key) ?? [];
    list.push(entry);
    entriesByCategory.set(key, list);
  }
  const orderedGroupLabels = [
    ...PLANNING_CATEGORY_ORDER.map((c) => PLANNING_CATEGORY_LABELS[c]),
    "Sonstiges",
  ].filter((label) => entriesByCategory.has(label));

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <p className="text-xs text-text-muted">
        Aus den im Editor zugewiesenen und platzierten Loxone-Geräten
        zusammengestellt.
      </p>
      {orderedGroupLabels.map((groupLabel) => (
        <div key={groupLabel} className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {groupLabel}
          </p>
          {entriesByCategory.get(groupLabel)!.map(([modelId, count]) => {
            const model = findSmartHomeModel(modelId);
            return (
              <div
                key={modelId}
                className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-panel px-3 py-2.5 text-sm"
              >
                <div className="flex flex-col">
                  <span className="text-text">{model?.label ?? modelId}</span>
                  {model?.description && (
                    <span className="text-xs text-text-muted">{model.description}</span>
                  )}
                </div>
                <span className="tabular-nums-font font-medium text-text">
                  {count}×
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {(assignedDevices.length > 0 || smartHomeDevices.length > 0) && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-text-secondary">Pro Gerät</p>
          {assignedDevices.map((device) => (
            <div key={device.id} className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{DEVICE_TYPE_LABELS[device.type]}</span>
              <span className="font-medium text-text">
                {findSmartHomeModel(device.smartHomeModelId!)?.label ?? device.smartHomeModelId}
              </span>
            </div>
          ))}
          {smartHomeDevices.map((device) => (
            <div key={device.id} className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">Eigenständiges Gerät</span>
              <span className="font-medium text-text">
                {findSmartHomeModel(device.modelId)?.label ?? device.modelId}
              </span>
            </div>
          ))}
        </div>
      )}

      {audioZones.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-xs font-medium text-text-secondary">Audio-Zonen</p>
          {audioZones.map((zone) => {
            const count = smartHomeDevices.filter((d) => d.audioZoneId === zone.id).length;
            return (
              <div key={zone.id} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{zone.name}</span>
                <span className="font-medium text-text">{count} Lautsprecher</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
