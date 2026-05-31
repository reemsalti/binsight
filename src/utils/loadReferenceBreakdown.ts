import type {
  LoadReferenceBreakdown,
  LoadReferenceKind,
  StockOnHandRecord,
} from "../types";

export function buildLoadReferenceBreakdown(
  kind: LoadReferenceKind,
  reference: string,
  stockRecords: StockOnHandRecord[],
): LoadReferenceBreakdown | null {
  const field =
    kind === "receipt" ? "receiptReference" : "outboundOrderReference";
  const lines = stockRecords
    .filter((record) => record[field] === reference)
    .sort(
      (left, right) =>
        left.binCode.localeCompare(right.binCode) ||
        left.palletId.localeCompare(right.palletId),
    );

  if (!lines.length) return null;

  const lead = lines[0];

  return {
    kind,
    reference,
    clientCode: lead.clientCode,
    clientName: lead.clientName,
    palletCount: lines.length,
    totalQuantityEa: lines.reduce(
      (total, record) => total + record.quantityOnHand,
      0,
    ),
    lines: lines.map((record) => ({
      locationCode: record.binCode,
      palletId: record.palletId,
      itemId: record.itemId,
      productDescription: record.productDescription,
      lotNumber: record.lotNumber,
      quantityOnHand: record.quantityOnHand,
      packageDetails: record.packageDetails,
      clientCode: record.clientCode,
    })),
  };
}
