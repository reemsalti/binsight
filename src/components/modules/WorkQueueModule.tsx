import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  fetchCycleCountTasks,
  fetchStockHolds,
  fetchStockReports,
} from "../../services/wmsApi";
import { WarehouseHeatMap } from "../WarehouseHeatMap";
import type { StockReportFormValues } from "../StockReportForm";
import type { DemoPermission } from "../../mock-data/demoUser";
import type {
  BinDetails,
  CycleCountTask,
  Filters,
  LoadReferenceKind,
  LocationHistoryRecord,
  ProcessedResults,
  StockHoldRecord,
  StockOnHandRecord,
  StockReport,
  WorkQueueNavigateTarget,
} from "../../types";
import { isSeriousHold } from "../../utils/holdPriority";
import {
  ProductCardLines,
  resolveClientCode,
  type ProductCardLinesData,
} from "../ProductCardLines";
import { formatCycleCountVariance } from "../../utils/cycleCountVariance";
import {
  formatPickTriggerLine,
  isAwaitingCountApproval,
  isPickTriggeredOpenTask,
} from "../../utils/investigationCountWorkflow";
import { getStockReportStatusLabel } from "../../utils/stockReportStatus";
import {
  buildOutboundQueueEntries,
  buildPutawayQueueEntries,
  type StagingQueueEntry,
} from "../../utils/stagingQueue";
import { formatPltCount } from "../../utils/wmsLabels";

type Props = {
  filters: Filters;
  lastSynced: Date | null;
  onNavigate: (target: WorkQueueNavigateTarget) => void;
  results: ProcessedResults | null;
  stockLocationSet: Set<string>;
  stockRecords: StockOnHandRecord[];
  selectedLocation: string | null;
  onBinSelect: (locationCode: string) => void;
  binDetails: BinDetails | null;
  locationHistory: LocationHistoryRecord[];
  palletHistory: LocationHistoryRecord[];
  isBinDetailsLoading: boolean;
  isHistoryLoading: boolean;
  isPalletHistoryLoading: boolean;
  onCloseBinDetails: () => void;
  onLoadHistory: () => void;
  onSubmitReport: (values: StockReportFormValues) => Promise<void>;
  isSubmittingReport: boolean;
  reportSubmittedFor: string | null;
  permissions: DemoPermission[];
  blueprintFocusLocation: string | null;
  selectedLoadReference: { kind: LoadReferenceKind; reference: string } | null;
  onLoadReferenceSelect: (kind: LoadReferenceKind, reference: string) => void;
  onCloseLoadReference: () => void;
  onActivityLocationSelect: (locationCode: string) => void;
  onExpandPalletDetail: (locationCode: string) => void;
};

type QueueTone = "amber" | "red" | "slate" | "blue";

const QUEUE_TONE_DOT: Record<QueueTone, string> = {
  amber: "bg-amber-500",
  red: "bg-red-500",
  slate: "bg-slate-400",
  blue: "bg-blue-500",
};

const QUEUE_TONE_BORDER: Record<QueueTone, string> = {
  amber: "border-amber-200",
  red: "border-red-200",
  slate: "border-slate-200",
  blue: "border-blue-200",
};

const QUEUE_DESTINATION_LABEL: Record<WorkQueueNavigateTarget["kind"], string> = {
  report: "Stock reports",
  hold: "Holds",
  count: "Investigation counts",
  putaway: "Instage blueprint",
  outbound: "Outstage blueprint",
};

type QueueItem = {
  id: string;
  kind: WorkQueueNavigateTarget["kind"];
  entityId: string;
  locationCode: string;
  loadReferenceKind?: WorkQueueNavigateTarget["loadReferenceKind"];
  loadReference?: string;
  product: ProductCardLinesData;
  meta: string;
  tone: QueueTone;
  sortKey: number;
};

const PRIORITY_ORDER: Record<CycleCountTask["priority"], number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function stagingQueueItem(entry: StagingQueueEntry): QueueItem {
  const isPutaway = entry.kind === "putaway";
  return {
    id: entry.id,
    kind: entry.kind,
    entityId: entry.loadReference,
    locationCode: entry.locationCode,
    loadReferenceKind: entry.loadReferenceKind,
    loadReference: entry.loadReference,
    product: {
      clientCode: entry.clientCode,
      itemId: entry.leadItemId,
      productDescription: isPutaway
        ? `${formatPltCount(entry.palletCount)} awaiting putaway`
        : `${formatPltCount(entry.palletCount)} staged for load`,
      lotNumber: entry.lotNumber,
      palletId: entry.leadPalletId,
      locationCode: entry.locationCode,
    },
    meta: isPutaway
      ? `${entry.loadReference} · Door ${entry.dockDoor} · ${entry.totalQuantityEa.toLocaleString()} EA`
      : `${entry.loadReference} · Door ${entry.dockDoor} · ${entry.totalQuantityEa.toLocaleString()} EA staged`,
    tone: isPutaway ? "amber" : "blue",
    sortKey: isPutaway ? -2 : -1,
  };
}

