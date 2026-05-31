import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  FilterSummaryCard,
  matchesSummaryBuckets,
  toggleSetMember,
} from "../FilterSummaryCard";
import { DashboardSectionHeader } from "../DashboardSectionHeader";
import {
  ProductCardLines,
  resolveClientCode,
} from "../ProductCardLines";
import { ListSortAxes, STATUS_OPTIONS } from "../ListSortAxes";
import {
  StockReportForm,
  type StockReportFormValues,
} from "../StockReportForm";
import type { DemoPermission } from "../../mock-data/demoUser";
import { demoUser } from "../../mock-data/demoUser";
import type { Filters, StockReport, StockReportStatus } from "../../types";
import {
  createStockReport,
  fetchStockReports,
  updateStockReportStatus,
} from "../../services/wmsApi";
import { hasPermission } from "../../utils/permissions";
import {
  formatReportQuantityLine,
  getStockReportScenarioTitle,
  getStockReportStatusLabel,
  isUnresolvedReport,
} from "../../utils/stockReportStatus";
import {
  DEFAULT_STOCK_REPORT_SORT,
  sortStockReports,
  type SortDirection,
  type ThreeAxisSort,
} from "../../utils/listSort";
import {
  entityFocusDomId,
  entityFocusRingClass,
  useScrollToEntityFocus,
} from "../../utils/entityFocus";

type Props = {
  filters: Filters;
  permissions: DemoPermission[];
  focusEntityId?: string | null;
};

type SummaryBucket = "unresolved" | "investigation" | "resolved";

