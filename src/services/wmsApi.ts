import {
  generateMockWarehouseData,
  getMockLocationHistory,
  getMockSnapshot,
  getMockStockRecord,
  resetMockWarehouseCache,
} from "../mock-data/generateMockWarehouseData";
import type {
  BinDetails,
  BinLocation,
  BinStatusSummary,
  CycleCountStatus,
  CycleCountTask,
  ReviewCycleCountDiscrepancyInput,
  EmptyLocationValidationResult,
  Filters,
  HoldCode,
  HoldStatus,
  InventoryLookupResult,
  LocationHistoryRecord,
  ModuleFilters,
  OccupiedConflict,
  ProcessedResults,
  StockHoldRecord,
  StockOnHandRecord,
  StockReport,
  StockReportInput,
  StockReportStatus,
  WmsEmptyLocationRecord,
} from "../types";
import { demoUser } from "../mock-data/demoUser";
import {
  cycleCountVarianceNote,
  discrepancyOutcomeLabel,
  resolutionTypeLabel,
} from "../utils/cycleCountVariance";
import {
  buildBinDetails,
  buildStockLocationSet,
  buildStockRecordMap,
} from "../utils/binDetails";
import { normalizeLocation, parseLocation } from "../utils/location";
import { processLocations } from "../utils/processLocations";
import { wmsEmptyToRows, wmsStockToRows } from "../utils/wmsAdapters";
import { buildAisleWalkPairs } from "../utils/warehouseBlueprint";
import { searchLoadReferences as matchLoadReferences } from "../utils/loadReferenceSearch";

const API_DELAY_MS_MIN = 300;
const API_DELAY_MS_MAX = 700;

let lastSyncTime: Date | null = null;
let cachedProcessedResults: ProcessedResults | null = null;
let cachedDefaultFilters: Filters = { aisleFrom: 601, aisleTo: 622 };

const cycleCountOverrides = new Map<string, Partial<CycleCountTask>>();
const holdOverrides = new Map<string, Partial<StockHoldRecord>>();

function buildSeedStockReports(): StockReport[] {
  return [
    {
      reportId: "SR-1042",
      locationCode: "604-07-A01",
      reportType: "Stock in empty location",
      note: "Wrapped PLT sitting in a bin the system shows as available. No label scanned — LEGO play set cartons visible on wrap.",
      reportedBy: "M. Diaz",
      reportedAt: "2026-05-28T14:12:00.000Z",
      clientCode: "LEGOTOYS",
      suspectedClient: "LEGO",
      suspectedItemId: "LE10003",
      lotNumber: "240118",
      productDescription: "Creative Play Set 900PC",
      reportQuantityScope: "full",
      status: "Open",
    },
    {
      reportId: "SR-1039",
      locationCode: "612-29-B01",
      reportType: "Misplaced pallet",
      note: "PLT physically at 611-15-C02; slot label and travel card assign 612-29-B01. WMS still shows this PLT here.",
      reportedBy: "T. Okafor",
      reportedAt: "2026-05-28T09:47:00.000Z",
      palletId: "10020018",
      clientCode: "LOREALCA",
      suspectedClient: "L'Oréal",
      suspectedItemId: "LO10002",
      lotNumber: "240774",
      productDescription: "Facial Cleanser 150ML",
      status: "Under Review",
    },
    {
      reportId: "SR-1035",
      locationCode: "618-22-B01",
      reportType: "Wrong item in location",
      note: "Cases in this slot are Kellogg's cereal cups but the location is set up for crackers. WMS shows L'Oréal shampoo on this PLT.",
      reportedBy: "R. Singh",
      reportedAt: "2026-05-27T16:30:00.000Z",
      clientCode: "KELLOGGS",
      suspectedClient: "Kellogg's",
      suspectedItemId: "KE10002",
      palletId: "10010221",
      lotNumber: "240311",
      productDescription: "Cereal Cup Variety 45G",
      status: "Open",
    },
    {
      reportId: "SR-1028",
      locationCode: "607-03-A02",
      reportType: "Damaged product found",
      note: "Crushed cases discovered during a putaway pass. Flagged for QA review.",
      reportedBy: "M. Diaz",
      reportedAt: "2026-05-26T11:05:00.000Z",
      palletId: "10040147",
      clientCode: "LOREALCA",
      suspectedItemId: "LO10004",
      lotNumber: "240333",
      productDescription: "Hair Treatment Jar 250ML",
      status: "Resolved",
      resolvedBy: "Reem",
      resolvedAt: "2026-05-27T08:20:00.000Z",
      resolutionNote: "Moved to QA hold and adjusted inventory. Location confirmed clear.",
    },
  ];
}

