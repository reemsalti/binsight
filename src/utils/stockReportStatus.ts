import type { StockReport, StockReportStatus } from "../types";

export function getStockReportStatusLabel(status: StockReportStatus): string {
  switch (status) {
    case "Open":
      return "Unresolved";
    case "Under Review":
      return "Under investigation";
    case "Resolved":
      return "Resolved";
  }
}

export function isUnresolvedReport(status: StockReportStatus): boolean {
  return status !== "Resolved";
}

export function formatReportQuantityLine(
  report: Pick<
    StockReport,
    "reportQuantityScope" | "reportedQuantity" | "reportedQuantityUom"
  >,
): string | null {
  if (!report.reportQuantityScope) return null;
  if (report.reportQuantityScope === "full") {
    return "Full PLT / all in location";
  }
  if (report.reportedQuantity == null) return "Partial quantity";
  const uom = report.reportedQuantityUom ?? "CASE";
  return `Partial · ${report.reportedQuantity} ${uom}`;
}

export function getStockReportScenarioTitle(type: StockReport["reportType"]): string {
  const titles: Record<StockReport["reportType"], string> = {
    "Stock in empty location": "Product in empty location",
    "Misplaced pallet": "PLT in wrong location",
    "Wrong item in location": "Wrong or unexpected product",
    "Damaged product found": "Damaged or quality issue",
    "Expected stock not found": "Expected stock not found",
    Other: "Other inventory issue",
  };
  return titles[type] ?? type;
}
