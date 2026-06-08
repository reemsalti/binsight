import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "./components/layout/AppSidebar";
import { AppToolbar } from "./components/layout/AppToolbar";
import { BinVisibilityModule } from "./components/modules/BinVisibilityModule";
import { CycleCountModule } from "./components/modules/CycleCountModule";
import { LocationAvailabilityModule } from "./components/modules/LocationAvailabilityModule";
import { InventoryLookupModule } from "./components/modules/InventoryLookupModule";
import { LocationHistoryModule } from "./components/modules/LocationHistoryModule";
import { StockHoldsModule } from "./components/modules/StockHoldsModule";
import { StockReportsModule } from "./components/modules/StockReportsModule";
import { WorkQueueModule } from "./components/modules/WorkQueueModule";
import { PalletDetailPage } from "./components/modules/PalletDetailPage";
import type { StockReportFormValues } from "./components/StockReportForm";
import { demoUser } from "./mock-data/demoUser";
import type {
  BinDetails,
  EmptyLocationRow,
  Filters,
  LoadReferenceKind,
  LocationHistoryRecord,
  ProcessedResults,
  StockBinRow,
  StockOnHandRecord,
  WarehouseModule,
  WorkQueueNavigateTarget,
} from "./types";
import { moduleForQueueItemKind } from "./types";
import {
  createStockReport,
  fetchBinDetails,
  fetchEmptyLocations,
  fetchLastSyncTime,
  fetchLocationHistory,
  fetchPalletMovementHistory,
  fetchStockOnHand,
  markWmsSyncComplete,
  syncProcessedResults,
} from "./services/wmsApi";
import { buildStockLocationSet } from "./utils/binDetails";
import { processLocations } from "./utils/processLocations";
import { hasPermission } from "./utils/permissions";
import { wmsEmptyToRows, wmsStockToRows } from "./utils/wmsAdapters";

const DEFAULT_FILTERS: Filters = { aisleFrom: 601, aisleTo: 622 };

function resolveAllowedModules(): WarehouseModule[] {
  const modules: WarehouseModule[] = ["work-queue"];
  if (hasPermission(demoUser, "view_bins")) {
    modules.push("bin-visibility", "location-availability");
  }
  if (hasPermission(demoUser, "view_inventory")) {
    modules.push("inventory-lookup", "cycle-count", "stock-holds", "stock-reports");
  }
  if (hasPermission(demoUser, "view_location_history")) {
    modules.push("location-history");
  }
  return modules;
}