let stockReports: StockReport[] = buildSeedStockReports();
let stockReportCounter = 1043;

export async function wait(ms?: number): Promise<void> {
  const delay =
    ms ??
    API_DELAY_MS_MIN +
      Math.floor(Math.random() * (API_DELAY_MS_MAX - API_DELAY_MS_MIN + 1));
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

function inAisleRange(locationCode: string, filters: Filters): boolean {
  const parsed = parseLocation(locationCode);
  if (!parsed) return false;
  return parsed.aisle >= filters.aisleFrom && parsed.aisle <= filters.aisleTo;
}

function applyCycleCountOverrides(tasks: CycleCountTask[]): CycleCountTask[] {
  return tasks.map((task) => ({
    ...task,
    ...cycleCountOverrides.get(task.taskId),
  }));
}

function applyHoldOverrides(holds: StockHoldRecord[]): StockHoldRecord[] {
  return holds.map((hold) => ({
    ...hold,
    ...holdOverrides.get(hold.holdId),
  }));
}

function rebuildProcessedResults(filters: Filters): ProcessedResults {
  const snapshot = generateMockWarehouseData();
  const emptyRows = wmsEmptyToRows(snapshot.emptyLocations);
  const stockRows = wmsStockToRows(snapshot.stockOnHand);
  cachedProcessedResults = processLocations(emptyRows, stockRows, filters);
  cachedDefaultFilters = filters;
  return cachedProcessedResults;
}

function getProcessedResults(filters?: Filters): ProcessedResults {
  const activeFilters = filters ?? cachedDefaultFilters;
  if (
    !cachedProcessedResults ||
    activeFilters.aisleFrom !== cachedDefaultFilters.aisleFrom ||
    activeFilters.aisleTo !== cachedDefaultFilters.aisleTo
  ) {
    return rebuildProcessedResults(activeFilters);
  }
  return cachedProcessedResults;
}

function buildOccupiedConflicts(results: ProcessedResults): OccupiedConflict[] {
  const stockMap = buildStockRecordMap(generateMockWarehouseData().stockOnHand);

  return results.removedMatches.map((row) => {
    const stock = stockMap.get(row.normalizedLocation);
    return {
      locationCode: row.normalizedLocation,
      emptyFeedStatus: "EMPTY",
      stockPalletId: stock?.palletId ?? "—",
      stockClientCode: stock?.clientCode ?? "—",
      stockItemId: stock?.itemId ?? "—",
      detectedAt: lastSyncTime?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    };
  });
}

function buildValidationResult(filters?: Filters): EmptyLocationValidationResult {
  const results = getProcessedResults(filters);
  return {
    candidateEmptyCount: results.originalEmptyCount,
    occupiedConflictCount: results.removedMatches.length,
    validatedAvailableCount: results.finalTrueEmpty.length,
    candidateLocations: wmsEmptyToRows(generateMockWarehouseData().emptyLocations).filter(
      (row) => inAisleRange(row.normalizedLocation, filters ?? cachedDefaultFilters),
    ),
    occupiedConflicts: buildOccupiedConflicts(results),
    validatedAvailable: results.finalTrueEmpty,
    lastValidatedAt: lastSyncTime?.toISOString() ?? null,
  };
}

function inventoryMatchesQuery(record: StockOnHandRecord, query: string): InventoryLookupResult | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return null;

  const checks: [string, string | undefined][] = [
    ["itemId", record.itemId],
    ["palletId", record.palletId],
    ["lotNumber", record.lotNumber],
    ["clientCode", record.clientCode],
    ["productDescription", record.productDescription],
    ["binCode", record.binCode],
    ["clientName", record.clientName],
    ["receiptReference", record.receiptReference],
    ["outboundOrderReference", record.outboundOrderReference],
  ];

  for (const [field, value] of checks) {
    if (value && value.toLowerCase().includes(normalizedQuery)) {
      return { ...record, matchField: field };
    }
  }

  return null;
}

export async function fetchEmptyLocations(): Promise<WmsEmptyLocationRecord[]> {
  await wait();
  return generateMockWarehouseData().emptyLocations;
}

export async function fetchStockOnHand(): Promise<StockOnHandRecord[]> {
  await wait();
  return generateMockWarehouseData().stockOnHand;
}

