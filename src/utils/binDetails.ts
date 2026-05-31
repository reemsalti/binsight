import type {
  BinDetails,
  BinStatus,
  LocationHistoryRecord,
  ProcessedResults,
  StockOnHandRecord,
} from "../types";
import { buildFallbackStockRecord } from "../mock-data/generateMockWarehouseData";
import { parseAnyLocation } from "./location";
import { parseStagingLocation, stagingZoneTitle } from "./stagingLocations";

export const BIN_STATUS_LABELS: Record<BinStatus, string> = {
  empty: "Available",
  occupied: "Occupied",
};

/** Bin panel / API: stock wins; otherwise treated as available (no separate “no record” status). */
export function resolveBinStatus(
  locationCode: string,
  trueEmptySet: Set<string>,
  stockSet: Set<string>,
): BinStatus {
  if (stockSet.has(locationCode)) return "occupied";
  if (trueEmptySet.has(locationCode)) return "empty";
  return "empty";
}

export function isInWmsAvailableFeed(
  locationCode: string,
  trueEmptySet: Set<string>,
): boolean {
  return trueEmptySet.has(locationCode);
}

/** Rack blueprint: occupied = stock on hand; otherwise available (no separate unlisted color). */
export type BlueprintCellState = "available" | "occupied";

export function resolveBlueprintCellState(
  locationCode: string,
  _trueEmptySet: Set<string>,
  stockSet: Set<string>,
): BlueprintCellState {
  if (stockSet.has(locationCode)) return "occupied";
  return "available";
}

export function buildStockLocationSet(
  stockRecords: StockOnHandRecord[],
): Set<string> {
  return new Set(stockRecords.map((record) => record.binCode));
}

export function buildStockRecordMap(
  stockRecords: StockOnHandRecord[],
): Map<string, StockOnHandRecord> {
  return new Map(stockRecords.map((record) => [record.binCode, record]));
}

type BuildBinDetailsArgs = {
  locationCode: string;
  results: ProcessedResults | null;
  stockByLocation: Map<string, StockOnHandRecord>;
  stockLocationSet: Set<string>;
};

export function buildBinDetails({
  locationCode,
  results,
  stockByLocation,
  stockLocationSet,
}: BuildBinDetailsArgs): BinDetails | null {
  const parsed = parseAnyLocation(locationCode);
  if (!parsed) return null;

  const locationKey = parsed.normalized;

  const trueEmptySet = new Set(
    results?.finalTrueEmpty.map((row) => row.normalizedLocation) ?? [],
  );

  const status = resolveBinStatus(locationKey, trueEmptySet, stockLocationSet);
  const inWmsAvailableFeed = isInWmsAvailableFeed(locationKey, trueEmptySet);

  const stock =
    stockByLocation.get(locationKey) ??
    (stockLocationSet.has(locationKey)
      ? buildFallbackStockRecord(locationKey)
      : undefined);

  if (parsed.kind === "staging") {
    return {
      locationCode: locationKey,
      zone: parsed.zone,
      status,
      statusLabel: BIN_STATUS_LABELS[status],
      inWmsAvailableFeed,
      dockDoor: parsed.dockDoor,
      dockPosition: parsed.position,
      stagingWorkflowLabel:
        stock?.stagingWorkflowLabel ??
        (status === "empty"
          ? parsed.zone === "instage"
            ? "Open for inbound trailer"
            : "Open for outbound staging"
          : undefined),
      receiptReference: stock?.receiptReference,
      outboundOrderReference: stock?.outboundOrderReference,
      stock: status === "occupied" ? stock : undefined,
    };
  }

  return {
    locationCode: locationKey,
    zone: "rack",
    status,
    statusLabel: BIN_STATUS_LABELS[status],
    inWmsAvailableFeed,
    aisle: parsed.aisle,
    bay: parsed.bay,
    level: parsed.level,
    position: parsed.position,
    stock: status === "occupied" ? stock : undefined,
  };
}

export function stagingLocationTitle(locationCode: string): string | null {
  const parsed = parseStagingLocation(locationCode);
  if (!parsed) return null;
  return `${stagingZoneTitle(parsed.zone)} · Door ${parsed.dockDoor} · Pos ${parsed.position}`;
}

export function sortHistoryRecords(
  records: LocationHistoryRecord[],
): LocationHistoryRecord[] {
  return [...records].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}