function buildQueueItems(
  reports: StockReport[],
  holds: StockHoldRecord[],
  tasks: CycleCountTask[],
  stockRecords: StockOnHandRecord[],
): QueueItem[] {
  const items: QueueItem[] = [];

  for (const entry of buildPutawayQueueEntries(stockRecords)) {
    items.push(stagingQueueItem(entry));
  }

  for (const entry of buildOutboundQueueEntries(stockRecords)) {
    items.push(stagingQueueItem(entry));
  }

  for (const report of reports) {
    if (report.status === "Resolved") continue;
    items.push({
      id: `report-${report.reportId}`,
      kind: "report",
      entityId: report.reportId,
      locationCode: report.locationCode,
      product: {
        clientCode: resolveClientCode({
          clientCode: report.clientCode,
          clientName: report.suspectedClient,
          itemId: report.suspectedItemId,
        }),
        itemId: report.suspectedItemId,
        productDescription: report.productDescription,
        lotNumber: report.lotNumber,
        palletId: report.palletId,
        locationCode: report.locationCode,
      },
      meta: `${getStockReportStatusLabel(report.status)} · ${report.reportedBy} · ${report.reportId}`,
      tone: report.status === "Open" ? "red" : "amber",
      sortKey: report.status === "Open" ? 0 : 1,
    });
  }

  for (const hold of holds) {
    if (hold.holdStatus !== "Active" || !isSeriousHold(hold.holdCode)) continue;
    items.push({
      id: `hold-${hold.holdId}`,
      kind: "hold",
      entityId: hold.holdId,
      locationCode: hold.locationCode,
      product: {
        clientCode: hold.clientCode,
        itemId: hold.itemId,
        productDescription: hold.productDescription,
        lotNumber: hold.lotNumber,
        palletId: hold.palletId,
        locationCode: hold.locationCode,
      },
      meta: `${hold.holdCode} hold · ${hold.holdId}`,
      tone: "red",
      sortKey: 2,
    });
  }

  for (const task of tasks) {
    const isDiscrepancy = task.status === "Discrepancy";
    const isOpen = isPickTriggeredOpenTask(task);
    const needsApproval = isAwaitingCountApproval(task);
    if (!isDiscrepancy && !isOpen && !needsApproval) continue;

    const pickLine = formatPickTriggerLine(task);
    let meta: string;
    if (needsApproval) {
      meta = `Approve count · matches expected · ${task.taskId}`;
    } else if (isDiscrepancy) {
      meta = `${formatCycleCountVariance(task).label} · ${task.countedBy ? `Counted by ${task.countedBy}` : task.taskId}`;
    } else if (pickLine) {
      meta = pickLine;
    } else {
      meta = `Assigned ${task.assignedTo} · ${task.priority} priority`;
    }

    items.push({
      id: `count-${task.taskId}`,
      kind: "count",
      entityId: task.taskId,
      locationCode: task.locationCode,
      product: {
        clientCode: task.clientCode,
        itemId: task.itemId,
        productDescription: task.productDescription,
        lotNumber: task.lotNumber,
        palletId: task.palletId,
        locationCode: task.locationCode,
      },
      meta,
      tone: isDiscrepancy ? "amber" : needsApproval ? "blue" : "slate",
      sortKey: isDiscrepancy ? 3 : needsApproval ? 4 : 5 + PRIORITY_ORDER[task.priority],
    });
  }

  return items.sort((a, b) => a.sortKey - b.sortKey || a.locationCode.localeCompare(b.locationCode));
}

