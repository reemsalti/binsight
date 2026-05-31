import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilterSummaryCard,
  matchesSummaryBuckets,
  toggleSetMember,
} from "../FilterSummaryCard";
import { DashboardSectionHeader } from "../DashboardSectionHeader";
import { ProductCardLines } from "../ProductCardLines";
import { ListSortAxes, QUANTITY_OPTIONS } from "../ListSortAxes";
import type { Filters, HoldCode, StockHoldRecord } from "../../types";
import { fetchStockHolds } from "../../services/wmsApi";
import { isSeriousHold, SERIOUS_HOLD_CODES } from "../../utils/holdPriority";
import {
  DEFAULT_STOCK_HOLD_SORT,
  sortStockHolds,
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
  focusEntityId?: string | null;
};

type SummaryFilter = "active" | "pendingRelease" | "serious";

const HOLD_CODE_OPTIONS: Array<HoldCode | "All"> = [
  "All",
  "DAMAGED",
  "QA",
  "EXP",
  "RECALL",
  "RETURN",
  "QUAR",
  "CUSTHOLD",
];

export function StockHoldsModule({ filters, focusEntityId = null }: Props) {
  const [allHolds, setAllHolds] = useState<StockHoldRecord[]>([]);
  const [summaryBuckets, setSummaryBuckets] = useState<Set<SummaryFilter>>(
    () => new Set(),
  );
  const [holdCodeFilter, setHoldCodeFilter] =
    useState<(typeof HOLD_CODE_OPTIONS)[number]>("All");
  const [sortAxes, setSortAxes] = useState<ThreeAxisSort>(DEFAULT_STOCK_HOLD_SORT);

  function setSortAxis(axis: keyof ThreeAxisSort, value: SortDirection) {
    setSortAxes((current) => ({ ...current, [axis]: value }));
  }
  const [clientFilter, setClientFilter] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);

  const loadHolds = useCallback(async () => {
    setIsLoading(true);
    try {
      setAllHolds(await fetchStockHolds(filters));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadHolds();
  }, [loadHolds]);

  useEffect(() => {
    if (!focusEntityId) return;
    setSummaryBuckets(new Set(["serious"]));
  }, [focusEntityId]);

  useScrollToEntityFocus(focusEntityId, !isLoading);

  const clientOptions = useMemo(() => {
    const names = [...new Set(allHolds.map((hold) => hold.clientName))].sort();
    return ["All", ...names];
  }, [allHolds]);

  const summary = useMemo(() => {
    return {
      active: allHolds.filter((hold) => hold.holdStatus === "Active").length,
      pendingRelease: allHolds.filter(
        (hold) => hold.holdStatus === "Pending Release",
      ).length,
      serious: allHolds.filter((hold) => isSeriousHold(hold.holdCode)).length,
    };
  }, [allHolds]);

  const visibleHolds = useMemo(() => {
    let list = allHolds;

    if (summaryBuckets.size > 0) {
      list = list.filter((hold) =>
        matchesSummaryBuckets(summaryBuckets, {
          active: hold.holdStatus === "Active",
          pendingRelease: hold.holdStatus === "Pending Release",
          serious: isSeriousHold(hold.holdCode),
        }),
      );
    }

    if (clientFilter !== "All") {
      list = list.filter((hold) => hold.clientName === clientFilter);
    }
    if (holdCodeFilter !== "All") {
      list = list.filter((hold) => hold.holdCode === holdCodeFilter);
    }
    const sorted = sortStockHolds(list, sortAxes);
    if (focusEntityId && !sorted.some((hold) => hold.holdId === focusEntityId)) {
      const focused = allHolds.find((hold) => hold.holdId === focusEntityId);
      if (focused) return [focused, ...sorted];
    }
    return sorted;
  }, [allHolds, summaryBuckets, clientFilter, holdCodeFilter, sortAxes, focusEntityId]);

  function toggleBucket(bucket: SummaryFilter) {
    setSummaryBuckets((current) => toggleSetMember(current, bucket));
  }

  return (
    <section className="module-panel p-5">
      <DashboardSectionHeader
        title="Stock Holds"
        description="Monitor QA holds, damage blocks, returns, recalls, and quarantine status."
      />

      {!isLoading && allHolds.length > 0 && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <FilterSummaryCard
              label="Active"
              value={summary.active}
              tone="blue"
              isSelected={summaryBuckets.has("active")}
              onClick={() => toggleBucket("active")}
            />
            <FilterSummaryCard
              label="Pending release"
              value={summary.pendingRelease}
              isSelected={summaryBuckets.has("pendingRelease")}
              onClick={() => toggleBucket("pendingRelease")}
            />
            <FilterSummaryCard
              label="Serious"
              value={summary.serious}
              tone="red"
              isSelected={summaryBuckets.has("serious")}
              onClick={() => toggleBucket("serious")}
            />
          </div>
          <p className="mt-2 type-muted">
            Select one or more summaries to filter (combined). With none
            selected, all holds in range show.
          </p>
        </>
      )}

      <div className="mt-4 space-y-3">
        <ListSortAxes
          date={sortAxes.date}
          priority={sortAxes.priority}
          location={sortAxes.location}
          priorityLabel="Quantity"
          priorityOptions={QUANTITY_OPTIONS}
          onDateChange={(value) => setSortAxis("date", value)}
          onPriorityChange={(value) => setSortAxis("priority", value)}
          onLocationChange={(value) => setSortAxis("location", value)}
        />
        <div className="flex flex-wrap gap-3">
        <FilterSelect
          label="Customer"
          value={clientFilter}
          options={clientOptions}
          onChange={setClientFilter}
        />
        <FilterSelect
          label="Hold code"
          value={holdCodeFilter}
          options={HOLD_CODE_OPTIONS}
          onChange={(value) => {
            setHoldCodeFilter(value as (typeof HOLD_CODE_OPTIONS)[number]);
          }}
        />
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 type-muted">Loading stock holds…</p>
      ) : !visibleHolds.length ? (
        <p className="mt-5 type-muted">
          No holds match the current filters.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {visibleHolds.map((hold) => {
            const isSerious = SERIOUS_HOLD_CODES.includes(hold.holdCode);
            const showStatusBadge = hold.holdStatus !== "Active";
            const isFocused = focusEntityId === hold.holdId;
            return (
              <div
                key={hold.holdId}
                id={entityFocusDomId(hold.holdId)}
                className={`rounded-xl border p-3 ${
                  isSerious
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 bg-slate-50"
                } ${entityFocusRingClass(isFocused)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="type-label">
                      {hold.holdId}
                    </p>
                    <ProductCardLines
                      className="mt-1"
                      data={{
                        clientCode: hold.clientCode,
                        itemId: hold.itemId,
                        productDescription: hold.productDescription,
                        lotNumber: hold.lotNumber,
                        palletId: hold.palletId,
                        locationCode: hold.locationCode,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <HoldCodeBadge code={hold.holdCode} serious={isSerious} />
                    {showStatusBadge && (
                      <span className="type-badge rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700">
                        {hold.holdStatus}
                      </span>
                    )}
                  </div>
                </div>

                {hold.holdReason && (
                  <p className="mt-1.5 type-text">{hold.holdReason}</p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 type-muted">
                  <span>Hold date {hold.holdDate}</span>
                  <span>Requested by {hold.requestedBy}</span>
                  <span>Qty on hold {hold.quantityOnHold} EA</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="type-control"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function HoldCodeBadge({
  code,
  serious,
}: {
  code: HoldCode;
  serious: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 type-badge ${
        serious
          ? "border-red-300 bg-red-100 text-red-900"
          : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      {code}
    </span>
  );
}
