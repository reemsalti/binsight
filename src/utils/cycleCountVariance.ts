import type {
  CycleCountDiscrepancyOutcome,
  CycleCountResolutionType,
} from "../types";

type VarianceInput = {
  expectedQty: number;
  countedQty: number | null;
  discrepancyQty: number | null;
};

export function formatCycleCountVariance(
  task: VarianceInput,
): { label: string; detail?: string; tone: "match" | "over" | "short" | "none" } {
  if (task.countedQty === null || task.discrepancyQty === null) {
    return { label: "Variance —", tone: "none" };
  }

  if (task.discrepancyQty === 0) {
    return { label: "Matches expected", tone: "match" };
  }

  const units = Math.abs(task.discrepancyQty);
  const detail = `Counted ${task.countedQty} EA · expected ${task.expectedQty} EA`;

  if (task.discrepancyQty > 0) {
    return { label: `Over by ${units} EA`, detail, tone: "over" };
  }

  return { label: `Short by ${units} EA`, detail, tone: "short" };
}

export function cycleCountVarianceNote(
  expectedQty: number,
  countedQty: number,
): string {
  const discrepancyQty = countedQty - expectedQty;
  if (discrepancyQty === 0) {
    return `Count matches expected (${expectedQty} EA).`;
  }
  if (discrepancyQty > 0) {
    return `Over by ${discrepancyQty} EA — counted ${countedQty}, expected ${expectedQty}.`;
  }
  return `Short by ${Math.abs(discrepancyQty)} EA — counted ${countedQty}, expected ${expectedQty}.`;
}

export const CONFIRM_RESOLUTION_OPTIONS: Array<{
  value: CycleCountResolutionType;
  label: string;
}> = [
  { value: "submit_for_investigation", label: "Submit for investigation" },
  { value: "request_adjustment", label: "Request inventory adjustment" },
  { value: "other", label: "Other" },
];

export const DISMISS_RESOLUTION_OPTIONS: Array<{
  value: CycleCountResolutionType;
  label: string;
}> = [
  { value: "counting_error", label: "Counting error — no adjustment" },
  { value: "recount_matches_expected", label: "Recount matches expected qty" },
  { value: "other", label: "Other" },
];

export function resolutionTypeLabel(type: CycleCountResolutionType): string {
  const option = [...CONFIRM_RESOLUTION_OPTIONS, ...DISMISS_RESOLUTION_OPTIONS].find(
    (entry) => entry.value === type,
  );
  return option?.label ?? type;
}

export function discrepancyOutcomeLabel(
  outcome: CycleCountDiscrepancyOutcome,
): string {
  return outcome === "confirmed" ? "Discrepancy confirmed" : "Discrepancy deleted";
}

/** Signed EA: positive = over, negative = short. */
export function formatSignedVarianceEa(signedEa: number): string {
  if (signedEa > 0) return `Over by ${signedEa} EA`;
  if (signedEa < 0) return `Short by ${Math.abs(signedEa)} EA`;
  return "No variance (0 EA)";
}

export function parseSignedVarianceInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}
