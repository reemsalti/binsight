/** User-facing labels — floor investigation item counts, not WMS cycle counts. */
export const INVESTIGATION_COUNT_COPY = {
  moduleTitle: "Investigation Item Counts",
  moduleDescription:
    "Track floor investigation counts, quantity variances, and IC review outcomes.",
  navLabel: "Investigation",
  navTitle: "Investigation item counts — recounts and variance review",
  queueSectionTitle: "Investigation counts",
  loading: "Loading investigation item counts…",
  emptyFilter: "No investigation counts match the current filters.",
  taskIdPrefix: "INV",
  startButton: "Start investigation",
  countFieldLabel: "Investigation count (EA)",
  submitCountButton: "Submit count",
  countHint:
    "Matches expected → awaits IC approval. Over or short → variance for IC review.",
  assignedDetail: "Responsible for the investigation count",
  countedDetail: "Investigation count submitted to WMS",
  noCountYet: "No investigation count submitted yet",
  pickTriggerLabel: "Triggered by order pick",
  approveCountButton: "Approve count",
  approveCountHint: "Count matches expected — IC approval posts to WMS.",
  openEmptyHint:
    "Open investigations are created only after a picker completes an order pick.",
} as const;
