import { useEffect, useMemo, useState } from "react";
import { BinDetailsPanel } from "./BinDetailsPanel";
import { LoadReferenceBreakdownPanel } from "./LoadReferenceBreakdownPanel";
import { parseLocation } from "../utils/location";
import type {
  BinDetails,
  Filters,
  LoadReferenceKind,
  LocationHistoryRecord,
  ProcessedResults,
  StockOnHandRecord,
} from "../types";
import type { StockReportFormValues } from "./StockReportForm";
import type { DemoPermission } from "../mock-data/demoUser";
import type { BayBlueprint } from "../utils/warehouseBlueprint";
import {
  type BlueprintCellState,
  resolveBlueprintCellState,
} from "../utils/binDetails";
import {
  buildAisleWalkPairs,
  countBayBlueprintAvailable,
  countBlueprintAvailableByAisle,
  countOccupiedByAisle,
  listAislesInRange,
} from "../utils/warehouseBlueprint";
import {
  buildInstageBlueprint,
  buildOutstageBlueprint,
  countStagingActiveDoors,
  countStagingOccupied,
} from "../utils/warehouseStagingBlueprint";
import { StagingDockBlueprint } from "./StagingDockBlueprint";
import { parseStagingLocation } from "../utils/stagingLocations";
import { buildLoadReferenceBreakdown } from "../utils/loadReferenceBreakdown";
import { formatPltCount } from "../utils/wmsLabels";

type Props = {
  results: ProcessedResults | null;
  filters: Filters;
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
  selectedLoadReference: { kind: LoadReferenceKind; reference: string } | null;
  onLoadReferenceSelect: (kind: LoadReferenceKind, reference: string) => void;
  onCloseLoadReference: () => void;
  onActivityLocationSelect?: (locationCode: string) => void;
  onExpandPalletDetail?: (locationCode: string) => void;
  /** When set, scrolls the blueprint to this location's aisle. */
  focusLocation?: string | null;
  variant?: "full" | "rail";
};

type BlueprintSelection = "instage" | "outstage" | `aisle-${number}`;

function parseBlueprintSelection(value: string): BlueprintSelection {
  if (value === "instage" || value === "outstage") return value;
  return `aisle-${Number(value)}` as BlueprintSelection;
}

function blueprintSelectionValue(selection: BlueprintSelection): string {
  if (selection === "instage" || selection === "outstage") return selection;
  return String(Number(selection.replace("aisle-", "")));
}

function selectionToAisle(
  selection: BlueprintSelection,
  fallback: number,
): number {
  if (selection === "instage" || selection === "outstage") return fallback;
  return Number(selection.replace("aisle-", ""));
}

const BLUEPRINT_CELL_STYLES: Record<BlueprintCellState, string> = {
  available:
    "border-emerald-400 bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  occupied: "border-blue-400 bg-blue-100 text-blue-900 hover:bg-blue-200",
};

function RackSlotCell({
  slotLabel,
  location,
  cellState,
  inWmsAvailableFeed,
  isSelected,
  onSelect,
}: {
  slotLabel: string;
  location: string;
  cellState: BlueprintCellState;
  inWmsAvailableFeed: boolean;
  isSelected: boolean;
  onSelect: (locationCode: string) => void;
}) {
  const title =
    cellState === "occupied"
      ? `${location} · Stock on hand`
      : inWmsAvailableFeed
        ? `${location} · Open (WMS empty feed)`
        : `${location} · Open (no stock on hand)`;

  return (
    <button
      type="button"
      title={title}
      onClick={() => onSelect(location)}
      className={`flex h-[2.25rem] w-[3.2rem] shrink-0 items-center justify-center rounded border text-xs font-medium leading-none transition ${BLUEPRINT_CELL_STYLES[cellState]} ${
        isSelected ? "ring-2 ring-slate-900 ring-offset-1" : ""
      }`}
    >
      {slotLabel}
    </button>
  );
}

