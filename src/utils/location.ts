import type { ParsedLocation } from "../types";
import {
  normalizeStagingLocation,
  parseStagingLocation,
  type ParsedStagingLocation,
  type StagingZone,
} from "./stagingLocations";

export type WarehouseZone = "rack" | StagingZone;

export type { ParsedStagingLocation, StagingZone };

export const WAREHOUSE_AISLE_MIN = 601;
export const WAREHOUSE_AISLE_MAX = 622;
export const WAREHOUSE_BAY_COUNT = 38;
export const WAREHOUSE_LEVELS = ["A", "B", "C", "D", "E"] as const;
/** Rack display order: E is highest, A is floor level. */
export const WAREHOUSE_LEVELS_TOP_TO_BOTTOM = [
  "E",
  "D",
  "C",
  "B",
  "A",
] as const;
export const WAREHOUSE_POSITIONS = ["01", "02"] as const;

export function normalizeLocation(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  const staging = normalizeStagingLocation(raw);
  if (staging) return staging;

  const dashed = raw.match(/^(\d{3})-(\d{2})-([A-E])(\d{2})$/);
  if (dashed) return raw;

  const compact = raw.match(/^(\d{3})(\d{2})([A-E])(\d{2})$/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}${compact[4]}`;
  }

  return raw;
}

export function formatWarehouseLocation(
  aisle: number,
  bay: number,
  level: string,
  position: string,
): string {
  return `${aisle}-${String(bay).padStart(2, "0")}-${level}${position}`;
}

export function parseLocation(location: string): ParsedLocation | null {
  const normalized = normalizeLocation(location);
  const match = normalized.match(/^(\d{3})-(\d{2})-([A-E])(\d{2})$/);
  if (!match) return null;

  return {
    aisle: Number(match[1]),
    bay: match[2],
    level: match[3],
    position: match[4],
    normalized,
  };
}

export function getAisle(location: string): number | null {
  const parsed = parseLocation(location);
  if (parsed) return parsed.aisle;

  if (parseStagingLocation(location)) return null;

  const legacy = normalizeLocation(location).match(/^(\d{3})/);
  if (!legacy) return null;

  const aisle = Number(legacy[1]);
  return Number.isFinite(aisle) ? aisle : null;
}

export function parseAnyLocation(
  location: string,
):
  | ({ kind: "rack" } & ParsedLocation)
  | ({ kind: "staging" } & ParsedStagingLocation)
  | null {
  const normalized = normalizeLocation(location);
  const staging = parseStagingLocation(normalized);
  if (staging) return { kind: "staging", ...staging };

  const rack = parseLocation(normalized);
  if (rack) return { kind: "rack", ...rack };

  return null;
}

export function getWarehouseZone(location: string): WarehouseZone {
  const parsed = parseAnyLocation(location);
  if (!parsed) return "rack";
  return parsed.kind === "staging" ? parsed.zone : "rack";
}

export function findColumn(
  columns: string[],
  preferredNames: string[],
  fallbackWords: string[],
): string | null {
  const exact = columns.find((column) =>
    preferredNames.some(
      (name) => column.trim().toLowerCase() === name.trim().toLowerCase(),
    ),
  );
  if (exact) return exact;

  return (
    columns.find((column) =>
      fallbackWords.some((word) =>
        column.toLowerCase().includes(word.toLowerCase()),
      ),
    ) ?? null
  );
}