export async function fetchLastSyncTime(): Promise<Date> {
  await wait();
  if (!lastSyncTime) {
    lastSyncTime = new Date();
  }
  return lastSyncTime;
}

export async function fetchLocationHistory(
  locationCode: string,
): Promise<LocationHistoryRecord[]> {
  await wait();
  return getMockLocationHistory(locationCode);
}

export async function fetchStockRecord(
  locationCode: string,
): Promise<StockOnHandRecord | null> {
  await wait();
  return getMockStockRecord(locationCode);
}

export async function fetchBinDetails(
  locationCode: string,
  stockRecords?: StockOnHandRecord[],
  results?: ProcessedResults | null,
  filters?: Filters,
): Promise<BinDetails | null> {
  await wait();
  const records = stockRecords ?? generateMockWarehouseData().stockOnHand;
  const processed = results ?? getProcessedResults(filters);
  return buildBinDetails({
    locationCode,
    results: processed,
    stockByLocation: buildStockRecordMap(records),
    stockLocationSet: buildStockLocationSet(records),
  });
}

export function markWmsSyncComplete(syncedAt: Date = new Date()): Date {
  lastSyncTime = syncedAt;
  resetMockWarehouseCache();
  cycleCountOverrides.clear();
  holdOverrides.clear();
  stockReports = buildSeedStockReports();
  stockReportCounter = 1043;
  cachedProcessedResults = null;
  return lastSyncTime;
}

export async function fetchBinVisibility(
  filters?: Filters,
): Promise<{ bins: BinLocation[]; summary: BinStatusSummary }> {
  await wait();
  const activeFilters = filters ?? cachedDefaultFilters;
  const snapshot = generateMockWarehouseData();
  const bins = snapshot.binMaster.filter((bin) =>
    inAisleRange(bin.locationCode, activeFilters),
  );

  const summary: BinStatusSummary = {
    available: bins.filter((bin) => bin.status === "empty").length,
    occupied: bins.filter((bin) => bin.status === "occupied").length,
    totalBins: bins.length,
  };

  return { bins, summary };
}

export async function fetchAisleBlueprint(aisle: number) {
  await wait();
  return buildAisleWalkPairs(aisle);
}

export async function fetchBinStatusSummary(
  filters?: Filters,
): Promise<BinStatusSummary> {
  const { summary } = await fetchBinVisibility(filters);
  return summary;
}

export async function searchInventory(
  query: string,
  filters?: Filters,
): Promise<InventoryLookupResult[]> {
  await wait();
  const activeFilters = filters ?? cachedDefaultFilters;
  const results: InventoryLookupResult[] = [];

  for (const record of generateMockWarehouseData().stockOnHand) {
    if (!inAisleRange(record.binCode, activeFilters)) continue;
    const match = inventoryMatchesQuery(record, query);
    if (match) results.push(match);
  }

  return results.slice(0, 50);
}

export async function searchLoadReferences(
  query: string,
  stockRecords?: StockOnHandRecord[],
) {
  await wait();
  const records = stockRecords ?? generateMockWarehouseData().stockOnHand;
  return matchLoadReferences(query, records);
}

export async function fetchInventoryByItemId(
  itemId: string,
  filters?: Filters,
): Promise<InventoryLookupResult[]> {
  return searchInventory(itemId, filters);
}

export async function fetchInventoryByPalletId(
  palletId: string,
  filters?: Filters,
): Promise<InventoryLookupResult[]> {
  return searchInventory(palletId, filters);
}

export async function lookupStockByPalletId(
  palletId: string,
  filters?: Filters,
): Promise<StockOnHandRecord | null> {
  await wait(200);
  const normalized = palletId.trim().toLowerCase();
  if (!normalized) return null;
  const activeFilters = filters ?? cachedDefaultFilters;

  const exact = generateMockWarehouseData().stockOnHand.find(
    (record) =>
      record.palletId.toLowerCase() === normalized &&
      inAisleRange(record.binCode, activeFilters),
  );
  return exact ?? null;
}

