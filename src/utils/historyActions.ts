export type HistoryActionTone = "emerald" | "blue" | "slate" | "amber";

const ACTION_TONE_CLASSES: Record<HistoryActionTone, string> = {
  emerald: "border-emerald-200 bg-emerald-100 text-emerald-800",
  blue: "border-blue-200 bg-blue-100 text-blue-800",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  amber: "border-amber-200 bg-amber-100 text-amber-900",
};

const ACTION_DOT_CLASSES: Record<HistoryActionTone, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  slate: "bg-slate-400",
  amber: "bg-amber-500",
};

export function classifyHistoryAction(action: string): HistoryActionTone {
  const value = action.toLowerCase();
  if (value.includes("receiv") || value.includes("replenish")) return "emerald";
  if (value.includes("mov") || value.includes("reloc")) return "blue";
  if (value.includes("adjust")) return "amber";
  return "slate";
}

export function historyActionBadgeClass(action: string): string {
  return ACTION_TONE_CLASSES[classifyHistoryAction(action)];
}

export function historyActionDotClass(action: string): string {
  return ACTION_DOT_CLASSES[classifyHistoryAction(action)];
}
