import * as XLSX from "xlsx";
import { StockBinRow } from "../types";
import { findColumn, normalizeLocation } from "./location";
function sheetToRowsWithDetectedHeader(workbook: XLSX.WorkBook, sheetName: string): StockBinRow[] {
  const worksheet = workbook.Sheets[sheetName];
  for (const headerIndex of [1, 0, 2, 3]) {
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "", range: headerIndex });
    if (!rows.length) continue;
    const columns = Object.keys(rows[0]);
    const binColumn = findColumn(columns, ["Bin Code", "LOC_CODE", "Location"], ["bin", "loc"]);
    if (!binColumn) continue;
    return rows.map((row) => { const binCode = normalizeLocation(row[binColumn]); return { binCode, normalizedLocation: binCode, sheetName }; }).filter((row) => row.normalizedLocation && !["NAN", "NONE"].includes(row.normalizedLocation));
  }
  return [];
}
export async function parseStockWorkbook(file: File): Promise<{ rows: StockBinRow[]; usedSheets: string[]; }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const allRows: StockBinRow[] = []; const usedSheets: string[] = [];
  workbook.SheetNames.forEach((sheetName) => { const rows = sheetToRowsWithDetectedHeader(workbook, sheetName); if (rows.length) { allRows.push(...rows); usedSheets.push(sheetName); } });
  if (!allRows.length) throw new Error("No Bin Code/location columns were found in the stock workbook.");
  return { rows: allRows, usedSheets };
}
