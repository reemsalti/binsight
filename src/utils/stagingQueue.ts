import type { LoadReferenceKind, StockOnHandRecord } from "../types";
import { parseStagingLocation } from "./stagingLocations";

export type StagingQueueEntry = {
  id: string;
  kind: "putaway" | "outbound";
  loadReferenceKind: LoadReferenceKind;
  loadReference: string;
  locationCode: string;
  clientCode: string;
  clientName: string;
  dockDoor: string;
  palletCount: number;
  totalQuantityEa: number;
  leadProductDescription: string;
  leadPalletId: string;
  leadItemId: string;
  lotNumber: string;
};

function groupStagingLoads(
  stockRecords: StockOnHandRecord[],
  zone: "instage" | "outstage",
): StagingQueueEntry[] {
  const prefix = zone === "instage" ? "IN-" : "OUT-";
  const referenceField =
    zone === "instage" ? "receiptReference" : "outboundOrderReference";
  const byReference = new Map<string, StockOnHandRecord[]>();

  for (const record of stockRecords) {
    if (!record.binCode.startsWith(prefix)) continue;
    const reference = record[referenceField];
    if (!reference) continue;
    const list = byReference.get(reference) ?? [];
    list.push(record);
    byReference.set(reference, list);
  }

  const entries: StagingQueueEntry[] = [];

  for (const [loadReference, records] of byReference) {
    const sorted = [...records].sort((left, right) =>
      left.binCode.localeCompare(right.binCode),
    );
    const lead = sorted[0];
    const parsed = parseStagingLocation(lead.binCode);

    entries.push({
      id: `${zone}-${loadReference}`,
      kind: zone === "instage" ? "putaway" : "outbound",
      loadReferenceKind: zone === "instage" ? "receipt" : "order",
      loadReference,
      locationCode: lead.binCode,
      clientCode: lead.clientCode,
      clientName: lead.clientName,
      dockDoor: parsed?.dockDoor ?? "—",
      palletCount: sorted.length,
      totalQuantityEa: sorted.reduce(
        (total, record) => total + record.quantityOnHand,
        0,
      ),
      leadProductDescription: lead.productDescription,
      leadPalletId: lead.palletId,
      leadItemId: lead.itemId,
      lotNumber: lead.lotNumber,
    });
  }

  return entries.sort((left, right) =>
    left.loadReference.localeCompare(right.loadReference),
  );
}

export function buildPutawayQueueEntries(
  stockRecords: StockOnHandRecord[],
): StagingQueueEntry[] {
  return groupStagingLoads(stockRecords, "instage");
}

export function buildOutboundQueueEntries(
  stockRecords: StockOnHandRecord[],
): StagingQueueEntry[] {
  return groupStagingLoads(stockRecords, "outstage");
}
