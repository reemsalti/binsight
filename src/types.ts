export type EmptyLocationRow = {
  locCode: string;
  normalizedLocation: string;
  original: Record<string, string>;
};

export type StockBinRow = {
  binCode: string;
  normalizedLocation: string;
  sheetName: string;
};

export type ProcessedResults = {
  originalEmptyCount: number;
  uniqueOccupiedCount: number;
  removedMatches: EmptyLocationRow[];
  finalTrueEmpty: EmptyLocationRow[];
};

export type Filters = {
  aisleFrom: number;
  aisleTo: number;
};

export type WarehouseModule =
  | "work-queue"
  | "bin-visibility"
  | "inventory-lookup"
  | "location-history"
  | "cycle-count"
  | "stock-holds"
  | "location-availability"
  | "stock-reports";

export type LoadReferenceKind = "receipt" | "order";

export type WorkQueueItemKind =
  | "report"
  | "hold"
  | "count"
  | "putaway"
  | "outbound";

export type WorkQueueNavigateTarget = {
  kind: WorkQueueItemKind;
  entityId: string;
  locationCode: string;
  loadReferenceKind?: LoadReferenceKind;
  loadReference?: string;
};

export function moduleForQueueItemKind(
  kind: WorkQueueItemKind,
): Extract<WarehouseModule, "stock-reports" | "stock-holds" | "cycle-count"> | null {
  switch (kind) {
    case "report":
      return "stock-reports";
    case "hold":
      return "stock-holds";
    case "count":
      return "cycle-count";
    case "putaway":
    case "outbound":
      return null;
  }
}

export type ParsedLocation = {
  aisle: number;
  bay: string;
  level: string;
  position: string;
  normalized: string;
};

export type BinStatus = "empty" | "occupied";

export type BinLocation = {
  locationCode: string;
  zone: "rack" | "instage" | "outstage";
  aisle: number;
  bay: string;
  level: string;
  position: string;
  dockDoor?: string;
  dockPosition?: string;
  status: BinStatus;
};

export type WmsEmptyLocationRecord = {
  locationCode: string;
  status: string;
  feed: string;
};

export type HoldCode =
  | "NONE"
  | "DAMAGED"
  | "QA"
  | "SUSP"
  | "EXP"
  | "RETAIN"
  | "RETURN"
  | "RECALL"
  | "QUAR"
  | "SHORT"
  | "MISSHIP"
  | "CUSTHOLD";

export type HoldStatus = "Active" | "Pending Release" | "Released" | "None";

export type StockOnHandRecord = {
  binCode: string;
  clientCode: string;
  clientName: string;
  itemId: string;
  productDescription: string;
  packageDetails: string;
  palletId: string;
  lotNumber: string;
  expiryDate: string;
  originalReceiptDate: string;
  quantityAvailable: number;
  quantityOnHand: number;
  quantityOnOrder: number;
  quantityOnReceipt: number;
  casesPerPallet: number;
  eachesPerCase: number;
  totalEaches: number;
  quantityBreakdown: string;
  unitWeight: number;
  unitWeightUom: string;
  caseWeight: number;
  caseWeightUom: string;
  palletNetWeight: number;
  palletNetWeightUom: string;
  palletTareWeight: number;
  palletTareWeightUom: string;
  palletGrossWeight: number;
  palletGrossWeightUom: string;
  weightBreakdown: string;
  holdCode: HoldCode;
  holdStatus: HoldStatus;
  holdReason: string;
  holdDate: string;
  holdReleasedBy: string;
  lastMovementDate: string;
  binStatus: string;
  /** Receiving dock staging — ASN / receipt reference. */
  receiptReference?: string;
  /** Shipping dock staging — outbound order reference. */
  outboundOrderReference?: string;
  /** Floor workflow label for dock staging slots. */
  stagingWorkflowLabel?: string;
};

/** @deprecated Use StockOnHandRecord */
export type WmsStockRecord = StockOnHandRecord;

export type InventoryLookupResult = StockOnHandRecord & {
  matchField: string;
};

export type LoadReferenceBreakdownLine = {
  locationCode: string;
  palletId: string;
  itemId: string;
  productDescription: string;
  lotNumber: string;
  quantityOnHand: number;
  packageDetails: string;
  clientCode: string;
};

export type LoadReferenceBreakdown = {
  kind: LoadReferenceKind;
  reference: string;
  clientCode: string;
  clientName: string;
  palletCount: number;
  totalQuantityEa: number;
  lines: LoadReferenceBreakdownLine[];
};

export type LocationHistoryRecord = {
  locationCode: string;
  date: string;
  action: string;
  operator: string;
  clientCode: string;
  clientName: string;
  itemId: string;
  productDescription: string;
  packageDetails: string;
  palletId: string;
  lotNumber: string;
  expiryDate: string;
  originalReceiptDate: string;
  quantityAvailable: number;
  quantityOnHand: number;
  quantityOnOrder: number;
  quantityOnReceipt: number;
  casesPerPallet: number;
  eachesPerCase: number;
  totalEaches: number;
  quantityBreakdown: string;
  weightBreakdown: string;
  note: string;
};