export function StockReportsModule({
  filters,
  permissions,
  focusEntityId = null,
}: Props) {
  const [reports, setReports] = useState<StockReport[]>([]);
  const [summaryBuckets, setSummaryBuckets] = useState<Set<SummaryBucket>>(
    () => new Set(),
  );
  const [showAllReports, setShowAllReports] = useState(false);
  const [sortAxes, setSortAxes] = useState<ThreeAxisSort>(DEFAULT_STOCK_REPORT_SORT);

  function setSortAxis(axis: keyof ThreeAxisSort, value: SortDirection) {
    setSortAxes((current) => ({ ...current, [axis]: value }));
  }
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isFiling, setIsFiling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canResolve = hasPermission(permissions, "request_adjustments");

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      setReports(await fetchStockReports(filters));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!focusEntityId) return;
    setShowAllReports(true);
    setSummaryBuckets(new Set());
  }, [focusEntityId]);

  useScrollToEntityFocus(focusEntityId, !isLoading);

  const summary = useMemo(() => {
    return {
      unresolved: reports.filter((report) => report.status === "Open").length,
      investigation: reports.filter(
        (report) => report.status === "Under Review",
      ).length,
      resolved: reports.filter((report) => report.status === "Resolved").length,
      total: reports.length,
    };
  }, [reports]);

  const visibleReports = useMemo(() => {
    let list = reports;

    if (!showAllReports) {
      if (summaryBuckets.size > 0) {
        list = list.filter((report) =>
          matchesSummaryBuckets(summaryBuckets, {
            unresolved: report.status === "Open",
            investigation: report.status === "Under Review",
            resolved: report.status === "Resolved",
          }),
        );
      } else {
        list = list.filter((report) => isUnresolvedReport(report.status));
      }
    }

    const sorted = sortStockReports(list, sortAxes);
    if (
      focusEntityId &&
      !sorted.some((report) => report.reportId === focusEntityId)
    ) {
      const focused = reports.find((report) => report.reportId === focusEntityId);
      if (focused) return [focused, ...sorted];
    }
    return sorted;
  }, [reports, showAllReports, summaryBuckets, sortAxes, focusEntityId]);

  function toggleBucket(bucket: SummaryBucket) {
    setShowAllReports(false);
    setSummaryBuckets((current) => toggleSetMember(current, bucket));
  }

  function toggleShowAll() {
    setShowAllReports((current) => {
      const next = !current;
      if (next) setSummaryBuckets(new Set());
      return next;
    });
  }

  async function handleFile(values: StockReportFormValues) {
    setIsSubmitting(true);
    try {
      await createStockReport({ ...values, reportedBy: demoUser.name });
      setIsFiling(false);
      await loadReports();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatus(reportId: string, status: StockReportStatus) {
    setUpdatingId(reportId);
    try {
      await updateStockReportStatus(reportId, status, demoUser.name);
      await loadReports();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="module-panel p-5">
      <DashboardSectionHeader
        title="Stock Reports"
        description="Floor reports of misplaced or unexpected stock, queued for Inventory Control to review and resolve."
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSummaryCard
          label="Unresolved"
          value={summary.unresolved}
          tone="red"
          isSelected={summaryBuckets.has("unresolved")}
          onClick={() => toggleBucket("unresolved")}
        />
        <FilterSummaryCard
          label="Under investigation"
          value={summary.investigation}
          tone="blue"
          isSelected={summaryBuckets.has("investigation")}
          onClick={() => toggleBucket("investigation")}
        />
        <FilterSummaryCard
          label="Resolved"
          value={summary.resolved}
          tone="emerald"
          isSelected={summaryBuckets.has("resolved")}
          onClick={() => toggleBucket("resolved")}
        />
        <FilterSummaryCard
          label="Total"
          value={summary.total}
          isSelected={showAllReports}
          onClick={toggleShowAll}
        />
      </div>
      <p className="mt-2 type-muted">
        Select one or more summaries to filter (combined). With none selected,
        unresolved reports show. Total shows every report in range.
      </p>

      <div className="mt-4 space-y-3">
        <ListSortAxes
          date={sortAxes.date}
          priority={sortAxes.priority}
          location={sortAxes.location}
          priorityLabel="Status"
          priorityOptions={STATUS_OPTIONS}
          onDateChange={(value) => setSortAxis("date", value)}
          onPriorityChange={(value) => setSortAxis("priority", value)}
          onLocationChange={(value) => setSortAxis("location", value)}
        />
        {canResolve && !isFiling && (
          <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsFiling(true)}
            className="type-btn gap-2 bg-slate-900 text-white hover:bg-slate-700"
          >
            <Plus size={16} />
            File a report
          </button>
          </div>
        )}
      </div>

      {isFiling && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 type-label">
            New stock report
          </h3>
          <StockReportForm
            filters={filters}
            isSubmitting={isSubmitting}
            onSubmit={(values) => void handleFile(values)}
            onCancel={() => setIsFiling(false)}
          />
        </section>
      )}

      {isLoading ? (
        <p className="mt-5 type-muted">Loading stock reports…</p>
      ) : !visibleReports.length ? (
        <p className="mt-5 type-muted">
          No stock reports match the selected summary filter.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {visibleReports.map((report) => (
            <ReportCard
              key={report.reportId}
              report={report}
              canResolve={canResolve}
              isFocused={focusEntityId === report.reportId}
              isUpdating={updatingId === report.reportId}
              onStatus={handleStatus}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ReportCard({
  report,
  canResolve,
  isFocused,
  isUpdating,
  onStatus,
}: {
  report: StockReport;
  canResolve: boolean;
  isFocused: boolean;
  isUpdating: boolean;
  onStatus: (reportId: string, status: StockReportStatus) => void;
}) {
  return (
    <div
      id={entityFocusDomId(report.reportId)}
      className={`rounded-xl border border-slate-200 bg-slate-50 p-3 ${entityFocusRingClass(isFocused)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <p className="type-label">
            Reported by
          </p>
          <p className="type-emphasis">{report.reportedBy}</p>
          <p className="mt-0.5 type-muted">
            {new Date(report.reportedAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="type-label">
            {report.reportId} · {getStockReportScenarioTitle(report.reportType)}
          </p>
          <ProductCardLines
            className="mt-1"
            data={{
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
            }}
          />
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 type-muted">
            {(() => {
              const qty = formatReportQuantityLine(report);
              return qty ? <span>{qty}</span> : null;
            })()}
            {report.wmsBinCode && (
              <span className="font-mono">WMS bin {report.wmsBinCode}</span>
            )}
          </div>
        </div>

        {report.note.trim() ? (
          <div className="min-w-0 sm:max-w-[42%] sm:border-l sm:border-slate-200 sm:pl-3">
            <p className="type-label">
              Comment
            </p>
            <p className="mt-0.5 whitespace-pre-line text-xs leading-snug text-slate-800">
              {report.note}
            </p>
          </div>
        ) : null}
      </div>

      {report.status === "Resolved" && report.resolvedBy && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
          <p className="type-emphasis text-emerald-900">
            Resolved by {report.resolvedBy}
            {report.resolvedAt
              ? ` · ${new Date(report.resolvedAt).toLocaleString()}`
              : ""}
          </p>
          {report.resolutionNote && (
            <p className="mt-1 text-xs text-emerald-800">
              {report.resolutionNote}
            </p>
          )}
        </div>
      )}

      {canResolve && report.status !== "Resolved" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {report.status === "Open" && (
            <ActionButton
              label="Start investigation"
              disabled={isUpdating}
              onClick={() => onStatus(report.reportId, "Under Review")}
            />
          )}
          <ActionButton
            label="Mark resolved"
            disabled={isUpdating}
            onClick={() => onStatus(report.reportId, "Resolved")}
          />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: StockReportStatus }) {
  const toneClass =
    status === "Open"
      ? "border-red-300 bg-red-100 text-red-900"
      : status === "Under Review"
        ? "border-blue-300 bg-blue-100 text-blue-900"
        : "border-emerald-300 bg-emerald-100 text-emerald-900";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 type-badge ${toneClass}`}
    >
      {getStockReportStatusLabel(status)}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 type-emphasis hover:bg-slate-100 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
