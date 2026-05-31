import { useEffect, useState } from "react";
import type { Filters, ProcessedResults } from "../types";
import {
  fetchCycleCountTasks,
  fetchStockHolds,
  fetchStockReports,
} from "../services/wmsApi";

type Props = {
  results: ProcessedResults | null;
  filters: Filters;
};

type Tone = "emerald" | "blue" | "amber" | "red" | "slate";

const TONE_STYLES: Record<Tone, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-900",
  slate: "border-slate-200 bg-slate-50 text-slate-900",
};

function SnapshotTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: Tone;
}) {
  return (
    <div className={`rounded-xl border p-4 ${TONE_STYLES[tone]}`}>
      <p className="type-label">
        {label}
      </p>
      <p className="mt-1 text-2xl font-medium leading-none">
        {value === null ? "—" : value}
      </p>
    </div>
  );
}

export function DashboardSnapshot({ results, filters }: Props) {
  const [activeHolds, setActiveHolds] = useState<number | null>(null);
  const [openCounts, setOpenCounts] = useState<number | null>(null);
  const [openReports, setOpenReports] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOperationalCounts() {
      const [holds, tasks, reports] = await Promise.all([
        fetchStockHolds(filters),
        fetchCycleCountTasks(filters),
        fetchStockReports(filters),
      ]);
      if (cancelled) return;
      setActiveHolds(
        holds.filter((hold) => hold.holdStatus === "Active").length,
      );
      setOpenCounts(
        tasks.filter(
          (task) =>
            task.status === "Not Started" || task.status === "In Progress",
        ).length,
      );
      setOpenReports(
        reports.filter((report) => report.status !== "Resolved").length,
      );
    }

    void loadOperationalCounts();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const availableLocations = results ? results.finalTrueEmpty.length : null;
  const occupiedBins = results ? results.uniqueOccupiedCount : null;

  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-4">
        <h2 className="type-heading">
          Operations snapshot
        </h2>
        <p className="mt-1 type-muted">
          Live counts across the selected aisle range from the current WMS
          snapshot.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SnapshotTile
          label="Available locations"
          value={availableLocations}
          tone="emerald"
        />
        <SnapshotTile
          label="Occupied bins"
          value={occupiedBins}
          tone="blue"
        />
        <SnapshotTile
          label="Open stock reports"
          value={openReports}
          tone={openReports && openReports > 0 ? "amber" : "slate"}
        />
        <SnapshotTile
          label="Active holds"
          value={activeHolds}
          tone={activeHolds && activeHolds > 0 ? "red" : "slate"}
        />
        <SnapshotTile
          label="Open count tasks"
          value={openCounts}
          tone="slate"
        />
      </div>
    </section>
  );
}
