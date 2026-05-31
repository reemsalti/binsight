import { Activity, Database, RefreshCw, Wifi } from "lucide-react";

type Props = {
  lastSynced: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  dataSourceLabel: string;
};

function formatSyncTime(date: Date | null): string {
  if (!date) return "Not synced yet";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function DashboardHeader({
  lastSynced,
  isRefreshing,
  onRefresh,
  dataSourceLabel,
}: Props) {
  return (
    <header className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
            <Activity size={14} />
            WMS Operations
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            BinSight
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Warehouse operations console for bin visibility, inventory lookup,
            location history, stock holds, and investigation item count work.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Data source
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
              <Database size={15} />
              {dataSourceLabel}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Connection
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Wifi size={15} />
              Online
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Last synced
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatSyncTime(lastSynced)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={isRefreshing ? "animate-spin" : ""}
          />
          {isRefreshing ? "Refreshing WMS data…" : "Refresh WMS Data"}
        </button>
        <p className="text-xs text-slate-400">
          Simulated WMS feed — stock-on-hand and location availability
          snapshots.
        </p>
      </div>
    </header>
  );
}
