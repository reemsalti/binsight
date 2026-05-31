import type { ProcessedResults } from "../types";
import {
  WAREHOUSE_BAY_COUNT,
  WAREHOUSE_LEVELS_TOP_TO_BOTTOM,
  WAREHOUSE_POSITIONS,
  formatWarehouseLocation,
  parseLocation,
} from "./location";

/** Slots per bay: 5 levels × 2 positions. */
export const SLOTS_PER_BAY =
  WAREHOUSE_LEVELS_TOP_TO_BOTTOM.length * WAREHOUSE_POSITIONS.length;

/** Slots per aisle: 38 bays × 10 positions. */
export const SLOTS_PER_AISLE = WAREHOUSE_BAY_COUNT * SLOTS_PER_BAY;

export function listAislesInRange(aisleFrom: number, aisleTo: number): number[] {
  const aisles: number[] = [];
  for (let aisle = aisleFrom; aisle <= aisleTo; aisle += 1) {
    aisles.push(aisle);
  }
  return aisles;
}

export function countOccupiedByAisle(
  stockLocationSet: Set<string>,
  aisleFrom: number,
  aisleTo: number,
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const aisle of listAislesInRange(aisleFrom, aisleTo)) {
    counts[aisle] = 0;
  }

  for (const location of stockLocationSet) {
    const parsed = parseLocation(location);
    if (!parsed) continue;
    if (parsed.aisle < aisleFrom || parsed.aisle > aisleTo) continue;
    counts[parsed.aisle] = (counts[parsed.aisle] ?? 0) + 1;
  }

  return counts;
}

export function countBayOccupied(
  bay: BayBlueprint,
  stockLocationSet: Set<string>,
): number {
  return bay.levels.reduce(
    (total, levelRow) =>
      total +
      levelRow.slots.filter((slot) => stockLocationSet.has(slot.location))
        .length,
    0,
  );
}

/** Matches green blueprint cells: rack slots with no stock on hand. */
export function countBayBlueprintAvailable(
  bay: BayBlueprint,
  stockLocationSet: Set<string>,
): number {
  return SLOTS_PER_BAY - countBayOccupied(bay, stockLocationSet);
}

export function countBlueprintAvailableByAisle(
  stockLocationSet: Set<string>,
  aisleFrom: number,
  aisleTo: number,
): Record<number, number> {
  const occupied = countOccupiedByAisle(
    stockLocationSet,
    aisleFrom,
    aisleTo,
  );
  const counts: Record<number, number> = {};
  for (const aisle of listAislesInRange(aisleFrom, aisleTo)) {
    counts[aisle] = SLOTS_PER_AISLE - (occupied[aisle] ?? 0);
  }
  return counts;
}

/** WMS empty-location feed only (Location Availability, not blueprint greens). */
export function countTrueEmptyByAisle(
  results: ProcessedResults | null,
  aisleFrom: number,
  aisleTo: number,
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const aisle of listAislesInRange(aisleFrom, aisleTo)) {
    counts[aisle] = 0;
  }

  if (!results) return counts;

  for (const row of results.finalTrueEmpty) {
    const parsed = parseLocation(row.normalizedLocation);
    if (!parsed) continue;
    if (parsed.aisle < aisleFrom || parsed.aisle > aisleTo) continue;
    counts[parsed.aisle] = (counts[parsed.aisle] ?? 0) + 1;
  }

  return counts;
}

export type RackSlot = {
  location: string;
  level: string;
  position: string;
  slotLabel: string;
};

export type LevelRow = {
  level: string;
  slots: RackSlot[];
};

export type BayBlueprint = {
  bayNumber: number;
  bayLabel: string;
  side: "odd" | "even";
  levels: LevelRow[];
};

export type BayWalkPair = {
  walkStep: number;
  oddBay: BayBlueprint;
  evenBay: BayBlueprint | null;
};

function buildSingleBay(aisle: number, bayNumber: number): BayBlueprint {
  const bayLabel = String(bayNumber).padStart(2, "0");
  const levels: LevelRow[] = WAREHOUSE_LEVELS_TOP_TO_BOTTOM.map((level) => ({
    level,
    slots: WAREHOUSE_POSITIONS.map((position) => {
      const location = formatWarehouseLocation(
        aisle,
        bayNumber,
        level,
        position,
      );
      return {
        location,
        level,
        position,
        slotLabel: `${level}${position}`,
      };
    }),
  }));

  return {
    bayNumber,
    bayLabel,
    side: bayNumber % 2 === 1 ? "odd" : "even",
    levels,
  };
}

export function buildAisleBlueprint(aisle: number): BayBlueprint[] {
  const bays: BayBlueprint[] = [];
  for (let bayNumber = 1; bayNumber <= WAREHOUSE_BAY_COUNT; bayNumber += 1) {
    bays.push(buildSingleBay(aisle, bayNumber));
  }
  return bays;
}

/** Pairs odd/even bays for a walk-down aisle view (01|02, 03|04, …). */
export function buildAisleWalkPairs(aisle: number): BayWalkPair[] {
  const pairs: BayWalkPair[] = [];

  for (let oddBayNumber = 1; oddBayNumber <= WAREHOUSE_BAY_COUNT; oddBayNumber += 2) {
    const evenBayNumber = oddBayNumber + 1;
    pairs.push({
      walkStep: (oddBayNumber + 1) / 2,
      oddBay: buildSingleBay(aisle, oddBayNumber),
      evenBay:
        evenBayNumber <= WAREHOUSE_BAY_COUNT
          ? buildSingleBay(aisle, evenBayNumber)
          : null,
    });
  }

  return pairs;
}

export function isTrueEmptyLocation(
  location: string,
  trueEmptySet: Set<string>,
): boolean {
  return trueEmptySet.has(location);
}

export function countBayTrueEmpty(
  bay: BayBlueprint,
  trueEmptySet: Set<string>,
): number {
  return bay.levels.reduce(
    (total, levelRow) =>
      total +
      levelRow.slots.filter((slot) =>
        isTrueEmptyLocation(slot.location, trueEmptySet),
      ).length,
    0,
  );
}
