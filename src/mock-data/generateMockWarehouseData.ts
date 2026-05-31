import type {
  BinLocation,
  CycleCountStatus,
  CycleCountTask,
  HoldCode,
  HoldStatus,
  LocationHistoryAction,
  LocationHistoryRecord,
  StockHoldRecord,
  StockOnHandRecord,
  WmsEmptyLocationRecord,
} from "../types";
import { cycleCountVarianceNote } from "../utils/cycleCountVariance";
import {
  assignChronologicalPalletIds,
  fallbackDemoPalletId,
  formatDemoItemId,
  getDemoClientIndex,
} from "./palletLabels";
import { buildPalletQuantityBreakdown } from "../utils/palletBreakdown";
import { normalizeLocation, parseLocation } from "../utils/location";
import {
  STAGING_DOCK_COUNT,
  STAGING_MAX_PALLETS_PER_DOOR,
  formatInstageLocation,
  formatOutstageLocation,
  parseStagingLocation,
} from "../utils/stagingLocations";
import {
  WAREHOUSE_AISLE_MAX,
  WAREHOUSE_AISLE_MIN,
  WAREHOUSE_BAY_COUNT,
  WAREHOUSE_LEVELS,
  WAREHOUSE_POSITIONS,
  formatWarehouseLocation,
} from "../utils/location";

export type MockWarehouseSnapshot = {
  emptyLocations: WmsEmptyLocationRecord[];
  stockOnHand: StockOnHandRecord[];
  locationHistory: Record<string, LocationHistoryRecord[]>;
  palletHistory: Record<string, LocationHistoryRecord[]>;
  binMaster: BinLocation[];
  cycleCountTasks: CycleCountTask[];
  stockHolds: StockHoldRecord[];
};

type DemoProduct = {
  productDescription: string;
  packageDetails: string;
  netWeightPerCaseKg: number;
  unitWeight: number;
  unitWeightUom: string;
};

const DEMO_CLIENTS: {
  clientCode: string;
  clientName: string;
  /** Two-letter prefix on item master IDs (e.g. LO10001). */
  itemCodePrefix: string;
  products: DemoProduct[];
}[] = [
  {
    clientCode: "LOREALCA",
    clientName: "L'Oréal",
    itemCodePrefix: "LO",
    products: [
      {
        productDescription: "Shampoo Hydrating 750ML",
        packageDetails: "12 EA/CASE",
        netWeightPerCaseKg: 9.6,
        unitWeight: 750,
        unitWeightUom: "ML",
      },
      {
        productDescription: "Facial Cleanser 150ML",
        packageDetails: "24 EA/CASE",
        netWeightPerCaseKg: 4.2,
        unitWeight: 150,
        unitWeightUom: "ML",
      },
      {
        productDescription: "Body Lotion Pump 500ML",
        packageDetails: "12 EA/CASE",
        netWeightPerCaseKg: 6.8,
        unitWeight: 500,
        unitWeightUom: "ML",
      },
      {
        productDescription: "Hair Treatment Jar 250ML",
        packageDetails: "24 EA/CASE",
        netWeightPerCaseKg: 5.1,
        unitWeight: 250,
        unitWeightUom: "ML",
      },
      {
        productDescription: "Conditioner Repair 750ML",
        packageDetails: "12 EA/CASE",
        netWeightPerCaseKg: 9.4,
        unitWeight: 750,
        unitWeightUom: "ML",
      },
    ],
  },
  {
    clientCode: "LEGOTOYS",
    clientName: "LEGO",
    itemCodePrefix: "LE",
    products: [
      {
        productDescription: "Classic Brick Box 484PC",
        packageDetails: "6 EA/CASE",
        netWeightPerCaseKg: 7.5,
        unitWeight: 484,
        unitWeightUom: "PC",
      },
      {
        productDescription: "Mini Figure Blind Bag",
        packageDetails: "36 EA/CTN",
        netWeightPerCaseKg: 1.8,
        unitWeight: 1,
        unitWeightUom: "PC",
      },
      {
        productDescription: "Creative Play Set 900PC",
        packageDetails: "4 EA/CASE",
        netWeightPerCaseKg: 11.2,
        unitWeight: 900,
        unitWeightUom: "PC",
      },
      {
        productDescription: "Toy Vehicle Pack 3PC",
        packageDetails: "8 EA/CASE",
        netWeightPerCaseKg: 3.6,
        unitWeight: 3,
        unitWeightUom: "PC",
      },
      {
        productDescription: "Building Blocks Starter 250PC",
        packageDetails: "12 EA/CASE",
        netWeightPerCaseKg: 4.9,
        unitWeight: 250,
        unitWeightUom: "PC",
      },
    ],
  },
  {
    clientCode: "KELLOGGS",
    clientName: "Kellogg's",
    itemCodePrefix: "KE",
    products: [
      {
        productDescription: "Granola Bar Choc Chip 35G",
        packageDetails: "6 EA/PK, 12 PK/CASE",
        netWeightPerCaseKg: 2.8,
        unitWeight: 35,
        unitWeightUom: "G",
      },
      {
        productDescription: "Cereal Cup Variety 45G",
        packageDetails: "8 EA/CASE",
        netWeightPerCaseKg: 1.9,
        unitWeight: 45,
        unitWeightUom: "G",
      },
      {
        productDescription: "Breakfast Bar Strawberry 37G",
        packageDetails: "6 EA/PK, 12 PK/CASE",
        netWeightPerCaseKg: 2.7,
        unitWeight: 37,
        unitWeightUom: "G",
      },
      {
        productDescription: "Cracker Sleeve Original 150G",
        packageDetails: "24 EA/CASE",
        netWeightPerCaseKg: 3.4,
        unitWeight: 150,
        unitWeightUom: "G",
      },
      {
        productDescription: "Snack Mix Carton 28G",
        packageDetails: "10 EA/PK, 8 PK/CASE",
        netWeightPerCaseKg: 2.2,
        unitWeight: 28,
        unitWeightUom: "G",
      },
    ],
  },
];

