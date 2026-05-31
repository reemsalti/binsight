import Papa from "papaparse";
import { EmptyLocationRow } from "../types";
export function downloadRowsAsCsv(rows: EmptyLocationRow[], filename: string): void {
  if (!rows.length) { alert("No rows to download."); return; }
  const csv = Papa.unparse(rows.map((row) => row.original));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export function downloadVerificationCheckSheet(
  rows: EmptyLocationRow[],
  filename: string,
): void {
  if (!rows.length) {
    alert("No locations to verify.");
    return;
  }
  const sheet = rows.map((row) => ({
    Location: row.normalizedLocation,
    "System Status": "Available",
    "Physically Occupied? (Y/N)": "",
    "Item / PLT found": "",
    "Checked By": "",
    Notes: "",
  }));
  const csv = Papa.unparse(sheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