function BaySidePanel({
  aisle,
  bay,
  trueEmptySet,
  stockLocationSet,
  selectedLocation,
  onBinSelect,
}: {
  aisle: number;
  bay: BayBlueprint;
  trueEmptySet: Set<string>;
  stockLocationSet: Set<string>;
  selectedLocation: string | null;
  onBinSelect: (locationCode: string) => void;
}) {
  const availableCount = countBayBlueprintAvailable(bay, stockLocationSet);

  return (
    <div className="w-[8rem] shrink-0 rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2.5 border-b border-slate-100 pb-2 text-center">
        <p className="type-label leading-none text-slate-600">
          {aisle} - {bay.bayLabel}
        </p>
        {availableCount > 0 && (
          <p className="type-label mt-1 leading-none text-emerald-700">
            {availableCount} open
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        {bay.levels.map((levelRow) => (
          <div
            key={`${bay.bayLabel}-${levelRow.level}`}
            className="flex justify-center gap-1.5"
          >
            {levelRow.slots.map((slot) => (
              <RackSlotCell
                key={slot.location}
                slotLabel={slot.slotLabel}
                location={slot.location}
                cellState={resolveBlueprintCellState(
                  slot.location,
                  trueEmptySet,
                  stockLocationSet,
                )}
                inWmsAvailableFeed={trueEmptySet.has(slot.location)}
                isSelected={selectedLocation === slot.location}
                onSelect={onBinSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function WalkPathColumn() {
  return (
    <div className="relative w-[2.25rem] shrink-0 self-stretch">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-slate-400" />
    </div>
  );
}

function BayWalkPairRow({
  aisle,
  oddBay,
  evenBay,
  trueEmptySet,
  stockLocationSet,
  selectedLocation,
  onBinSelect,
}: {
  aisle: number;
  oddBay: BayBlueprint;
  evenBay: BayBlueprint | null;
  trueEmptySet: Set<string>;
  stockLocationSet: Set<string>;
  selectedLocation: string | null;
  onBinSelect: (locationCode: string) => void;
}) {
  return (
    <div className="flex items-stretch justify-center gap-2">
      {evenBay ? (
        <BaySidePanel
          aisle={aisle}
          bay={evenBay}
          trueEmptySet={trueEmptySet}
          stockLocationSet={stockLocationSet}
          selectedLocation={selectedLocation}
          onBinSelect={onBinSelect}
        />
      ) : (
        <div className="type-muted flex w-[8rem] shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
          —
        </div>
      )}
      <WalkPathColumn />
      <BaySidePanel
        aisle={aisle}
        bay={oddBay}
        trueEmptySet={trueEmptySet}
        stockLocationSet={stockLocationSet}
        selectedLocation={selectedLocation}
        onBinSelect={onBinSelect}
      />
    </div>
  );
}

export function WarehouseHeatMap({
  results,
  filters,
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
  selectedLoadReference,
  onLoadReferenceSelect,
  onCloseLoadReference,
  onActivityLocationSelect,
  onExpandPalletDetail,
  focusLocation = null,
  variant = "full",
}: Props) {
  const [blueprintSelection, setBlueprintSelection] = useState<BlueprintSelection>(
    `aisle-${filters.aisleFrom}`,
  );
  const isRail = variant === "rail";

  const isInstageView = blueprintSelection === "instage";
  const isOutstageView = blueprintSelection === "outstage";
  const isRackView = !isInstageView && !isOutstageView;
  const selectedAisle = selectionToAisle(
    blueprintSelection,
    filters.aisleFrom,
  );

  const availableAisles = useMemo(
    () => listAislesInRange(filters.aisleFrom, filters.aisleTo),
    [filters.aisleFrom, filters.aisleTo],
  );

  const availableCounts = useMemo(
    () =>
      countBlueprintAvailableByAisle(
        stockLocationSet,
        filters.aisleFrom,
        filters.aisleTo,
      ),
    [stockLocationSet, filters.aisleFrom, filters.aisleTo],
  );

  const occupiedCounts = useMemo(
    () =>
      countOccupiedByAisle(
        stockLocationSet,
        filters.aisleFrom,
        filters.aisleTo,
      ),
    [stockLocationSet, filters.aisleFrom, filters.aisleTo],
  );

  const trueEmptySet = useMemo(
    () =>
      new Set(
        results?.finalTrueEmpty.map((row) => row.normalizedLocation) ?? [],
      ),
    [results],
  );

  const walkPairs = useMemo(
    () => (isRackView ? buildAisleWalkPairs(selectedAisle) : []),
    [isRackView, selectedAisle],
  );

  const instageBlueprint = useMemo(
    () => buildInstageBlueprint(stockRecords),
    [stockRecords],
  );
  const outstageBlueprint = useMemo(
    () => buildOutstageBlueprint(stockRecords),
    [stockRecords],
  );

  const instageOccupied = useMemo(
    () => countStagingOccupied("instage", stockRecords),
    [stockRecords],
  );
  const instageActiveDoors = useMemo(
    () => countStagingActiveDoors("instage", stockRecords),
    [stockRecords],
  );
  const outstageOccupied = useMemo(
    () => countStagingOccupied("outstage", stockRecords),
    [stockRecords],
  );
  const outstageActiveDoors = useMemo(
    () => countStagingActiveDoors("outstage", stockRecords),
    [stockRecords],
  );

  const loadReferenceBreakdown = useMemo(() => {
    if (!selectedLoadReference) return null;
    return buildLoadReferenceBreakdown(
      selectedLoadReference.kind,
      selectedLoadReference.reference,
      stockRecords,
    );
  }, [selectedLoadReference, stockRecords]);

  const handleLoadReferenceSelect = (
    kind: LoadReferenceKind,
    reference: string,
  ) => {
    onLoadReferenceSelect(kind, reference);
  };

  const handleCloseLoadReferenceBreakdown = () => {
    onCloseLoadReference();
  };

  const handleBreakdownLocationSelect = (locationCode: string) => {
    onCloseLoadReference();
    onBinSelect(locationCode);
  };

  const handleActivityLocationSelect = (locationCode: string) => {
    if (onActivityLocationSelect) {
      onActivityLocationSelect(locationCode);
      return;
    }
    onBinSelect(locationCode);
  };

  useEffect(() => {
    if (!selectedLoadReference) return;
    setBlueprintSelection(
      selectedLoadReference.kind === "receipt" ? "instage" : "outstage",
    );
  }, [selectedLoadReference]);

  const selectedAisleAvailableCount = availableCounts[selectedAisle] ?? 0;
  const selectedAisleOccupiedCount = occupiedCounts[selectedAisle] ?? 0;

  useEffect(() => {
    if (isInstageView || isOutstageView) return;
    setBlueprintSelection((current) => {
      if (current === "instage" || current === "outstage") return current;
      const aisle = selectionToAisle(current, filters.aisleFrom);
      if (aisle < filters.aisleFrom) return `aisle-${filters.aisleFrom}`;
      if (aisle > filters.aisleTo) return `aisle-${filters.aisleTo}`;
      if (!availableAisles.includes(aisle)) return `aisle-${filters.aisleFrom}`;
      return current;
    });
  }, [filters.aisleFrom, filters.aisleTo, availableAisles, isInstageView, isOutstageView]);

  useEffect(() => {
    if (!focusLocation) return;
    const staging = parseStagingLocation(focusLocation);
    if (staging) {
      setBlueprintSelection(staging.zone);
      return;
    }
    const parsed = parseLocation(focusLocation);
    if (!parsed) return;
    if (parsed.aisle < filters.aisleFrom || parsed.aisle > filters.aisleTo) {
      return;
    }
    setBlueprintSelection(`aisle-${parsed.aisle}`);
  }, [focusLocation, filters.aisleFrom, filters.aisleTo]);

  if (!results) {
    return (
      <section className="module-panel p-8 text-center text-slate-500">
        Refresh WMS data to view the rack blueprint.
      </section>
    );
  }

  return (
    <section
      className={
        isRail ? "flex min-h-0 flex-1 flex-col" : "space-y-4"
      }
    >
      <div
        className={`overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 ${
          isRail ? "flex min-h-0 flex-1 flex-col" : ""
        }`}
      >
        <div
          className={`flex min-h-0 ${isRail ? "min-h-0 flex-1" : "max-h-[48rem]"}`}
        >
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 z-20 border-b border-slate-700 bg-slate-900 px-5 py-4 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="type-badge text-slate-400">Warehouse blueprint</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="aisle-blueprint-select"
                      className="type-label text-slate-300"
                    >
                      Area
                    </label>
                    <select
                      id="aisle-blueprint-select"
                      value={blueprintSelectionValue(blueprintSelection)}
                      onChange={(event) =>
                        setBlueprintSelection(
                          parseBlueprintSelection(event.target.value),
                        )
                      }
                      className="rounded-lg border border-white/20 bg-slate-800 px-3 py-1.5 text-lg font-semibold text-white focus:border-white/40 focus:outline-none"
                    >
                      <option value="instage">Instage · receiving docks</option>
                      <option value="outstage">Outstage · shipping docks</option>
                      {availableAisles.map((aisle) => (
                        <option key={aisle} value={aisle}>
                          Aisle {aisle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isInstageView && (
                    <>
                      <span className="type-badge rounded-full bg-amber-500/25 px-3 py-1 text-amber-100">
                        {formatPltCount(instageOccupied)}
                      </span>
                      <span className="type-badge rounded-full bg-amber-500/15 px-3 py-1 text-amber-100">
                        {instageActiveDoors} active doors
                      </span>
                    </>
                  )}
                  {isOutstageView && (
                    <>
                      <span className="type-badge rounded-full bg-violet-500/25 px-3 py-1 text-violet-100">
                        {formatPltCount(outstageOccupied)}
                      </span>
                      <span className="type-badge rounded-full bg-violet-500/15 px-3 py-1 text-violet-100">
                        {outstageActiveDoors} active doors
                      </span>
                    </>
                  )}
                  {isRackView && (
                    <>
                      <span className="type-badge rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">
                        {selectedAisleAvailableCount} open
                      </span>
                      <span className="type-badge rounded-full bg-blue-500/20 px-3 py-1 text-blue-100">
                        {selectedAisleOccupiedCount} occupied
                      </span>
                      <span className="type-badge rounded-full bg-white/10 px-3 py-1 text-slate-200">
                        Bays 01 – 38
                      </span>
                    </>
                  )}
                  {selectedLocation && (
                    <span className="type-badge rounded-full bg-blue-500/20 px-3 py-1 text-blue-100">
                      {selectedLocation}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative z-0 space-y-4 p-5">
              {isInstageView && (
                <StagingDockBlueprint
                  blueprint={instageBlueprint}
                  selectedLocation={selectedLocation}
                  onBinSelect={onBinSelect}
                  onLoadReferenceSelect={handleLoadReferenceSelect}
                />
              )}

              {isRackView && (
                <div className="rounded-xl border border-slate-300 bg-slate-100/80 p-1">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="type-label text-center text-slate-600">
                      Rack storage · Aisle {selectedAisle} · Bays 01 – 38
                    </p>
                  </div>
                  <div className="space-y-3 p-4 pt-3">
                    {walkPairs.map((pair) => (
                      <BayWalkPairRow
                        key={`${selectedAisle}-${pair.oddBay.bayLabel}`}
                        aisle={selectedAisle}
                        oddBay={pair.oddBay}
                        evenBay={pair.evenBay}
                        trueEmptySet={trueEmptySet}
                        stockLocationSet={stockLocationSet}
                        selectedLocation={selectedLocation}
                        onBinSelect={onBinSelect}
                      />
                    ))}
                  </div>
                </div>
              )}

              {isOutstageView && (
                <StagingDockBlueprint
                  blueprint={outstageBlueprint}
                  selectedLocation={selectedLocation}
                  onBinSelect={onBinSelect}
                  onLoadReferenceSelect={handleLoadReferenceSelect}
                />
              )}
            </div>
          </div>

          {loadReferenceBreakdown && (
            <LoadReferenceBreakdownPanel
              breakdown={loadReferenceBreakdown}
              onClose={handleCloseLoadReferenceBreakdown}
              onSelectLocation={handleBreakdownLocationSelect}
            />
          )}

          {selectedLocation && !loadReferenceBreakdown && (
            <BinDetailsPanel
              details={binDetails}
              filters={filters}
              history={locationHistory}
              palletHistory={palletHistory}
              permissions={permissions}
              isLoading={isBinDetailsLoading}
              isHistoryLoading={isHistoryLoading}
              isPalletHistoryLoading={isPalletHistoryLoading}
              onClose={onCloseBinDetails}
              onLoadHistory={onLoadHistory}
              onSubmitReport={onSubmitReport}
              isSubmittingReport={isSubmittingReport}
              reportSubmittedFor={reportSubmittedFor}
              onLoadReferenceSelect={onLoadReferenceSelect}
              onActivityLocationSelect={handleActivityLocationSelect}
              onExpandPalletDetail={onExpandPalletDetail}
            />
          )}
        </div>
      </div>
    </section>
  );
}
