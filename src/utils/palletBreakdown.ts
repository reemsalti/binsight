export type PalletQuantityBreakdown = {
  casesPerPallet: number;
  eachesPerCase: number;
  totalEaches: number;
  quantityBreakdown: string;
  weightBreakdown: string;
};

export function formatQuantityBreakdown(
  casesPerPallet: number,
  eachesPerCase: number,
): string {
  const totalEaches = casesPerPallet * eachesPerCase;
  return `${casesPerPallet} CASE × ${eachesPerCase} EA = ${totalEaches} EA`;
}

export function formatWeightBreakdown(
  casesPerPallet: number,
  netWeightPerCaseKg: number,
  tareWeightKg: number,
): string {
  const netTotal = roundWeight(casesPerPallet * netWeightPerCaseKg);
  const grossTotal = roundWeight(netTotal + tareWeightKg);
  return `${casesPerPallet} CASE × ${netWeightPerCaseKg} KG = ${netTotal} KG NET + ${tareWeightKg} KG TARE = ${grossTotal} KG GROSS`;
}

function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildPalletQuantityBreakdown(
  casesPerPallet: number,
  eachesPerCase: number,
  netWeightPerCaseKg: number,
  tareWeightKg: number,
): PalletQuantityBreakdown {
  const totalEaches = casesPerPallet * eachesPerCase;
  return {
    casesPerPallet,
    eachesPerCase,
    totalEaches,
    quantityBreakdown: formatQuantityBreakdown(casesPerPallet, eachesPerCase),
    weightBreakdown: formatWeightBreakdown(
      casesPerPallet,
      netWeightPerCaseKg,
      tareWeightKg,
    ),
  };
}