const HISTORY_ACTIONS: LocationHistoryAction[] = [
  "Picked",
  "Moved Out",
  "Replenished",
  "Investigation Counted",
  "Adjusted",
  "Received",
  "Relocated",
];

const CYCLE_COUNT_ASSIGNEES = [
  "Reem A.",
  "Carlos M.",
  "Priya S.",
  "Jordan T.",
  "Warehouse Team B",
];

const PICKER_NAMES = [
  "Carlos M.",
  "Priya S.",
  "Jordan T.",
  "M. Diaz",
  "T. Okafor",
];

const RECEIVING_OPERATORS = [
  "Jordan T.",
  "M. Diaz",
  "Priya S.",
  "Warehouse Team B",
  "Reem A.",
];

function pickHistoryOperator(
  action: LocationHistoryAction,
  seed: number,
): string {
  const pool =
    action === "Picked" || action === "Replenished"
      ? PICKER_NAMES
      : action === "Received" || action === "Relocated" || action === "Moved Out"
        ? RECEIVING_OPERATORS
        : action === "Investigation Counted" || action === "Adjusted"
          ? CYCLE_COUNT_ASSIGNEES
          : [...PICKER_NAMES, ...CYCLE_COUNT_ASSIGNEES, ...RECEIVING_OPERATORS];
  return pool[Math.abs(seed) % pool.length];
}

const HOLD_CODES: HoldCode[] = [
  "DAMAGED",
  "QA",
  "SUSP",
  "EXP",
  "RETAIN",
  "RETURN",
  "RECALL",
  "QUAR",
  "SHORT",
  "MISSHIP",
  "CUSTHOLD",
];

const HOLD_REASONS: Record<HoldCode, string> = {
  NONE: "",
  DAMAGED: "Carton crush observed during putaway inspection.",
  QA: "Pending QA sample release from inbound inspection.",
  SUSP: "Inventory suspended pending supervisor review.",
  EXP: "Expiry date within hold threshold window.",
  RETAIN: "Retained for client-directed inspection hold.",
  RETURN: "Return merchandise awaiting disposition.",
  RECALL: "Client recall notification — do not allocate.",
  QUAR: "Quarantine hold for suspected contamination.",
  SHORT: "Short count variance pending reconciliation.",
  MISSHIP: "Mis-shipment investigation in progress.",
  CUSTHOLD: "Customer-directed allocation block.",
};

const PALLET_BREAKDOWN_PRESETS = [
  { casesPerPallet: 24, eachesPerCase: 6 },
  { casesPerPallet: 36, eachesPerCase: 12 },
  { casesPerPallet: 48, eachesPerCase: 24 },
  { casesPerPallet: 48, eachesPerCase: 12 },
] as const;

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function enumerateAllLocations(): string[] {
  const locations: string[] = [];
  for (let aisle = WAREHOUSE_AISLE_MIN; aisle <= WAREHOUSE_AISLE_MAX; aisle += 1) {
    for (let bay = 1; bay <= WAREHOUSE_BAY_COUNT; bay += 1) {
      for (const level of WAREHOUSE_LEVELS) {
        for (const position of WAREHOUSE_POSITIONS) {
          locations.push(
            formatWarehouseLocation(aisle, bay, level, position),
          );
        }
      }
    }
  }
  return locations;
}

function formatDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(daysOffset: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

const CLIENT_ITEM_CODE_PREFIX: Record<string, string> = Object.fromEntries(
  DEMO_CLIENTS.map((client) => [client.clientCode, client.itemCodePrefix]),
);

const CLIENT_PRODUCT_COUNT: Record<string, number> = Object.fromEntries(
  DEMO_CLIENTS.map((client) => [client.clientCode, client.products.length]),
);

function pickClient(index: number) {
  return DEMO_CLIENTS[index % DEMO_CLIENTS.length];
}

function pickItemIndex(index: number, productCount: number): number {
  return index % productCount;
}

function pickPalletBreakdown(index: number, netWeightPerCaseKg: number) {
  const preset = PALLET_BREAKDOWN_PRESETS[index % PALLET_BREAKDOWN_PRESETS.length];
  const tareWeightKg = 18 + (index % 7);
  return buildPalletQuantityBreakdown(
    preset.casesPerPallet,
    preset.eachesPerCase,
    netWeightPerCaseKg,
    tareWeightKg,
  );
}

function applyWeightFields(
  record: Omit<
    StockOnHandRecord,
    | "unitWeight"
    | "unitWeightUom"
    | "caseWeight"
    | "caseWeightUom"
    | "palletNetWeight"
    | "palletNetWeightUom"
    | "palletTareWeight"
    | "palletTareWeightUom"
    | "palletGrossWeight"
    | "palletGrossWeightUom"
    | "holdCode"
    | "holdStatus"
    | "holdReason"
    | "holdDate"
    | "holdReleasedBy"
  >,
  product: DemoProduct,
  tareWeightKg: number,
): StockOnHandRecord {
  const palletNet = roundWeight(record.casesPerPallet * product.netWeightPerCaseKg);
  const palletGross = roundWeight(palletNet + tareWeightKg);

  return {
    ...record,
    unitWeight: product.unitWeight,
    unitWeightUom: product.unitWeightUom,
    caseWeight: product.netWeightPerCaseKg,
    caseWeightUom: "KG",
    palletNetWeight: palletNet,
    palletNetWeightUom: "KG",
    palletTareWeight: tareWeightKg,
    palletTareWeightUom: "KG",
    palletGrossWeight: palletGross,
    palletGrossWeightUom: "KG",
    holdCode: "NONE",
    holdStatus: "None",
    holdReason: "",
    holdDate: "",
    holdReleasedBy: "",
  };
}

export function buildFallbackStockRecord(
  binCode: string,
  index = hashString(binCode),
): StockOnHandRecord {
  const normalized = normalizeLocation(binCode);
  const staging = parseStagingLocation(normalized);

  const client = pickClient(index);
  const itemIndex = pickItemIndex(index, client.products.length);
  const product = client.products[itemIndex] ?? client.products[0];
  const clientIndex = getDemoClientIndex(client.clientCode);
  const palletBreakdown = pickPalletBreakdown(index, product.netWeightPerCaseKg);
  const tareWeightKg = 18 + (index % 7);

  if (staging) {
    const isInstage = staging.zone === "instage";
    const onReceipt = isInstage ? palletBreakdown.totalEaches : 0;
    const onOrder = isInstage ? 0 : palletBreakdown.totalEaches;
    const available = isInstage ? 0 : Math.max(0, palletBreakdown.totalEaches - (index % 3) * palletBreakdown.eachesPerCase);

    const base = {
      binCode: normalized,
      clientCode: client.clientCode,
      clientName: client.clientName,
      itemId: formatDemoItemId(client.itemCodePrefix, itemIndex),
      productDescription: product.productDescription,
      packageDetails: product.packageDetails,
      palletId: fallbackDemoPalletId(clientIndex, itemIndex, normalized),
      lotNumber: String(240000 + (index % 999)).padStart(6, "0"),
      expiryDate: formatDate(120 + (index % 240)),
      originalReceiptDate: formatDate(-(2 + (index % 5))),
      quantityAvailable: available,
      quantityOnHand: palletBreakdown.totalEaches,
      quantityOnOrder: onOrder,
      quantityOnReceipt: onReceipt,
      casesPerPallet: palletBreakdown.casesPerPallet,
      eachesPerCase: palletBreakdown.eachesPerCase,
      totalEaches: palletBreakdown.totalEaches,
      quantityBreakdown: palletBreakdown.quantityBreakdown,
      weightBreakdown: palletBreakdown.weightBreakdown,
      lastMovementDate: formatDate(-(index % 3)),
      binStatus: isInstage ? "Awaiting putaway" : "Staged for load",
      receiptReference: isInstage
        ? `RCV-${String(24000 + (index % 120)).padStart(5, "0")}`
        : undefined,
      outboundOrderReference: isInstage
        ? undefined
        : `ORD-${String(48000 + (index % 200)).padStart(5, "0")}`,
      stagingWorkflowLabel: isInstage
        ? index % 3 === 0
          ? "Awaiting putaway"
          : "Unload complete · scan to rack"
        : index % 3 === 0
          ? "Pick complete · staged for load"
          : "Awaiting dispatch trailer",
    };

    return applyWeightFields(base, product, tareWeightKg);
  }

  const onOrder = index % 4;
  const onReceipt = index % 3;
  const available = Math.max(
    0,
    palletBreakdown.totalEaches - (index % 5) * palletBreakdown.eachesPerCase,
  );

  const base = {
    binCode: normalized,
    clientCode: client.clientCode,
    clientName: client.clientName,
    itemId: formatDemoItemId(client.itemCodePrefix, itemIndex),
    productDescription: product.productDescription,
    packageDetails: product.packageDetails,
    palletId: fallbackDemoPalletId(clientIndex, itemIndex, normalized),
    lotNumber: String(240000 + (index % 999)).padStart(6, "0"),
    expiryDate: formatDate(120 + (index % 240)),
    originalReceiptDate: formatDate(-(30 + (index % 180))),
    quantityAvailable: available,
    quantityOnHand: palletBreakdown.totalEaches,
    quantityOnOrder: onOrder,
    quantityOnReceipt: onReceipt,
    casesPerPallet: palletBreakdown.casesPerPallet,
    eachesPerCase: palletBreakdown.eachesPerCase,
    totalEaches: palletBreakdown.totalEaches,
    quantityBreakdown: palletBreakdown.quantityBreakdown,
    weightBreakdown: palletBreakdown.weightBreakdown,
    lastMovementDate: formatDate(-(index % 21)),
    binStatus: available > 0 ? "Available" : "Reserved",
  };

  return applyWeightFields(base, product, tareWeightKg);
}

function buildStockRecord(
  binCode: string,
  index: number,
  random: () => number,
): StockOnHandRecord {
  const record = buildFallbackStockRecord(binCode, index);
  const partialCaseOffset = Math.floor(random() * record.eachesPerCase);
  const quantityOnHand = Math.max(
    record.eachesPerCase,
    record.totalEaches - partialCaseOffset,
  );
  const quantityAvailable = Math.max(
    0,
    quantityOnHand - Math.floor(random() * record.eachesPerCase),
  );

  return {
    ...record,
    quantityOnHand,
    quantityAvailable,
    binStatus: random() > 0.15 ? "Available" : "Reserved",
  };
}

function buildHistoryRecord(
  locationCode: string,
  action: LocationHistoryAction,
  daysAgo: number,
  stock: StockOnHandRecord,
  note: string,
): LocationHistoryRecord {
  const operator = pickHistoryOperator(
    action,
    hashString(`${locationCode}:${action}:${daysAgo}:${stock.palletId}`),
  );

  return {
    locationCode,
    date: formatDate(-daysAgo),
    action,
    operator,
    clientCode: stock.clientCode,
    clientName: stock.clientName,
    itemId: stock.itemId,
    productDescription: stock.productDescription,
    packageDetails: stock.packageDetails,
    palletId: stock.palletId,
    lotNumber: stock.lotNumber,
    expiryDate: stock.expiryDate,
    originalReceiptDate: stock.originalReceiptDate,
    quantityAvailable: stock.quantityAvailable,
    quantityOnHand: stock.quantityOnHand,
    quantityOnOrder: stock.quantityOnOrder,
    quantityOnReceipt: stock.quantityOnReceipt,
    casesPerPallet: stock.casesPerPallet,
    eachesPerCase: stock.eachesPerCase,
    totalEaches: stock.totalEaches,
    quantityBreakdown: stock.quantityBreakdown,
    weightBreakdown: stock.weightBreakdown,
    note,
  };
}

function generateStagingPalletJourneyHistory(
  stock: StockOnHandRecord,
  random: () => number,
): LocationHistoryRecord[] {
  const staging = parseStagingLocation(stock.binCode);
  if (!staging) return [];

  const records: LocationHistoryRecord[] = [];
  const aisle =
    WAREHOUSE_AISLE_MIN +
    Math.floor(random() * (WAREHOUSE_AISLE_MAX - WAREHOUSE_AISLE_MIN + 1));
  const rackLocation = formatWarehouseLocation(
    aisle,
    1 + Math.floor(random() * WAREHOUSE_BAY_COUNT),
    WAREHOUSE_LEVELS[Math.floor(random() * WAREHOUSE_LEVELS.length)],
    String(
      WAREHOUSE_POSITIONS[
        Math.floor(random() * WAREHOUSE_POSITIONS.length)
      ],
    ),
  );
  const priorInstage = formatInstageLocation(
    1 + Math.floor(random() * STAGING_DOCK_COUNT),
    1 + Math.floor(random() * STAGING_MAX_PALLETS_PER_DOOR),
  );

  if (staging.zone === "instage") {
    records.push(
      buildHistoryRecord(
        priorInstage,
        "Received",
        6 + Math.floor(random() * 2),
        stock,
        `Inbound trailer unload · ${stock.receiptReference ?? "RCV"} at prior door scan.`,
      ),
    );
    records.push(
      buildHistoryRecord(
        stock.binCode,
        "Relocated",
        4 + Math.floor(random() * 2),
        stock,
        "Moved on instage floor to current door position.",
      ),
    );
    records.push(
      buildHistoryRecord(
        stock.binCode,
        "Received",
        2,
        stock,
        `Receipt scan confirmed · ${stock.receiptReference ?? "RCV"}.`,
      ),
    );
    if (random() > 0.4) {
      records.push(
        buildHistoryRecord(
          stock.binCode,
          "Investigation Counted",
          1,
          stock,
          "Floor count at instage — quantity confirmed before putaway.",
        ),
      );
    }
  } else {
    records.push(
      buildHistoryRecord(
        priorInstage,
        "Received",
        16 + Math.floor(random() * 4),
        stock,
        `Inbound receipt · ${stock.receiptReference ?? "RCV"}.`,
      ),
    );
    records.push(
      buildHistoryRecord(
        rackLocation,
        "Relocated",
        12 + Math.floor(random() * 3),
        stock,
        "Putaway confirmed from instage to rack storage.",
      ),
    );
    records.push(
      buildHistoryRecord(
        rackLocation,
        "Replenished",
        7 + Math.floor(random() * 2),
        stock,
        `Pick allocation for ${stock.outboundOrderReference ?? "order"}.`,
      ),
    );
    records.push(
      buildHistoryRecord(
        stock.binCode,
        "Replenished",
        3,
        stock,
        `Staged at ${stock.binCode} for outbound load.`,
      ),
    );
    records.push(
      buildHistoryRecord(
        stock.binCode,
        "Picked",
        1,
        stock,
        `Pick confirmed · ${stock.outboundOrderReference ?? "order"}.`,
      ),
    );
  }

  return records.sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
}

function generateHistoryForLocation(
  locationCode: string,
  stock: StockOnHandRecord | null,
  random: () => number,
  isCurrentlyEmpty: boolean,
): LocationHistoryRecord[] {
  const staging = parseStagingLocation(locationCode);
  const pastStock =
    stock ?? buildFallbackStockRecord(locationCode, hashString(locationCode));
  const records: LocationHistoryRecord[] = [];

  if (staging) {
    if (stock) {
      const journey = generateStagingPalletJourneyHistory(stock, random);
      return journey.sort(
        (left, right) =>
          new Date(right.date).getTime() - new Date(left.date).getTime(),
      );
    }

    records.push(
      buildHistoryRecord(
        locationCode,
        "Moved Out",
        6,
        pastStock,
        "Prior staging activity before slot cleared.",
      ),
    );

    return records.sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
  }

  const recordCount = 2 + Math.floor(random() * 3);

  for (let index = 0; index < recordCount; index += 1) {
    const action =
      HISTORY_ACTIONS[Math.floor(random() * HISTORY_ACTIONS.length)];
    const daysAgo = 10 + index * 18 + Math.floor(random() * 10);
    records.push(
      buildHistoryRecord(
        locationCode,
        action,
        daysAgo,
        pastStock,
        isCurrentlyEmpty
          ? `Prior bin transaction before current available status (${action}).`
          : `WMS transaction posted (${action}).`,
      ),
    );
  }

  return records.sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

function buildBinMaster(
  allLocations: string[],
  emptySet: Set<string>,
  stockSet: Set<string>,
  overlapSet: Set<string>,
): BinLocation[] {
  return allLocations.map((locationCode) => {
    const staging = parseStagingLocation(locationCode);
    let status: BinLocation["status"] = "empty";
    if (overlapSet.has(locationCode) || stockSet.has(locationCode)) {
      status = "occupied";
    }

    if (staging) {
      return {
        locationCode,
        zone: staging.zone,
        aisle: 0,
        bay: staging.dockDoor,
        level: staging.zone === "instage" ? "IN" : "OUT",
        position: staging.position,
        dockDoor: staging.dockDoor,
        dockPosition: staging.position,
        status,
      };
    }

    const parsed = parseLocation(locationCode)!;
    return {
      locationCode,
      zone: "rack",
      aisle: parsed.aisle,
      bay: parsed.bay,
      level: parsed.level,
      position: parsed.position,
      status,
    };
  });
}

type DemoClient = (typeof DEMO_CLIENTS)[number];

function buildStagingStockRecord(
  binCode: string,
  index: number,
  random: () => number,
  client: DemoClient,
  zone: "instage" | "outstage",
  loadReference: string,
  itemIndexOffset: number,
): StockOnHandRecord {
  const itemIndex = itemIndexOffset % client.products.length;
  const product = client.products[itemIndex] ?? client.products[0];
  const clientIndex = getDemoClientIndex(client.clientCode);
  const palletBreakdown = pickPalletBreakdown(index, product.netWeightPerCaseKg);
  const tareWeightKg = 18 + (index % 7);
  const isInstage = zone === "instage";
  const onReceipt = isInstage ? palletBreakdown.totalEaches : 0;
  const onOrder = isInstage ? 0 : palletBreakdown.totalEaches;
  const available = isInstage
    ? 0
    : Math.max(
        0,
        palletBreakdown.totalEaches -
          (itemIndexOffset % 3) * palletBreakdown.eachesPerCase,
      );

  const base = {
    binCode,
    clientCode: client.clientCode,
    clientName: client.clientName,
    itemId: formatDemoItemId(client.itemCodePrefix, itemIndex),
    productDescription: product.productDescription,
    packageDetails: product.packageDetails,
    palletId: fallbackDemoPalletId(clientIndex, itemIndex, binCode),
    lotNumber: String(240000 + (index % 999)).padStart(6, "0"),
    expiryDate: formatDate(120 + (index % 240)),
    originalReceiptDate: formatDate(-(2 + (index % 5))),
    quantityAvailable: available,
    quantityOnHand: palletBreakdown.totalEaches,
    quantityOnOrder: onOrder,
    quantityOnReceipt: onReceipt,
    casesPerPallet: palletBreakdown.casesPerPallet,
    eachesPerCase: palletBreakdown.eachesPerCase,
    totalEaches: palletBreakdown.totalEaches,
    quantityBreakdown: palletBreakdown.quantityBreakdown,
    weightBreakdown: palletBreakdown.weightBreakdown,
    lastMovementDate: formatDate(-(index % 3)),
    binStatus: isInstage ? "Awaiting putaway" : "Staged for load",
    receiptReference: isInstage ? loadReference : undefined,
    outboundOrderReference: isInstage ? undefined : loadReference,
    stagingWorkflowLabel: isInstage
      ? itemIndexOffset % 3 === 0
        ? "Awaiting putaway"
        : "Unload complete · scan to rack"
      : itemIndexOffset % 3 === 0
        ? "Pick complete · staged for load"
        : "Awaiting dispatch trailer",
  };

  const record = applyWeightFields(base, product, tareWeightKg);
  const partialCaseOffset = Math.floor(random() * record.eachesPerCase);
  const quantityOnHand = Math.max(
    record.eachesPerCase,
    record.totalEaches - partialCaseOffset,
  );

  return {
    ...record,
    quantityOnHand,
    quantityAvailable: isInstage
      ? 0
      : Math.max(0, quantityOnHand - Math.floor(random() * record.eachesPerCase)),
  };
}

function buildStagingStockForZone(
  zone: "instage" | "outstage",
  random: () => number,
  startIndex: number,
): { stock: StockOnHandRecord[]; occupied: string[]; nextIndex: number } {
  const stock: StockOnHandRecord[] = [];
  const occupied: string[] = [];
  let index = startIndex;

  for (let dock = 1; dock <= STAGING_DOCK_COUNT; dock += 1) {
    if (random() < 0.15) continue;

    const client = DEMO_CLIENTS[Math.floor(random() * DEMO_CLIENTS.length)];
    const palletCount = 1 + Math.floor(random() * STAGING_MAX_PALLETS_PER_DOOR);
    const loadReference =
      zone === "instage"
        ? `RCV-${String(24000 + dock * 10 + Math.floor(random() * 9)).padStart(5, "0")}`
        : `ORD-${String(48000 + dock * 10 + Math.floor(random() * 9)).padStart(5, "0")}`;

    for (let position = 1; position <= palletCount; position += 1) {
      const binCode =
        zone === "instage"
          ? formatInstageLocation(dock, position)
          : formatOutstageLocation(dock, position);
      occupied.push(binCode);
      stock.push(
        buildStagingStockRecord(
          binCode,
          index,
          random,
          client,
          zone,
          loadReference,
          position - 1,
        ),
      );
      index += 1;
    }
  }

  return { stock, occupied, nextIndex: index };
}

function buildStagingStock(
  random: () => number,
): { stock: StockOnHandRecord[]; occupied: string[] } {
  const instage = buildStagingStockForZone("instage", random, 9000);
  const outstage = buildStagingStockForZone("outstage", random, instage.nextIndex);

  return {
    stock: [...instage.stock, ...outstage.stock],
    occupied: [...instage.occupied, ...outstage.occupied],
  };
}

function buildCycleCountTasks(
  stockOnHand: StockOnHandRecord[],
  random: () => number,
): CycleCountTask[] {
  const shuffled = shuffle(stockOnHand, random);
  const pickTriggered = shuffled.slice(0, 30);
  const postCount = shuffled.slice(30, 56);
  const priorities: CycleCountTask["priority"][] = [
    "Low",
    "Medium",
    "High",
    "Critical",
  ];

  const openTasks = pickTriggered.map((stock, index) => {
    const parsed = parseLocation(stock.binCode)!;
    const status: CycleCountStatus =
      index % 4 === 0 ? "In Progress" : "Not Started";
    const assignee = CYCLE_COUNT_ASSIGNEES[index % CYCLE_COUNT_ASSIGNEES.length];
    const picker = PICKER_NAMES[index % PICKER_NAMES.length];

    return {
      taskId: `INV-${String(10001 + index).padStart(5, "0")}`,
      locationCode: stock.binCode,
      aisle: parsed.aisle,
      bay: parsed.bay,
      assignedTo: assignee,
      priority: priorities[index % priorities.length],
      status,
      dueDate: formatDate(index % 5),
      clientCode: stock.clientCode,
      itemId: stock.itemId,
      productDescription: stock.productDescription,
      lotNumber: stock.lotNumber,
      palletId: stock.palletId,
      expectedQty: stock.quantityOnHand,
      countedQty: null,
      discrepancyQty: null,
      pickOrderId: `ORD-${String(48000 + index).padStart(5, "0")}`,
      pickedBy: picker,
      pickedAt: formatDateTime(-(index % 3), 9 + (index % 5)),
      notes:
        status === "In Progress"
          ? "Investigation count in progress after order pick."
          : "Investigation required — picker reported pick complete at this location.",
    };
  });

  const closedLoopTasks = postCount.map((stock, index) => {
    const parsed = parseLocation(stock.binCode)!;
    const taskIndex = 10001 + 30 + index;
    const assignee =
      CYCLE_COUNT_ASSIGNEES[(index + 1) % CYCLE_COUNT_ASSIGNEES.length];
    const counter =
      CYCLE_COUNT_ASSIGNEES[(index + 3) % CYCLE_COUNT_ASSIGNEES.length];
    const expectedQty = stock.quantityOnHand;
    const statusCycle: CycleCountStatus[] = [
      "Counted",
      "Counted",
      "Discrepancy",
      "Resolved",
    ];
    const status = statusCycle[index % statusCycle.length];
    const countedQty =
      status === "Discrepancy"
        ? expectedQty - stock.eachesPerCase * 2
        : expectedQty;
    const discrepancyQty = countedQty - expectedQty;
    const hasCountResult = status !== "Resolved";

    return {
      taskId: `INV-${String(taskIndex).padStart(5, "0")}`,
      locationCode: stock.binCode,
      aisle: parsed.aisle,
      bay: parsed.bay,
      assignedTo: assignee,
      priority: priorities[(index + 1) % priorities.length],
      status,
      dueDate: formatDate(-(index % 7)),
      clientCode: stock.clientCode,
      itemId: stock.itemId,
      productDescription: stock.productDescription,
      lotNumber: stock.lotNumber,
      palletId: stock.palletId,
      expectedQty,
      countedQty: hasCountResult ? countedQty : expectedQty,
      discrepancyQty: hasCountResult ? discrepancyQty : 0,
      countedBy: hasCountResult ? counter : undefined,
      countedAt: hasCountResult
        ? formatDateTime(-(1 + (index % 5)), 10 + (index % 4))
        : undefined,
      resolvedBy: status === "Resolved" ? "Reem" : undefined,
      resolvedAt:
        status === "Resolved"
          ? formatDateTime(-(index % 2), 15 + (index % 3))
          : undefined,
      notes:
        status === "Counted"
          ? "Investigation count matches expected — pending IC approval."
          : status === "Discrepancy" && countedQty !== null
            ? cycleCountVarianceNote(expectedQty, countedQty)
            : status === "Resolved"
              ? "Count approved and posted to WMS."
              : "",
    };
  });

  return [...openTasks, ...closedLoopTasks];
}

function buildStockHolds(
  stockOnHand: StockOnHandRecord[],
  random: () => number,
): StockHoldRecord[] {
  const candidates = shuffle(stockOnHand, random).slice(0, 40);

  return candidates.map((stock, index) => {
    const holdCode = HOLD_CODES[index % HOLD_CODES.length];
    const holdStatus: HoldStatus =
      index % 7 === 0 ? "Pending Release" : "Active";
    return {
      holdId: `HLD-${String(50001 + index).padStart(5, "0")}`,
      locationCode: stock.binCode,
      palletId: stock.palletId,
      clientCode: stock.clientCode,
      clientName: stock.clientName,
      itemId: stock.itemId,
      productDescription: stock.productDescription,
      lotNumber: stock.lotNumber,
      holdCode,
      holdStatus,
      holdReason: HOLD_REASONS[holdCode],
      holdDate: formatDate(-(3 + (index % 20))),
      requestedBy: index % 2 === 0 ? "QC Supervisor" : "Inventory Control",
      quantityOnHold: stock.quantityOnHand,
    };
  });
}

function buildPalletHistoryMap(
  locationHistory: Record<string, LocationHistoryRecord[]>,
): Record<string, LocationHistoryRecord[]> {
  const palletHistory: Record<string, LocationHistoryRecord[]> = {};

  for (const records of Object.values(locationHistory)) {
    for (const record of records) {
      if (!palletHistory[record.palletId]) {
        palletHistory[record.palletId] = [];
      }
      palletHistory[record.palletId].push(record);
    }
  }

  for (const palletId of Object.keys(palletHistory)) {
    palletHistory[palletId].sort(
      (left, right) =>
        new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
  }

  return palletHistory;
}

let cachedSnapshot: MockWarehouseSnapshot | null = null;

export function generateMockWarehouseData(): MockWarehouseSnapshot {
  if (cachedSnapshot) return cachedSnapshot;

  const random = mulberry32(20260601);
  const allRackLocations = enumerateAllLocations();
  const stagingSnapshot = buildStagingStock(random);
  const allLocations = [...allRackLocations, ...stagingSnapshot.occupied];
  const shuffled = shuffle(allRackLocations, random);

  // ~72% of rack slots have pallets; empty feed lists WMS-available bins (mostly non-stock).
  const STOCK_FILL_RATIO = 0.72;
  const EMPTY_FEED_RATIO = 0.17;
  const EMPTY_FEED_STOCK_OVERLAP_RATIO = 0.08;

  const stockCount = Math.floor(allRackLocations.length * STOCK_FILL_RATIO);
  const stockCodes = shuffled.slice(0, stockCount);
  const stockSet = new Set(stockCodes);

  const nonStockLocations = shuffled.filter(
    (locationCode) => !stockSet.has(locationCode),
  );
  const emptyFeedCount = Math.floor(allRackLocations.length * EMPTY_FEED_RATIO);
  const emptyFromNonStock = nonStockLocations.slice(0, emptyFeedCount);

  const overlapCount = Math.max(
    1,
    Math.floor(stockCodes.length * EMPTY_FEED_STOCK_OVERLAP_RATIO),
  );
  const forcedOverlap = shuffle(stockCodes, random).slice(0, overlapCount);

  const rackStockOnHand = stockCodes.map((binCode, index) =>
    buildStockRecord(binCode, index, random),
  );
  const stockOnHand = [...rackStockOnHand, ...stagingSnapshot.stock];
  assignChronologicalPalletIds(
    stockOnHand,
    CLIENT_ITEM_CODE_PREFIX,
    CLIENT_PRODUCT_COUNT,
  );

  const emptyCodes = [...new Set([...emptyFromNonStock, ...forcedOverlap])];

  const stockByCode = new Map(
    stockOnHand.map((record) => [record.binCode, record]),
  );
  const fullStockSet = new Set(stockOnHand.map((record) => record.binCode));
  const emptySet = new Set(emptyCodes);
  const overlapSet = new Set(
    forcedOverlap.filter((code) => fullStockSet.has(code)),
  );

  const locationHistory: Record<string, LocationHistoryRecord[]> = {};
  const historyCandidates = shuffle(allLocations, random).slice(
    0,
    Math.floor(allLocations.length * 0.22),
  );

  for (const locationCode of historyCandidates) {
    const isEmpty = emptySet.has(locationCode) && !fullStockSet.has(locationCode);
    const stock = stockByCode.get(locationCode) ?? null;
    locationHistory[locationCode] = generateHistoryForLocation(
      locationCode,
      stock,
      random,
      isEmpty,
    );
  }

  for (const locationCode of stagingSnapshot.occupied) {
    if (!locationHistory[locationCode]) {
      locationHistory[locationCode] = generateHistoryForLocation(
        locationCode,
        stockByCode.get(locationCode) ?? null,
        random,
        false,
      );
    }
  }

  const binMaster = buildBinMaster(allLocations, emptySet, fullStockSet, overlapSet);
  const cycleCountTasks = buildCycleCountTasks(
    rackStockOnHand,
    random,
  );
  const stockHolds = buildStockHolds(stockOnHand, random);
  const palletHistory = buildPalletHistoryMap(locationHistory);

  cachedSnapshot = {
    emptyLocations: emptyCodes.map((locationCode, index) => ({
      locationCode,
      status: "EMPTY",
      feed: index % 3 === 0 ? "WMS-ELO-NIGHTLY" : "WMS-ELO-INTRADAY",
    })),
    stockOnHand,
    locationHistory,
    palletHistory,
    binMaster,
    cycleCountTasks,
    stockHolds,
  };

  return cachedSnapshot;
}

export function resetMockWarehouseCache(): void {
  cachedSnapshot = null;
}

export function getMockStockRecord(
  locationCode: string,
): StockOnHandRecord | null {
  const normalized = normalizeLocation(locationCode);
  return (
    generateMockWarehouseData().stockOnHand.find(
      (record) => record.binCode === normalized,
    ) ?? null
  );
}

export function getMockLocationHistory(
  locationCode: string,
): LocationHistoryRecord[] {
  const normalized = normalizeLocation(locationCode);
  const existing = generateMockWarehouseData().locationHistory[normalized];
  if (existing?.length) return existing;

  const stock = getMockStockRecord(normalized);
  return generateHistoryForLocation(
    normalized,
    stock,
    mulberry32(hashString(normalized)),
    !stock,
  );
}

export function getMockSnapshot(): MockWarehouseSnapshot {
  return generateMockWarehouseData();
}
