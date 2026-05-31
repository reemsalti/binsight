import type { BinStatus } from "../types";
import type { StockReportType } from "../types";

export type StockReportScenarioConfig = {
  type: StockReportType;
  title: string;
  description: string;
  locationLabel: string;
  locationPlaceholder: string;
  noteLabel: string;
  notePlaceholder: string;
  showQuantity: boolean;
  quantityRequired: boolean;
  encourageProductId: boolean;
};

export const STOCK_REPORT_SCENARIOS: StockReportScenarioConfig[] = [
  {
    type: "Stock in empty location",
    title: "Product in empty location",
    description:
      "WMS shows this bin as available, but you found stock physically present.",
    locationLabel: "Location where stock was found",
    locationPlaceholder: "e.g. 604-08-A01",
    noteLabel: "What did you see?",
    notePlaceholder:
      "Describe the product, labeling, and how much is in the slot.",
    showQuantity: true,
    quantityRequired: false,
    encourageProductId: false,
  },
  {
    type: "Wrong item in location",
    title: "Wrong or unexpected product",
    description:
      "The product in this slot does not match what the system or slot profile expects.",
    locationLabel: "Location of the issue",
    locationPlaceholder: "e.g. 618-22-B01",
    noteLabel: "What did you see?",
    notePlaceholder:
      "What product is physically here vs what should be here?",
    showQuantity: true,
    quantityRequired: false,
    encourageProductId: true,
  },
  {
    type: "Misplaced pallet",
    title: "PLT in wrong location",
    description:
      "A PLT or LPN is physically here but belongs elsewhere (or label does not match slot).",
    locationLabel: "Location where PLT was found",
    locationPlaceholder: "e.g. 611-15-C02",
    noteLabel: "What did you see?",
    notePlaceholder:
      "Travel card, aisle markers, or other clues about where it belongs.",
    showQuantity: true,
    quantityRequired: false,
    encourageProductId: true,
  },
  {
    type: "Damaged product found",
    title: "Damaged or quality issue",
    description:
      "Product damage, leakage, or condition requires QA or inventory follow-up.",
    locationLabel: "Location where damage was found",
    locationPlaceholder: "e.g. 607-03-A02",
    noteLabel: "Describe the damage",
    notePlaceholder:
      "Type of damage, how many cases affected, and any safety concerns.",
    showQuantity: true,
    quantityRequired: true,
    encourageProductId: true,
  },
  {
    type: "Expected stock not found",
    title: "Expected stock not found",
    description:
      "System or paperwork expects inventory, but the location is empty or cannot be confirmed.",
    locationLabel: "Expected location (per WMS or pick)",
    locationPlaceholder: "e.g. 602-14-B01",
    noteLabel: "What did you observe?",
    notePlaceholder:
      "Empty location, different product, partial quantity, or label missing.",
    showQuantity: true,
    quantityRequired: false,
    encourageProductId: true,
  },
  {
    type: "Other",
    title: "Other inventory issue",
    description:
      "Any other floor observation that Inventory Control should review.",
    locationLabel: "Location related to the issue",
    locationPlaceholder: "e.g. 601-01-A01",
    noteLabel: "Details",
    notePlaceholder: "Describe the situation clearly for follow-up.",
    showQuantity: false,
    quantityRequired: false,
    encourageProductId: false,
  },
];

export function getScenarioConfig(
  type: StockReportType,
): StockReportScenarioConfig {
  return (
    STOCK_REPORT_SCENARIOS.find((scenario) => scenario.type === type) ??
    STOCK_REPORT_SCENARIOS[STOCK_REPORT_SCENARIOS.length - 1]
  );
}

export function defaultReportTypeForBin(
  status?: BinStatus,
  statusLabel?: string,
): StockReportType {
  if (status === "empty" || statusLabel === "Available") {
    return "Stock in empty location";
  }
  if (status === "occupied" || statusLabel === "Occupied") {
    return "Wrong item in location";
  }
  return "Other";
}
