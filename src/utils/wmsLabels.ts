/** WMS-style abbreviated labels for UI copy (not internal field names). */
export const WMS_LABEL = {
  plt: "PLT",
  pltId: "PLT ID",
} as const;

/** e.g. "3 PLT" */
export function formatPltCount(count: number): string {
  return `${count.toLocaleString()} ${WMS_LABEL.plt}`;
}
