import type { CycleCountTask } from "../types";

export function isPickTriggeredOpenTask(task: CycleCountTask): boolean {
  return (
    (task.status === "Not Started" || task.status === "In Progress") &&
    Boolean(task.pickOrderId)
  );
}

export function isAwaitingCountApproval(task: CycleCountTask): boolean {
  return (
    task.status === "Counted" &&
    task.discrepancyQty === 0 &&
    task.countedQty !== null
  );
}

export function formatPickTriggerLine(task: CycleCountTask): string | null {
  if (!task.pickOrderId) return null;
  const parts = [`Order ${task.pickOrderId}`];
  if (task.pickedBy) parts.unshift(`Picker ${task.pickedBy}`);
  if (task.pickedAt) {
    parts.push(
      `Picked ${new Date(task.pickedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    );
  }
  return parts.join(" · ");
}