export function WorkQueueModule({
  filters,
  lastSynced,
  onNavigate,
  results,
  stockLocationSet,
  stockRecords,
  selectedLocation,
  onBinSelect,
  binDetails,
  locationHistory,
  palletHistory,
  isBinDetailsLoading,
  isHistoryLoading,
  isPalletHistoryLoading,
  onCloseBinDetails,
  onLoadHistory,
  onSubmitReport,
  isSubmittingReport,
  reportSubmittedFor,
  permissions,
  blueprintFocusLocation,
  selectedLoadReference,
  onLoadReferenceSelect,
  onCloseLoadReference,
  onActivityLocationSelect,
  onExpandPalletDetail,
}: Props) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const [reports, holds, tasks] = await Promise.all([
        fetchStockReports(filters),
        fetchStockHolds(filters),
        fetchCycleCountTasks(filters),
      ]);
      setItems(buildQueueItems(reports, holds, tasks, stockRecords));
    } finally {
      setIsLoading(false);
    }
  }, [filters, stockRecords]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue, lastSynced]);

  const sections = useMemo(() => {
    const putaway = items.filter((item) => item.kind === "putaway");
    const outbound = items.filter((item) => item.kind === "outbound");
    const reports = items.filter((item) => item.kind === "report");
    const holds = items.filter((item) => item.kind === "hold");
    const counts = items.filter((item) => item.kind === "count");
    return [
      { id: "putaway", title: "Awaiting putaway", items: putaway },
      { id: "outbound", title: "Staged for outbound", items: outbound },
      { id: "reports", title: "Stock reports", items: reports },
      { id: "holds", title: "Serious holds", items: holds },
      { id: "counts", title: "Investigation counts", items: counts },
    ].filter((section) => section.items.length > 0);
  }, [items]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    setExpandedSections((previous) => {
      const next = { ...previous };
      let changed = false;
      sections.forEach((section, index) => {
        if (next[section.id] === undefined) {
          next[section.id] = index === 0;
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }, [sections]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((previous) => ({
      ...previous,
      [sectionId]: !previous[sectionId],
    }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="shrink-0">
        <h2 className="type-heading">
          Work queue
        </h2>
        <p className="type-muted mt-1">
          Aisles {filters.aisleFrom}–{filters.aisleTo}. Select a row to open its
          module, or use the rack map to inspect a bin.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <div className="surface-card flex min-h-0 flex-1 flex-col overflow-hidden lg:max-w-[24rem] lg:flex-none xl:max-w-[26rem]">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <p className="type-muted">Loading queue…</p>
            ) : !items.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 type-text">
                No open putaway, outbound staging, reports, serious holds, or
                count tasks in this aisle range.
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map((section) => {
              const isExpanded = expandedSections[section.id] ?? false;
              const panelId = `work-queue-section-${section.id}`;

              return (
                <section
                  key={section.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-100"
                  >
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-slate-500 transition-transform ${
                        isExpanded ? "" : "-rotate-90"
                      }`}
                      aria-hidden
                    />
                    <span className="type-label min-w-0 flex-1 text-slate-600">
                      {section.title}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-slate-800">
                      {section.items.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <ul
                      id={panelId}
                      className="space-y-2 border-t border-slate-200 px-2 pb-2 pt-2"
                    >
                      {section.items.map((item) => (
                        <QueueRow
                          key={item.id}
                          item={item}
                          onOpen={() =>
                            onNavigate({
                              kind: item.kind,
                              entityId: item.entityId,
                              locationCode: item.locationCode,
                              loadReferenceKind: item.loadReferenceKind,
                              loadReference: item.loadReference,
                            })
                          }
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!results ? (
            <div className="surface-card flex min-h-0 flex-1 items-center justify-center p-8 text-center type-muted">
              Refresh WMS data to view the rack blueprint.
            </div>
          ) : (
            <WarehouseHeatMap
              results={results}
              filters={filters}
              stockLocationSet={stockLocationSet}
              stockRecords={stockRecords}
              selectedLocation={selectedLocation}
              onBinSelect={onBinSelect}
              focusLocation={blueprintFocusLocation ?? selectedLocation}
              variant="rail"
              selectedLoadReference={selectedLoadReference}
              onLoadReferenceSelect={onLoadReferenceSelect}
              onCloseLoadReference={onCloseLoadReference}
              binDetails={binDetails}
              locationHistory={locationHistory}
              palletHistory={palletHistory}
              isBinDetailsLoading={isBinDetailsLoading}
              isHistoryLoading={isHistoryLoading}
              isPalletHistoryLoading={isPalletHistoryLoading}
              onCloseBinDetails={onCloseBinDetails}
              onLoadHistory={onLoadHistory}
              onSubmitReport={onSubmitReport}
              isSubmittingReport={isSubmittingReport}
              reportSubmittedFor={reportSubmittedFor}
              permissions={permissions}
              onActivityLocationSelect={onActivityLocationSelect}
              onExpandPalletDetail={onExpandPalletDetail}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function QueueRow({ item, onOpen }: { item: QueueItem; onOpen: () => void }) {
  const destination = QUEUE_DESTINATION_LABEL[item.kind];

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`group w-full rounded-xl border bg-white p-2.5 text-left transition hover:border-slate-400 ${QUEUE_TONE_BORDER[item.tone]}`}
      >
        <div className="flex items-start gap-2">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${QUEUE_TONE_DOT[item.tone]}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <ProductCardLines data={item.product} />
            <p className="type-muted mt-1">{item.meta}</p>
            <p className="type-emphasis mt-1 group-hover:text-slate-900">
              Open in {destination}
            </p>
          </div>
          <ChevronRight
            size={16}
            className="mt-1 shrink-0 text-slate-400 group-hover:text-slate-800"
            aria-hidden
          />
        </div>
      </button>
    </li>
  );
}
