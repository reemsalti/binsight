import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { DashboardSectionHeader } from "../DashboardSectionHeader";
import { DataTable } from "../DataTable";
import type { DemoPermission } from "../../mock-data/demoUser";
import type {
  EmptyLocationValidationResult,
  Filters,
  ProcessedResults,
} from "../../types";
import {
  fetchEmptyLocationValidation,
  validateEmptyLocations,
} from "../../services/wmsApi";
import { downloadVerificationCheckSheet } from "../../utils/exportCsv";
import { hasPermission } from "../../utils/permissions";

type Props = {
  filters: Filters;
  results: ProcessedResults | null;
  permissions: DemoPermission[];
};

export function LocationAvailabilityModule({
  filters,
  results,
  permissions,
}: Props) {
  const [validation, setValidation] =
    useState<EmptyLocationValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const canExportReports = hasPermission(permissions, "export_reports");

  const loadAvailability = useCallback(async () => {
    setIsLoading(true);
    try {
      setValidation(await fetchEmptyLocationValidation(filters));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      setValidation(await validateEmptyLocations(filters));
    } finally {
      setIsRefreshing(false);
    }
  }

  const availableRows = results?.finalTrueEmpty ?? [];

  return (
    <section className="space-y-4">
      <div className="module-panel p-5">
        <DashboardSectionHeader
          title="Location Availability"
          description="Bin locations the WMS currently reports as available, with a check sheet to verify them on the floor."
        />

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="type-emphasis">
            How to use this
          </p>
          <p className="mt-1 type-text">
            These are the locations the WMS shows as empty and ready for
            putaway. Export the check sheet and walk the aisles to confirm they
            are physically clear. If you find product where it should not be,
            file it from the bin panel or the Stock Reports module so Inventory
            Control can resolve it.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="type-btn gap-2 border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
            />
            {isRefreshing ? "Refreshing…" : "Refresh available locations"}
          </button>
          {validation?.lastValidatedAt && (
            <p className="type-muted">
              Last refreshed{" "}
              {new Date(validation.lastValidatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {isLoading ? (
          <p className="mt-4 type-muted">
            Loading availability summary…
          </p>
        ) : validation ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Available locations"
              value={validation.validatedAvailableCount}
              tone="emerald"
            />
            <MetricCard
              label="Aisle range"
              value={`${filters.aisleFrom} – ${filters.aisleTo}`}
            />
          </div>
        ) : null}
      </div>

      {canExportReports && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              downloadVerificationCheckSheet(
                availableRows,
                "location-verification-checksheet.csv",
              )
            }
            className="type-btn gap-2 bg-slate-900 text-white hover:bg-slate-700"
          >
            <Download size={16} />
            Export verification check sheet
          </button>
        </div>
      )}

      <DataTable title="Available Locations" rows={availableRows} />
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "emerald";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="type-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium text-slate-950">{value}</p>
    </div>
  );
}