export type LocationHistoryAction =
  | "Picked"
  | "Moved Out"
  | "Replenished"
  | "Investigation Counted"
  | "Adjusted"
  | "Received"
  | "Relocated";

export type CycleCountStatus =
  | "Not Started"
  | "In Progress"
  | "Counted"
  | "Discrepancy"
  | "Resolved";

export type CycleCountDiscrepancyOutcome = "confirmed" | "dismissed";

export type CycleCountResolutionType =
  | "submit_for_investigation"
  | "request_adjustment"
  | "counting_error"
  | "recount_matches_expected"
  | "other";

export type CycleCountTask = {
  taskId: string;
  locationCode: string;
  aisle: number;
  bay: string;
  /** Floor associate assigned to perform the count. */
  assignedTo: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: CycleCountStatus;
  dueDate: string;
  clientCode: string;
  itemId: string;
  productDescription?: string;
  lotNumber?: string;
  palletId?: string;
  expectedQty: number;
  countedQty: number | null;
  discrepancyQty: number | null;
  /** Who submitted the physical count to WMS. */
  countedBy?: string;
  countedAt?: string;
  /** Set when a picker completes an order pick at this location. */
  pickOrderId?: string;
  pickedBy?: string;
  pickedAt?: string;
  /** Who closed out a discrepancy (Inventory Control). */
  resolvedBy?: string;
  resolvedAt?: string;
  /** IC review: variance upheld vs dismissed as not real. */
  discrepancyOutcome?: CycleCountDiscrepancyOutcome;
  resolutionType?: CycleCountResolutionType;
  resolutionNote?: string;
  /** EA variance upheld on confirm (+ over, − short). */
  reviewedVarianceEa?: number;
  notes: string;
};

export type ReviewCycleCountDiscrepancyInput = {
  taskId: string;
  outcome: CycleCountDiscrepancyOutcome;
  resolutionType: CycleCountResolutionType;
  comment: string;
  reviewedVarianceEa?: number;
  correctedCountedQty?: number;
};

export type StockHoldRecord = {
  holdId: string;
  locationCode: string;
  palletId: string;
  clientCode: string;
  clientName: string;
  itemId: string;
  productDescription: string;
  lotNumber: string;
  holdCode: HoldCode;
  holdStatus: HoldStatus;
  holdReason: string;
  holdDate: string;
  requestedBy: string;
  quantityOnHold: number;
};

export type OccupiedConflict = {
  locationCode: string;
  emptyFeedStatus: string;
  stockPalletId: string;
  stockClientCode: string;
  stockItemId: string;
  detectedAt: string;
};

export type EmptyLocationValidationResult = {
  candidateEmptyCount: number;
  occupiedConflictCount: number;
  validatedAvailableCount: number;
  candidateLocations: EmptyLocationRow[];
  occupiedConflicts: OccupiedConflict[];
  validatedAvailable: EmptyLocationRow[];
  lastValidatedAt: string | null;
};

export type BinStatusSummary = {
  available: number;
  occupied: number;
  totalBins: number;
};

export type StockReportType =
  | "Stock in empty location"
  | "Misplaced pallet"
  | "Wrong item in location"
  | "Damaged product found"
  | "Expected stock not found"
  | "Other";

export type StockReportStatus = "Open" | "Under Review" | "Resolved";

export type StockReportQuantityScope = "full" | "partial";

export type StockReportQuantityUom = "CASE" | "EA";

export type StockReport = {
  reportId: string;
  locationCode: string;
  reportType: StockReportType;
  note: string;
  reportedBy: string;
  reportedAt: string;
  palletId?: string;
  suspectedClient?: string;
  /** WMS client code when known (e.g. LOREALCA). */
  clientCode?: string;
  suspectedItemId?: string;
  lotNumber?: string;
  productDescription?: string;
  wmsBinCode?: string;
  reportQuantityScope?: StockReportQuantityScope;
  reportedQuantity?: number;
  reportedQuantityUom?: StockReportQuantityUom;
  status: StockReportStatus;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
};

export type StockReportInput = {
  locationCode: string;
  reportType: StockReportType;
  note: string;
  reportedBy: string;
  palletId?: string;
  suspectedClient?: string;
  /** WMS client code when known (e.g. LOREALCA). */
  clientCode?: string;
  suspectedItemId?: string;
  lotNumber?: string;
  productDescription?: string;
  wmsBinCode?: string;
  reportQuantityScope?: StockReportQuantityScope;
  reportedQuantity?: number;
  reportedQuantityUom?: StockReportQuantityUom;
};

export type BinDetails = {
  locationCode: string;
  zone: "rack" | "instage" | "outstage";
  status: BinStatus;
  statusLabel: string;
  /** True when WMS empty-location feed lists this bin as available. */
  inWmsAvailableFeed: boolean;
  aisle?: number;
  bay?: string;
  level?: string;
  position?: string;
  dockDoor?: string;
  dockPosition?: string;
  stagingWorkflowLabel?: string;
  receiptReference?: string;
  outboundOrderReference?: string;
  stock?: StockOnHandRecord;
};

export type ModuleFilters = Filters & {
  status?: string;
  priority?: string;
  holdCode?: HoldCode;
  holdStatus?: HoldStatus;
  query?: string;
};