export async function lookupStockByItemAndLot(
  itemId: string,
  lotNumber: string,
  filters?: Filters,
): Promise<StockOnHandRecord[]> {
  await wait(250);
  const itemQuery = itemId.trim().toLowerCase();
  const lotQuery = lotNumber.trim().toLowerCase().replace(/^lot-/, "");
  if (!itemQuery || !lotQuery) return [];

  const activeFilters = filters ?? cachedDefaultFilters;
  return generateMockWarehouseData().stockOnHand.filter((record) => {
    if (!inAisleRange(record.binCode, activeFilters)) return false;
    const itemMatch =
      record.itemId.toLowerCase() === itemQuery ||
      record.itemId.toLowerCase().includes(itemQuery);
    const recordLot = record.lotNumber.toLowerCase().replace(/^lot-/, "");
    const lotMatch =
      recordLot === lotQuery || recordLot.includes(lotQuery);
    return itemMatch && lotMatch;
  });
}

export async function fetchInventoryByClientCode(
  clientCode: string,
  filters?: Filters,
): Promise<InventoryLookupResult[]> {
  return searchInventory(clientCode, filters);
}

export async function fetchInventoryByLocation(
  locationCode: string,
): Promise<InventoryLookupResult[]> {
  await wait();
  const normalized = normalizeLocation(locationCode);
  const record = getMockStockRecord(normalized);
  if (!record) return [];
  return [{ ...record, matchField: "binCode" }];
}

export async function fetchRecentLocationActivity(
  filters?: ModuleFilters,
): Promise<LocationHistoryRecord[]> {
  await wait();
  const activeFilters = filters ?? cachedDefaultFilters;
  const snapshot = generateMockWarehouseData();
  const records: LocationHistoryRecord[] = [];

  for (const [locationCode, history] of Object.entries(snapshot.locationHistory)) {
    if (!inAisleRange(locationCode, activeFilters)) continue;
    records.push(...history.slice(0, 1));
  }

  return records
    .sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    )
    .slice(0, 20);
}

export async function fetchPalletMovementHistory(
  palletId: string,
): Promise<LocationHistoryRecord[]> {
  await wait();
  const snapshot = generateMockWarehouseData();
  const existing = snapshot.palletHistory[palletId.toUpperCase()] ??
    snapshot.palletHistory[palletId];
  if (existing?.length) return existing;

  const stock = generateMockWarehouseData().stockOnHand.find(
    (record) => record.palletId.toLowerCase() === palletId.toLowerCase(),
  );
  if (!stock) return [];

  return getMockLocationHistory(stock.binCode).filter(
    (record) => record.palletId.toLowerCase() === palletId.toLowerCase(),
  );
}

export async function fetchCycleCountTasks(
  filters?: ModuleFilters,
): Promise<CycleCountTask[]> {
  await wait();
  const activeFilters = filters ?? cachedDefaultFilters;
  let tasks = applyCycleCountOverrides(getMockSnapshot().cycleCountTasks).filter(
    (task) => inAisleRange(task.locationCode, activeFilters),
  );

  if (filters?.status) {
    tasks = tasks.filter((task) => task.status === filters.status);
  }
  if (filters?.priority) {
    tasks = tasks.filter((task) => task.priority === filters.priority);
  }

  return tasks;
}

export async function fetchCycleCountTaskById(
  taskId: string,
): Promise<CycleCountTask | null> {
  await wait();
  const tasks = await fetchCycleCountTasks();
  return tasks.find((task) => task.taskId === taskId) ?? null;
}

export async function updateCycleCountTaskStatus(
  taskId: string,
  status: CycleCountStatus,
): Promise<CycleCountTask | null> {
  await wait();
  const task = getMockSnapshot().cycleCountTasks.find(
    (entry) => entry.taskId === taskId,
  );
  if (!task) return null;

  const patch: Partial<CycleCountTask> = { status };
  if (status === "In Progress") {
    patch.countedQty = null;
    patch.discrepancyQty = null;
    patch.countedBy = undefined;
    patch.countedAt = undefined;
  }
  if (status === "Counted") {
    patch.countedQty = task.expectedQty;
    patch.discrepancyQty = 0;
    patch.countedBy = demoUser.name;
    patch.countedAt = new Date().toISOString();
  }
  if (status === "Discrepancy") {
    patch.countedQty = task.expectedQty - task.expectedQty * 0.05;
    patch.discrepancyQty = (patch.countedQty ?? 0) - task.expectedQty;
    patch.notes = cycleCountVarianceNote(
      task.expectedQty,
      patch.countedQty ?? 0,
    );
    patch.countedBy = demoUser.name;
    patch.countedAt = new Date().toISOString();
  }
  if (status === "Resolved") {
    patch.resolvedBy = demoUser.name;
    patch.resolvedAt = new Date().toISOString();
  }

  cycleCountOverrides.set(taskId, {
    ...cycleCountOverrides.get(taskId),
    ...patch,
  });

  return fetchCycleCountTaskById(taskId);
}

