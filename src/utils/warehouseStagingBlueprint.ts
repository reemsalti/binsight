import type { StockOnHandRecord } from "../types";
import {
  STAGING_DOCK_COUNT,
  STAGING_MAX_PALLETS_PER_DOOR,
  parseStagingLocation,
  type StagingZone,
} from "./stagingLocations";

export type StagingDockPallet = {
  location: string;
  palletId: string;
  productDescription: string;
};

export type StagingDockBlueprint = {
  dockDoor: string;
  dockLabel: string;
  clientCode: string | null;
  clientName: string | null;
  loadReference: string | null;
  maxPallets: number;
  pallets: StagingDockPallet[];
};

export type StagingZoneBlueprint = {
  zone: StagingZone;
  title: string;
  docks: StagingDockBlueprint[];
};

function zonePrefix(zone: StagingZone): string {
  return zone === "instage" ? "IN-" : "OUT-";
}

export function buildStagingZoneBlueprint(
  zone: StagingZone,
  stockRecords: StockOnHandRecord[],
): StagingZoneBlueprint {
  const prefix = zonePrefix(zone);
  const byDoor = new Map<string, StockOnHandRecord[]>();

  for (const record of stockRecords) {
    if (!record.binCode.startsWith(prefix)) continue;
    const parsed = parseStagingLocation(record.binCode);
    if (!parsed) continue;
    const list = byDoor.get(parsed.dockDoor) ?? [];
    list.push(record);
    byDoor.set(parsed.dockDoor, list);
  }

  const docks: StagingDockBlueprint[] = [];

  for (let dock = 1; dock <= STAGING_DOCK_COUNT; dock += 1) {
    const dockDoor = String(dock).padStart(2, "0");
    const doorStock = (byDoor.get(dockDoor) ?? []).sort(
      (left, right) =>
        Number(parseStagingLocation(left.binCode)!.position) -
        Number(parseStagingLocation(right.binCode)!.position),
    );
    const lead = doorStock[0];

    docks.push({
      dockDoor,
      dockLabel: `Door ${dockDoor}`,
      clientCode: lead?.clientCode ?? null,
      clientName: lead?.clientName ?? null,
      loadReference:
        zone === "instage"
          ? lead?.receiptReference ?? null
          : lead?.outboundOrderReference ?? null,
      maxPallets: STAGING_MAX_PALLETS_PER_DOOR,
      pallets: doorStock.map((record) => ({
        location: record.binCode,
        palletId: record.palletId,
        productDescription: record.productDescription,
      })),
    });
  }

  return {
    zone,
    title: zone === "instage" ? "Receiving · instage" : "Shipping · outstage",
    docks,
  };
}

export function buildInstageBlueprint(
  stockRecords: StockOnHandRecord[],
): StagingZoneBlueprint {
  return buildStagingZoneBlueprint("instage", stockRecords);
}

export function buildOutstageBlueprint(
  stockRecords: StockOnHandRecord[],
): StagingZoneBlueprint {
  return buildStagingZoneBlueprint("outstage", stockRecords);
}

export function countStagingOccupied(
  zone: StagingZone,
  stockRecords: StockOnHandRecord[],
): number {
  const prefix = zonePrefix(zone);
  return stockRecords.filter((record) => record.binCode.startsWith(prefix)).length;
}

export function countStagingActiveDoors(
  zone: StagingZone,
  stockRecords: StockOnHandRecord[],
): number {
  return buildStagingZoneBlueprint(zone, stockRecords).docks.filter(
    (dock) => dock.pallets.length > 0,
  ).length;
}

export function countStagingRemainingCapacity(
  zone: StagingZone,
  stockRecords: StockOnHandRecord[],
): number {
  return (
    STAGING_DOCK_COUNT * STAGING_MAX_PALLETS_PER_DOOR -
    countStagingOccupied(zone, stockRecords)
  );
}
