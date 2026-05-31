import Papa from "papaparse";
import { EmptyLocationRow } from "../types";
import { findColumn, normalizeLocation } from "./location";
export async function parseEmptyLocationsCsv(file: File): Promise<{ rows: EmptyLocationRow[]; locationColumn: string; }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: (results) => {
      const rows = results.data; const columns = results.meta.fields ?? [];
      const locationColumn = findColumn(columns, ["LOC_CODE", "LOCATION", "BIN CODE"], ["loc", "bin"]);
      if (!locationColumn) { reject(new Error("Could not find a location column. Expected LOC_CODE, Location, or Bin Code.")); return; }
      const parsedRows = rows
        .map((row) => {
          const locCode = normalizeLocation(row[locationColumn]);
          return { locCode, normalizedLocation: locCode, original: row };
        })
        .filter(
          (row) =>
            row.normalizedLocation &&
            !["NAN", "NONE"].includes(row.normalizedLocation),
        );
      resolve({ rows: parsedRows, locationColumn });
    }, error: (error) => reject(error) });
  });
}
