import { Database } from "lucide-react";

type Props = {
  lastSynced: Date | null;
};

function formatSyncDate(date: Date, reference: Date): string {
  if (date.toDateString() === reference.toDateString()) {
    return "Today";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSyncTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function LastSyncedStamp({ lastSynced }: Props) {
  const reference = new Date();

  return (
    <div className="min-w-[7.5rem] text-right leading-tight">
      <p className="type-label flex items-center justify-end gap-1">
        <Database size={11} className="text-slate-400" aria-hidden />
        Last updated:
      </p>
      {!lastSynced ? (
        <p className="type-muted mt-0.5">Not synced</p>
      ) : (
        <time
          dateTime={lastSynced.toISOString()}
          className="mt-0.5 block"
          aria-label={`Last updated ${formatSyncDate(lastSynced, reference)} at ${formatSyncTime(lastSynced)}`}
        >
          <span className="type-muted block">{formatSyncDate(lastSynced, reference)}</span>
          <span className="type-code type-emphasis block tabular-nums">
            {formatSyncTime(lastSynced)}
          </span>
        </time>
      )}
    </div>
  );
}
