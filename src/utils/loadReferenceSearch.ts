import type { LoadReferenceKind, StockOnHandRecord } from "../types";

export type LoadReferenceSearchResult = {
  kind: LoadReferenceKind;
  reference: string;
  clientCode: string;
  clientName: string;
  palletCount: number;
  sampleLocation: string;
  matchField: "receiptReference" | "outboundOrderReference";
};

export function searchLoadReferences(
  query: string,
  stockRecords: StockOnHandRecord[],
): LoadReferenceSearchResult[] {
  const normalizedQuery = query.trim().toUpperCase();
  if (!normalizedQuery) return [];

  const receiptMatches = new Map<string, StockOnHandRecord[]>();
  const orderMatches = new Map<string, StockOnHandRecord[]>();

  for (const record of stockRecords) {
    if (
      record.receiptReference &&
      record.receiptReference.toUpperCase().includes(normalizedQuery)
    ) {
      const list = receiptMatches.get(record.receiptReference) ?? [];
      list.push(record);
      receiptMatches.set(record.receiptReference, list);
    }
    if (
      record.outboundOrderReference &&
      record.outboundOrderReference.toUpperCase().includes(normalizedQuery)
    ) {
      const list = orderMatches.get(record.outboundOrderReference) ?? [];
      list.push(record);
      orderMatches.set(record.outboundOrderReference, list);
    }
  }

  const results: LoadReferenceSearchResult[] = [];

  for (const [reference, records] of receiptMatches) {
    results.push({
      kind: "receipt",
      reference,
      clientCode: records[0].clientCode,
      clientName: records[0].clientName,
      palletCount: records.length,
      sampleLocation: records[0].binCode,
      matchField: "receiptReference",
    });
  }

  for (const [reference, records] of orderMatches) {
    results.push({
      kind: "order",
      reference,
      clientCode: records[0].clientCode,
      clientName: records[0].clientName,
      palletCount: records.length,
      sampleLocation: records[0].binCode,
      matchField: "outboundOrderReference",
    });
  }

  return results.sort((left, right) =>
    left.reference.localeCompare(right.reference),
  );
}
