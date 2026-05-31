import type {
  EmptyLocationRow,
  Filters,
  ProcessedResults,
  StockBinRow,
} from "../types";
import { getAisle } from "./location";

export function processLocations(
  emptyLocations: EmptyLocationRow[],
  stockBins: StockBinRow[],
  filters: Filters,
): ProcessedResults {
  const occupiedSet = new Set(stockBins.map((row) => row.normalizedLocation));

  const emptyRowsInRange = emptyLocations.filter((row) => {
    const aisle = getAisle(row.normalizedLocation);
    if (aisle === null) return false;
    return aisle >= filters.aisleFrom && aisle <= filters.aisleTo;
  });

  const removedMatches = emptyRowsInRange.filter((row) =>
    occupiedSet.has(row.normalizedLocation),
  );
  const finalTrueEmpty = emptyRowsInRange.filter(
    (row) => !occupiedSet.has(row.normalizedLocation),
  );

  return {
    originalEmptyCount: emptyLocations.length,
    uniqueOccupiedCount: occupiedSet.size,
    removedMatches,
    finalTrueEmpty,
  };
}