export default function App() {
  const allowedModules = useMemo(() => resolveAllowedModules(), []);
  const [selectedModule, setSelectedModule] =
    useState<WarehouseModule>("work-queue");
  const filters = DEFAULT_FILTERS;
  const [emptyRows, setEmptyRows] = useState<EmptyLocationRow[]>([]);
  const [stockRows, setStockRows] = useState<StockBinRow[]>([]);
  const [stockRecords, setStockRecords] = useState<StockOnHandRecord[]>([]);
  const [results, setResults] = useState<ProcessedResults | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [binDetails, setBinDetails] = useState<BinDetails | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryRecord[]>(
    [],
  );
  const [palletHistory, setPalletHistory] = useState<LocationHistoryRecord[]>([]);
  const [isBinDetailsLoading, setIsBinDetailsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isPalletHistoryLoading, setIsPalletHistoryLoading] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmittedFor, setReportSubmittedFor] = useState<string | null>(
    null,
  );
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(null);
  const [blueprintFocusLocation, setBlueprintFocusLocation] = useState<
    string | null
  >(null);
  const [selectedLoadReference, setSelectedLoadReference] = useState<{
    kind: LoadReferenceKind;
    reference: string;
  } | null>(null);
  const [palletDetailPageLocation, setPalletDetailPageLocation] = useState<
    string | null
  >(null);
  const [palletDetailReturnModule, setPalletDetailReturnModule] =
    useState<WarehouseModule>("work-queue");

  const stockLocationSet = useMemo(
    () => buildStockLocationSet(stockRecords),
    [stockRecords],
  );

  useEffect(() => {
    if (!allowedModules.includes(selectedModule) && allowedModules.length > 0) {
      setSelectedModule(allowedModules[0]);
    }
  }, [allowedModules, selectedModule]);

  const reprocess = useCallback(
    (
      nextEmpty: EmptyLocationRow[],
      nextStock: StockBinRow[],
      nextFilters: Filters,
    ) => {
      if (!nextEmpty.length || !nextStock.length) {
        setResults(null);
        return;
      }
      setResults(processLocations(nextEmpty, nextStock, nextFilters));
      syncProcessedResults(nextFilters);
    },
    [],
  );

  useEffect(() => {
    if (emptyRows.length && stockRows.length) {
      reprocess(emptyRows, stockRows, filters);
    }
  }, [filters, emptyRows, stockRows, reprocess]);

  const refreshWmsData = useCallback(async () => {
    setError("");
    setIsRefreshing(true);
    try {
      const [emptyRecords, stockRecordData] = await Promise.all([
        fetchEmptyLocations(),
        fetchStockOnHand(),
      ]);
      await fetchLastSyncTime();
      const syncedAt = markWmsSyncComplete(new Date());
      const nextEmpty = wmsEmptyToRows(emptyRecords);
      const nextStock = wmsStockToRows(stockRecordData);
      setEmptyRows(nextEmpty);
      setStockRows(nextStock);
      setStockRecords(stockRecordData);
      setLastSynced(syncedAt);
      reprocess(nextEmpty, nextStock, filters);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not refresh WMS demo feed.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [filters, reprocess]);

  useEffect(() => {
    void refreshWmsData();
  }, []);

  const loadBinDetails = useCallback(
    async (locationCode: string) => {
      setIsBinDetailsLoading(true);
      setLocationHistory([]);
      setPalletHistory([]);
      try {
        const details = await fetchBinDetails(
          locationCode,
          stockRecords,
          results,
          filters,
        );
        setBinDetails(details);

        if (details?.stock?.palletId) {
          setIsPalletHistoryLoading(true);
          try {
            const movementHistory = await fetchPalletMovementHistory(
              details.stock.palletId,
            );
            setPalletHistory(movementHistory);
            setLocationHistory(await fetchLocationHistory(locationCode));
          } finally {
            setIsPalletHistoryLoading(false);
          }
        }
      } finally {
        setIsBinDetailsLoading(false);
      }
    },
    [filters, results, stockRecords],
  );

  const handleBinSelect = useCallback(
    (locationCode: string) => {
      setBlueprintFocusLocation(locationCode);
      setSelectedLoadReference(null);
      setSelectedLocation(locationCode);
      setReportSubmittedFor(null);
      void loadBinDetails(locationCode);
    },
    [loadBinDetails],
  );

  const handleLoadReferenceSelect = useCallback(
    (kind: LoadReferenceKind, reference: string) => {
      setSelectedLoadReference({ kind, reference });
      setSelectedLocation(null);
      setBinDetails(null);
      setLocationHistory([]);
      setPalletHistory([]);
      setReportSubmittedFor(null);
    },
    [],
  );

  const handleCloseLoadReference = useCallback(() => {
    setSelectedLoadReference(null);
  }, []);

  const handleActivityLocationSelect = useCallback(
    (locationCode: string) => {
      setPalletDetailPageLocation(null);
      setBlueprintFocusLocation(locationCode);
      handleBinSelect(locationCode);
    },
    [handleBinSelect],
  );

  const handleExpandPalletDetail = useCallback(
    (locationCode: string) => {
      setPalletDetailReturnModule(selectedModule);
      setPalletDetailPageLocation(locationCode);
      setBlueprintFocusLocation(locationCode);
      if (selectedLocation !== locationCode || !binDetails?.stock) {
        setSelectedLocation(locationCode);
        setReportSubmittedFor(null);
        void loadBinDetails(locationCode);
      }
    },
    [binDetails?.stock, loadBinDetails, selectedLocation, selectedModule],
  );

  const handleClosePalletDetailPage = useCallback(() => {
    setPalletDetailPageLocation(null);
    setSelectedModule(palletDetailReturnModule);
  }, [palletDetailReturnModule]);

  const handleSubmitReport = useCallback(async (values: StockReportFormValues) => {
    setIsSubmittingReport(true);
    try {
      const report = await createStockReport({
        ...values,
        reportedBy: demoUser.name,
      });
      setReportSubmittedFor(report.locationCode);
    } finally {
      setIsSubmittingReport(false);
    }
  }, []);

  const handleCloseBinPanel = useCallback(() => {
    setSelectedLocation(null);
    setBinDetails(null);
    setLocationHistory([]);
    setPalletHistory([]);
    setReportSubmittedFor(null);
  }, []);

  const handleInventorySelect = useCallback(
    (locationCode: string) => {
      setSelectedModule("bin-visibility");
      handleBinSelect(locationCode);
    },
    [handleBinSelect],
  );

  const handleInventoryLoadReference = useCallback(
    (kind: LoadReferenceKind, reference: string) => {
      setSelectedModule("work-queue");
      setFocusedEntityId(null);
      setBlueprintFocusLocation(null);
      handleLoadReferenceSelect(kind, reference);
    },
    [handleLoadReferenceSelect],
  );

  const handleQueueNavigate = useCallback(
    (target: WorkQueueNavigateTarget) => {
      if (target.kind === "putaway" || target.kind === "outbound") {
        setSelectedModule("work-queue");
        setFocusedEntityId(null);
        setBlueprintFocusLocation(target.locationCode);
        if (target.loadReference && target.loadReferenceKind) {
          handleLoadReferenceSelect(target.loadReferenceKind, target.loadReference);
        } else {
          handleBinSelect(target.locationCode);
        }
        return;
      }

      const module = moduleForQueueItemKind(target.kind);
      if (!module || !allowedModules.includes(module)) return;
      setFocusedEntityId(target.entityId);
      setSelectedModule(module);
      handleCloseBinPanel();
    },
    [
      allowedModules,
      handleBinSelect,
      handleCloseBinPanel,
      handleLoadReferenceSelect,
    ],
  );

  const handleSelectModule = useCallback((module: WarehouseModule) => {
    setSelectedModule(module);
    setFocusedEntityId(null);
  }, []);

  const handleLoadHistory = useCallback(async () => {
    if (!selectedLocation) return;
    setIsHistoryLoading(true);
    try {
      const locationRecords = await fetchLocationHistory(selectedLocation);
      setLocationHistory(locationRecords);
      if (binDetails?.stock?.palletId) {
        setPalletHistory(
          await fetchPalletMovementHistory(binDetails.stock.palletId),
        );
      }
    } finally {
      setIsHistoryLoading(false);
    }
  }, [binDetails?.stock?.palletId, selectedLocation]);

  const spatialProps = {
    results,
    filters,
    stockLocationSet,
    stockRecords,
    selectedLocation,
    onBinSelect: handleBinSelect,
    binDetails,
    locationHistory,
    palletHistory,
    isBinDetailsLoading,
    isHistoryLoading,
    isPalletHistoryLoading,
    onCloseBinDetails: handleCloseBinPanel,
    onLoadHistory: () => void handleLoadHistory(),
    onSubmitReport: handleSubmitReport,
    isSubmittingReport,
    reportSubmittedFor,
    permissions: demoUser.permissions,
    blueprintFocusLocation,
    selectedLoadReference,
    onLoadReferenceSelect: handleLoadReferenceSelect,
    onCloseLoadReference: handleCloseLoadReference,
    onActivityLocationSelect: handleActivityLocationSelect,
    onExpandPalletDetail: handleExpandPalletDetail,
  };

  return (
    <main className="surface-page flex h-dvh flex-col overflow-hidden text-slate-900">
      <p className="shrink-0 border-b border-slate-200/80 bg-white/80 px-4 py-1.5 text-center type-muted backdrop-blur-sm">
        Portfolio demo — sample data only. Brand names used for visualization.
      </p>

      <AppToolbar
        user={demoUser}
        lastSynced={lastSynced}
        isRefreshing={isRefreshing}
        onRefresh={() => void refreshWmsData()}
        error={error || undefined}
      />

      <div className="flex min-h-0 flex-1 gap-2 p-2 md:gap-2.5 md:p-2.5">
        <AppSidebar
          selectedModule={selectedModule}
          onSelectModule={handleSelectModule}
          allowedModules={allowedModules}
          permissions={demoUser.permissions}
        />

        <div
          className={`min-h-0 min-w-0 flex-1 ${
            palletDetailPageLocation || selectedModule === "work-queue"
              ? "flex flex-col overflow-hidden"
              : "module-workspace overflow-y-auto"
          }`}
        >
          {palletDetailPageLocation ? (
            <PalletDetailPage
              details={binDetails}
              history={locationHistory}
              palletHistory={palletHistory}
              isLoading={isBinDetailsLoading}
              isPalletHistoryLoading={isPalletHistoryLoading}
              isHistoryLoading={isHistoryLoading}
              onBack={handleClosePalletDetailPage}
              onLoadReferenceSelect={handleLoadReferenceSelect}
              onActivityLocationSelect={handleActivityLocationSelect}
            />
          ) : (
            <>
          {selectedModule === "work-queue" && (
            <WorkQueueModule
              lastSynced={lastSynced}
              onNavigate={handleQueueNavigate}
              {...spatialProps}
            />
          )}

          {selectedModule === "bin-visibility" &&
            hasPermission(demoUser, "view_bins") && (
              <BinVisibilityModule {...spatialProps} />
            )}

          {selectedModule === "inventory-lookup" &&
            hasPermission(demoUser, "view_inventory") && (
              <InventoryLookupModule
                filters={filters}
                stockRecords={stockRecords}
                onSelectLocation={handleInventorySelect}
                onSelectLoadReference={handleInventoryLoadReference}
              />
            )}

          {selectedModule === "location-history" &&
            hasPermission(demoUser, "view_location_history") && (
              <LocationHistoryModule filters={filters} />
            )}

          {selectedModule === "cycle-count" &&
            hasPermission(demoUser, "view_inventory") && (
              <CycleCountModule
                filters={filters}
                focusEntityId={focusedEntityId}
              />
            )}

          {selectedModule === "stock-holds" &&
            hasPermission(demoUser, "view_inventory") && (
              <StockHoldsModule
                filters={filters}
                focusEntityId={focusedEntityId}
              />
            )}

          {selectedModule === "location-availability" &&
            hasPermission(demoUser, "view_bins") && (
              <LocationAvailabilityModule
                filters={filters}
                results={results}
                permissions={demoUser.permissions}
              />
            )}

          {selectedModule === "stock-reports" &&
            hasPermission(demoUser, "view_inventory") && (
              <StockReportsModule
                filters={filters}
                permissions={demoUser.permissions}
                focusEntityId={focusedEntityId}
              />
            )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