export async function submitCycleCountResult(
  taskId: string,
  countedQty: number,
  note: string,
): Promise<CycleCountTask | null> {
  await wait();
  const task = getMockSnapshot().cycleCountTasks.find(
    (entry) => entry.taskId === taskId,
  );
  if (!task) return null;

  const discrepancyQty = countedQty - task.expectedQty;
  const status: CycleCountStatus =
    discrepancyQty === 0 ? "Counted" : "Discrepancy";

  cycleCountOverrides.set(taskId, {
    ...cycleCountOverrides.get(taskId),
    countedQty,
    discrepancyQty,
    status,
    countedBy: demoUser.name,
    countedAt: new Date().toISOString(),
    notes:
      note.trim() ||
      (discrepancyQty === 0
        ? "Investigation count matches expected — pending IC approval."
        : cycleCountVarianceNote(task.expectedQty, countedQty)),
  });

  return fetchCycleCountTaskById(taskId);
}

export async function approveInvestigationCount(
  taskId: string,
): Promise<CycleCountTask | null> {
  await wait();
  const task = getMockSnapshot().cycleCountTasks.find(
    (entry) => entry.taskId === taskId,
  );
  if (
    !task ||
    task.status !== "Counted" ||
    task.discrepancyQty !== 0 ||
    task.countedQty === null
  ) {
    return null;
  }

  cycleCountOverrides.set(taskId, {
    ...cycleCountOverrides.get(taskId),
    status: "Resolved",
    resolvedBy: demoUser.name,
    resolvedAt: new Date().toISOString(),
    notes: `${task.notes}\n\nCount approved — matches expected ${task.expectedQty} EA.`,
  });

  return fetchCycleCountTaskById(taskId);
}

export async function reviewCycleCountDiscrepancy(
  input: ReviewCycleCountDiscrepancyInput,
): Promise<CycleCountTask | null> {
  await wait();
  const task = getMockSnapshot().cycleCountTasks.find(
    (entry) => entry.taskId === input.taskId,
  );
  if (!task || task.status !== "Discrepancy") return null;

  const comment = input.comment.trim();
  if (!comment) return null;

  const resolutionLabel = resolutionTypeLabel(input.resolutionType);
  const outcomeLabel = discrepancyOutcomeLabel(input.outcome);
  const basePatch: Partial<CycleCountTask> = {
    discrepancyOutcome: input.outcome,
    resolutionType: input.resolutionType,
    resolutionNote: comment,
    resolvedBy: demoUser.name,
    resolvedAt: new Date().toISOString(),
  };

  if (input.outcome === "confirmed") {
    const signedVariance =
      input.reviewedVarianceEa ?? task.discrepancyQty ?? 0;

    cycleCountOverrides.set(input.taskId, {
      ...cycleCountOverrides.get(input.taskId),
      ...basePatch,
      status: "Resolved",
      reviewedVarianceEa: signedVariance,
      discrepancyQty: signedVariance,
      notes: `${task.notes}\n\n${outcomeLabel} · ${resolutionLabel}. ${comment}`,
    });
  } else {
    const correctedQty =
      input.correctedCountedQty ?? task.expectedQty;

    cycleCountOverrides.set(input.taskId, {
      ...cycleCountOverrides.get(input.taskId),
      ...basePatch,
      status: "Counted",
      countedQty: correctedQty,
      discrepancyQty: 0,
      notes: `${task.notes}\n\n${outcomeLabel} · ${resolutionLabel}. ${comment}`,
    });
  }

  return fetchCycleCountTaskById(input.taskId);
}

export async function fetchStockHolds(
  filters?: ModuleFilters,
): Promise<StockHoldRecord[]> {
  await wait();
  const activeFilters = filters ?? cachedDefaultFilters;
  let holds = applyHoldOverrides(getMockSnapshot().stockHolds).filter((hold) =>
    inAisleRange(hold.locationCode, activeFilters),
  );

  if (filters?.holdCode) {
    holds = holds.filter((hold) => hold.holdCode === filters.holdCode);
  }
  if (filters?.holdStatus) {
    holds = holds.filter((hold) => hold.holdStatus === filters.holdStatus);
  }

  return holds;
}

