import { RefreshCw } from "lucide-react";
import type { DemoUser } from "../../mock-data/demoUser";
import { formatGreeting } from "../../utils/greeting";
import { BinSightLogo } from "./BinSightLogo";
import { LastSyncedStamp } from "./LastSyncedStamp";
import { LiveClock } from "./LiveClock";

type Props = {
  user: DemoUser;
  lastSynced: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  error?: string;
};

export function AppToolbar({
  user,
  lastSynced,
  isRefreshing,
  onRefresh,
  error,
}: Props) {
  return (
    <header className="shrink-0 border-b border-slate-200/90 bg-white">
      <div className="h-0.5 bg-blue-600" aria-hidden />
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:gap-4 md:px-5">
        <BinSightLogo />

        <div
          className="hidden h-10 w-px shrink-0 bg-slate-200/90 md:block"
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="type-heading">{formatGreeting(user.name)}</p>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <LiveClock />
          </div>
          <p className="type-muted mt-0.5">
            {user.role} · {user.accessLevel}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50/60 px-3 py-2 sm:ml-auto sm:w-auto">
          <LastSyncedStamp lastSynced={lastSynced} />
          <div className="h-8 w-px shrink-0 bg-slate-200/90" aria-hidden />
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? "Refreshing WMS data" : "Refresh WMS data"}
            title={isRefreshing ? "Refreshing…" : "Refresh WMS data"}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200/90 bg-white text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {error && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 md:px-5">
          {error}
        </p>
      )}
    </header>
  );
}
