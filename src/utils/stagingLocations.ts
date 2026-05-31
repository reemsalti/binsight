export type StagingZone = "instage" | "outstage";

export type ParsedStagingLocation = {
  zone: StagingZone;
  dockDoor: string;
  position: string;
  normalized: string;
};

export const STAGING_DOCK_COUNT = 4;
/** Open floor at each door — WMS only tracks scanned pallets, not fixed slots. */
export const STAGING_MAX_PALLETS_PER_DOOR = 6;

export const INSTAGE_ZONE_LABEL = "Instage · receiving docks";
export const OUTSTAGE_ZONE_LABEL = "Outstage · shipping docks";

export function formatInstageLocation(dock: number, position: number): string {
  return `IN-D${String(dock).padStart(2, "0")}-${String(position).padStart(2, "0")}`;
}

export function formatOutstageLocation(dock: number, position: number): string {
  return `OUT-D${String(dock).padStart(2, "0")}-${String(position).padStart(2, "0")}`;
}

export function normalizeStagingLocation(value: unknown): string | null {
  const raw = String(value ?? "").trim().toUpperCase();
  const match = raw.match(/^(IN|OUT)-D(\d{2})-(\d{2})$/);
  if (!match) return null;
  const position = Number(match[3]);
  if (position < 1 || position > STAGING_MAX_PALLETS_PER_DOOR) return null;
  return `${match[1]}-D${match[2]}-${match[3]}`;
}

export function parseStagingLocation(location: string): ParsedStagingLocation | null {
  const normalized = normalizeStagingLocation(location);
  if (!normalized) return null;
  const match = normalized.match(/^(IN|OUT)-D(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    zone: match[1] === "IN" ? "instage" : "outstage",
    dockDoor: match[2],
    position: match[3],
    normalized,
  };
}

export function isStagingLocation(location: string): boolean {
  return parseStagingLocation(location) !== null;
}

export function stagingZoneTitle(zone: StagingZone): string {
  return zone === "instage" ? INSTAGE_ZONE_LABEL : OUTSTAGE_ZONE_LABEL;
}

export function stagingMaxCapacity(zone: StagingZone): number {
  void zone;
  return STAGING_DOCK_COUNT * STAGING_MAX_PALLETS_PER_DOOR;
}

export function formatStagingDoorLabel(dockDoor: string): string {
  return `Door ${dockDoor}`;
}