export async function fetchHoldByPalletId(
  palletId: string,
): Promise<StockHoldRecord | null> {
  await wait();
  const holds = await fetchStockHolds();
  return (
    holds.find(
      (hold) => hold.palletId.toLowerCase() === palletId.toLowerCase(),
    ) ?? null
  );
}

export async function requestHoldRelease(
  holdId: string,
  note: string,
): Promise<StockHoldRecord | null> {
  await wait();
  const hold = getMockSnapshot().stockHolds.find(
    (entry) => entry.holdId === holdId,
  );
  if (!hold) return null;

  holdOverrides.set(holdId, {
    ...holdOverrides.get(holdId),
    holdStatus: "Pending Release",
    holdReason: note || "Demo hold release request submitted.",
  });

  const holds = await fetchStockHolds();
  return holds.find((entry) => entry.holdId === holdId) ?? null;
}

export async function updateHoldStatus(
  holdId: string,
  status: HoldStatus,
): Promise<StockHoldRecord | null> {
  await wait();
  const hold = getMockSnapshot().stockHolds.find(
    (entry) => entry.holdId === holdId,
  );
  if (!hold) return null;

  holdOverrides.set(holdId, {
    ...holdOverrides.get(holdId),
    holdStatus: status,
  });

  const holds = await fetchStockHolds();
  return holds.find((entry) => entry.holdId === holdId) ?? null;
}

export async function fetchEmptyLocationValidation(
  filters?: Filters,
): Promise<EmptyLocationValidationResult> {
  await wait();
  return buildValidationResult(filters);
}

export async function validateEmptyLocations(
  filters?: Filters,
): Promise<EmptyLocationValidationResult> {
  await wait(500);
  lastSyncTime = new Date();
  rebuildProcessedResults(filters ?? cachedDefaultFilters);
  return buildValidationResult(filters);
}

export async function fetchOccupiedConflicts(
  filters?: Filters,
): Promise<OccupiedConflict[]> {
  await wait();
  return buildValidationResult(filters).occupiedConflicts;
}

export async function exportValidatedAvailableLocations(
  filters?: Filters,
): Promise<EmptyLocationValidationResult> {
  await wait();
  return buildValidationResult(filters);
}

export function syncProcessedResults(filters: Filters): ProcessedResults {
  return rebuildProcessedResults(filters);
}

export async function fetchStockReports(
  filters?: Filters,
): Promise<StockReport[]> {
  await wait();
  const activeFilters = filters ?? cachedDefaultFilters;
  return stockReports
    .filter((report) => inAisleRange(report.locationCode, activeFilters))
    .sort(
      (left, right) =>
        new Date(right.reportedAt).getTime() -
        new Date(left.reportedAt).getTime(),
    );
}

export async function createStockReport(
  input: StockReportInput,
): Promise<StockReport> {
  await wait();
  const report: StockReport = {
    reportId: `SR-${stockReportCounter++}`,
    locationCode: normalizeLocation(input.locationCode),
    reportType: input.reportType,
    note: input.note,
    reportedBy: input.reportedBy,
    reportedAt: new Date().toISOString(),
    palletId: input.palletId?.trim() || undefined,
    suspectedClient: input.suspectedClient?.trim() || undefined,
    suspectedItemId: input.suspectedItemId?.trim() || undefined,
    lotNumber: input.lotNumber?.trim() || undefined,
    productDescription: input.productDescription?.trim() || undefined,
    wmsBinCode: input.wmsBinCode?.trim() || undefined,
    reportQuantityScope: input.reportQuantityScope,
    reportedQuantity: input.reportedQuantity,
    reportedQuantityUom: input.reportedQuantityUom,
    status: "Open",
  };
  stockReports = [report, ...stockReports];
  return report;
}

export async function updateStockReportStatus(
  reportId: string,
  status: StockReportStatus,
  resolvedBy?: string,
  resolutionNote?: string,
): Promise<StockReport | null> {
  await wait();
  let updated: StockReport | null = null;
  stockReports = stockReports.map((report) => {
    if (report.reportId !== reportId) return report;
    const next: StockReport = { ...report, status };
    if (status === "Resolved") {
      next.resolvedBy = resolvedBy ?? "Inventory Control";
      next.resolvedAt = new Date().toISOString();
      next.resolutionNote =
        resolutionNote?.trim() || "Resolved by Inventory Control.";
    } else {
      next.resolvedBy = undefined;
      next.resolvedAt = undefined;
      next.resolutionNote = undefined;
    }
    updated = next;
    return next;
  });
  return updated;
}
