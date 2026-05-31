import type { StockOnHandRecord } from "../types";

/** Demo clients in the same order as `DEMO_CLIENTS` in generateMockWarehouseData. */
export const DEMO_CLIENT_CODES = ["LOREALCA", "LEGOTOYS", "KELLOGGS"] as const;

/**
 * 8-digit pallet label: CC II SSSS
 * - CC (2): client receiving block (10 = L'Oréal, 11 = LEGO, 12 = Kellogg's)
 * - II (2): SKU line within the client (01–05)
 * - SSSS (4): chronological receipt sequence for that SKU
 */
export function formatDemoPalletId(
  clientIndex: number,
  itemIndex: number,
  sequence: number,
): string {
  const clientBlock = 10 + clientIndex;
  const itemSlot = itemIndex + 1;
  const seq = Math.min(9999, Math.max(1, Math.floor(sequence)));
  return String(clientBlock * 1_000_000 + itemSlot * 10_000 + seq).padStart(8, "0");
}

export function getDemoClientIndex(clientCode: string): number {
  const index = DEMO_CLIENT_CODES.indexOf(
    clientCode as (typeof DEMO_CLIENT_CODES)[number],
  );
  return index >= 0 ? index : 0;
}

/** Item master ID: two-letter client code + catalog sequence (e.g. LO10003). */
export function formatDemoItemId(itemCodePrefix: string, itemIndex: number): string {
  const letters = itemCodePrefix.slice(0, 2).toUpperCase();
  const sequence = 10001 + itemIndex;
  return `${letters}${sequence}`;
}

export function parseDemoItemIndex(
  itemId: string,
  itemCodePrefix: string,
): number {
  const letters = itemCodePrefix.slice(0, 2).toUpperCase();
  const match = itemId.match(new RegExp(`^${letters}(\\d+)$`, "i"));
  if (!match) return 0;
  const numeric = Number.parseInt(match[1], 10);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, numeric - 10001);
}

function parseReceiptDate(value: string): number {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Assign receipt-order pallet numbers after stock rows are built. */
export function assignChronologicalPalletIds(
  records: StockOnHandRecord[],
  itemCodePrefixByClient: Record<string, string>,
  productCountByClient: Record<string, number>,
): void {
  const counters = new Map<string, number>();
  const sorted = [...records].sort(
    (left, right) =>
      parseReceiptDate(left.originalReceiptDate) -
        parseReceiptDate(right.originalReceiptDate) ||
      left.binCode.localeCompare(right.binCode),
  );

  for (const record of sorted) {
    const clientIndex = getDemoClientIndex(record.clientCode);
    const codePrefix =
      itemCodePrefixByClient[record.clientCode] ?? record.clientCode.slice(0, 2);
    const productCount = productCountByClient[record.clientCode] ?? 5;
    let itemIndex = parseDemoItemIndex(record.itemId, codePrefix);
    if (itemIndex < 0 || itemIndex >= productCount) {
      itemIndex = 0;
    }

    const key = `${record.clientCode}:${itemIndex}`;
    const sequence = (counters.get(key) ?? 0) + 1;
    counters.set(key, sequence);
    record.palletId = formatDemoPalletId(clientIndex, itemIndex, sequence);
  }
}

/** Deterministic label for ad-hoc / history-only bins outside the main stock pass. */
export function fallbackDemoPalletId(
  clientIndex: number,
  itemIndex: number,
  binCode: string,
): string {
  const sequence = 8500 + (hashString(binCode) % 1499);
  return formatDemoPalletId(clientIndex, itemIndex, sequence);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
