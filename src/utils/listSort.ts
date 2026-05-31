import type {
  CycleCountTask,
  StockHoldRecord,
  StockReport,
  StockReportStatus,
} from "../types";

export type SortDirection = "off" | "asc" | "desc";

export type ThreeAxisSort = {
  date: SortDirection;
  priority: SortDirection;
  location: SortDirection;
};

export const DEFAULT_CYCLE_COUNT_SORT: ThreeAxisSort = {
  date: "asc",
  priority: "off",
  location: "off",
};

export const DEFAULT_STOCK_REPORT_SORT: ThreeAxisSort = {
  date: "desc",
  priority: "off",
  location: "off",
};

export const DEFAULT_STOCK_HOLD_SORT: ThreeAxisSort = {
  date: "desc",
  priority: "off",
  location: "off",
};

export type TaskPriority = CycleCountTask["priority"];

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const REPORT_STATUS_RANK: Record<StockReportStatus, number> = {
  Open: 0,
  "Under Review": 1,
  Resolved: 2,
};

export function parseSortableDate(value: string): number {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

export function compareDateAsc(a: string, b: string): number {
  return parseSortableDate(a) - parseSortableDate(b);
}

export function compareDateDesc(a: string, b: string): number {
  return compareDateAsc(b, a);
}

export function comparePriorityAsc(a: TaskPriority, b: TaskPriority): number {
  return PRIORITY_RANK[b] - PRIORITY_RANK[a];
}

export function comparePriorityDesc(a: TaskPriority, b: TaskPriority): number {
  return PRIORITY_RANK[a] - PRIORITY_RANK[b];
}

function applyDirection(
  direction: SortDirection,
  compareAsc: (a: string, b: string) => number,
  a: string,
  b: string,
): number | null {
  if (direction === "off") return null;
  const base = compareAsc(a, b);
  return direction === "asc" ? base : -base;
}

function applyNumericDirection(
  direction: SortDirection,
  a: number,
  b: number,
): number | null {
  if (direction === "off") return null;
  const base = a - b;
  return direction === "asc" ? base : -base;
}

function chainCompare(...parts: Array<number | null>): number {
  for (const part of parts) {
    if (part !== null && part !== 0) return part;
  }
  return 0;
}

export function sortCycleCountTasks(
  tasks: CycleCountTask[],
  axes: ThreeAxisSort,
): CycleCountTask[] {
  return [...tasks].sort((a, b) => {
    const result = chainCompare(
      applyDirection(axes.date, compareDateAsc, a.dueDate, b.dueDate),
      axes.priority === "off"
        ? null
        : axes.priority === "asc"
          ? comparePriorityAsc(a.priority, b.priority)
          : comparePriorityDesc(a.priority, b.priority),
      applyDirection(axes.location, (x, y) => x.localeCompare(y), a.locationCode, b.locationCode),
    );
    return result || a.taskId.localeCompare(b.taskId);
  });
}

export function sortStockReports(
  reports: StockReport[],
  axes: ThreeAxisSort,
): StockReport[] {
  return [...reports].sort((a, b) => {
    const result = chainCompare(
      applyDirection(axes.date, compareDateAsc, a.reportedAt, b.reportedAt),
      axes.priority === "off"
        ? null
        : axes.priority === "asc"
          ? REPORT_STATUS_RANK[a.status] - REPORT_STATUS_RANK[b.status]
          : REPORT_STATUS_RANK[b.status] - REPORT_STATUS_RANK[a.status],
      applyDirection(axes.location, (x, y) => x.localeCompare(y), a.locationCode, b.locationCode),
    );
    return result || a.reportId.localeCompare(b.reportId);
  });
}

export function sortStockHolds(
  holds: StockHoldRecord[],
  axes: ThreeAxisSort,
): StockHoldRecord[] {
  return [...holds].sort((a, b) => {
    const result = chainCompare(
      applyDirection(axes.date, compareDateAsc, a.holdDate, b.holdDate),
      applyNumericDirection(axes.priority, a.quantityOnHold, b.quantityOnHold),
      applyDirection(axes.location, (x, y) => x.localeCompare(y), a.locationCode, b.locationCode),
    );
    return result || a.holdId.localeCompare(b.holdId);
  });
}
