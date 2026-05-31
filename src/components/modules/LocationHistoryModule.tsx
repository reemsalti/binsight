import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { DashboardSectionHeader } from "../DashboardSectionHeader";
import { ProductCardLines } from "../ProductCardLines";
import type { Filters, LocationHistoryRecord } from "../../types";
import {
  fetchLocationHistory,
  fetchRecentLocationActivity,
} from "../../services/wmsApi";
import {
  historyActionBadgeClass,
  historyActionDotClass,
} from "../../utils/historyActions";

type Props = {
  filters: Filters;
};

export function LocationHistoryModule({ filters }: Props) {
  const [locationCode, setLocationCode] = useState("");
  const [history, setHistory] = useState<LocationHistoryRecord[]>([]);
  const [recentActivity, setRecentActivity] = useState<LocationHistoryRecord[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRecentLoading, setIsRecentLoading] = useState(true);

  useEffect(() => {
    setIsRecentLoading(true);
    void fetchRecentLocationActivity(filters)
      .then(setRecentActivity)
      .finally(() => setIsRecentLoading(false));
  }, [filters]);

  async function handleFetchHistory() {
    if (!locationCode.trim()) return;
    setIsLoading(true);
    try {
      setHistory(await fetchLocationHistory(locationCode.trim()));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="module-panel p-5">
      <DashboardSectionHeader
        title="Location History"
        description="Review prior receipts, moves, picks, and adjustments by location."
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={locationCode}
          onChange={(event) => setLocationCode(event.target.value)}
          placeholder="Location code, e.g. 601-01-A01"
          className="min-w-[14rem] flex-1 type-control"
        />
        <button
          type="button"
          onClick={() => void handleFetchHistory()}
          disabled={isLoading || !locationCode.trim()}
          className="type-btn gap-2 bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60"
        >
          <History size={16} />
          {isLoading ? "Loading…" : "Fetch location history"}
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 type-heading">
            Location history timeline · {locationCode.toUpperCase()}
          </h3>
          <div className="space-y-3 border-l-2 border-slate-200 pl-4">
            {history.map((record, index) => (
              <HistoryCard key={`${record.date}-${record.action}-${index}`} record={record} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-3 type-heading">
          Recent location activity
        </h3>
        {isRecentLoading ? (
          <p className="type-muted">Loading recent activity…</p>
        ) : !recentActivity.length ? (
          <p className="type-muted">No recent activity found.</p>
        ) : (
          <div className="space-y-3 border-l-2 border-slate-200 pl-4">
            {recentActivity.map((record, index) => (
              <HistoryCard
                key={`recent-${record.locationCode}-${record.date}-${index}`}
                record={record}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryCard({ record }: { record: LocationHistoryRecord }) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span
        className={`absolute -left-[1.3125rem] top-5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${historyActionDotClass(record.action)}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 type-badge ${historyActionBadgeClass(record.action)}`}
          >
            {record.action}
          </span>
        </div>
        <span className="type-muted">{record.date}</span>
      </div>
      <p className="type-label mt-1">Operator · {record.operator}</p>
      <ProductCardLines
        className="mt-1"
        data={{
          clientCode: record.clientCode,
          itemId: record.itemId,
          productDescription: record.productDescription,
          lotNumber: record.lotNumber,
          palletId: record.palletId,
          locationCode: record.locationCode,
        }}
      />
      <p className="mt-2 type-muted">
        Qty {record.quantityOnHand} EA · {record.packageDetails}
      </p>
      <p className="mt-1 type-muted">{record.note}</p>
    </div>
  );
}
