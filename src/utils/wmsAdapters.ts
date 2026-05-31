import { buildFallbackStockRecord } from "../mock-data/generateMockWarehouseData";
import type {
  EmptyLocationRow,
  StockBinRow,
  StockOnHandRecord,
  WmsEmptyLocationRecord,
} from "../types";
import { normalizeLocation } from "./location";

export function wmsEmptyToRows(
  records: WmsEmptyLocationRecord[],
): EmptyLocationRow[] {
  return records.map((record) => {
    const normalizedLocation = normalizeLocation(record.locationCode);
    return {
      locCode: normalizedLocation,
      normalizedLocation,
      original: {
        LOC_CODE: normalizedLocation,
        STATUS: record.status,
        FEED: record.feed,
      },
    };
  });
}

export function wmsStockToRows(records: StockOnHandRecord[]): StockBinRow[] {
  return records.map((record) => {
    const normalizedLocation = normalizeLocation(record.binCode);
    return {
      binCode: normalizedLocation,
      normalizedLocation,
      sheetName: "WMS-DEMO",
    };
  });
}

export function stockRecordsFromBinRows(
  rows: StockBinRow[],
): StockOnHandRecord[] {
  return rows.map((row, index) =>
    buildFallbackStockRecord(row.normalizedLocation, index),
  );
}
