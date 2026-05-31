import type { HoldCode } from "../types";

export const SERIOUS_HOLD_CODES: HoldCode[] = [
  "RECALL",
  "EXP",
  "DAMAGED",
  "QA",
];

export function isSeriousHold(code: HoldCode): boolean {
  return SERIOUS_HOLD_CODES.includes(code);
}
