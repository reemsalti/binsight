import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FilterSummaryCard,
  matchesSummaryBuckets,
  toggleSetMember,
} from "../FilterSummaryCard";
import { DashboardSectionHeader } from "../DashboardSectionHeader";
import { ProductCardLines } from "../ProductCardLines";
import { ListSortAxes } from "../ListSortAxes";
import type {
  CycleCountDiscrepancyOutcome,
  CycleCountResolutionType,
  CycleCountStatus,
  CycleCountTask,
  Filters,
} from "../../types";
import {
  approveInvestigationCount,
  fetchCycleCountTasks,
  reviewCycleCountDiscrepancy,
  submitCycleCountResult,
  updateCycleCountTaskStatus,
} from "../../services/wmsApi";
import { INVESTIGATION_COUNT_COPY as COPY } from "../../config/investigationCountCopy";
import {
  DEFAULT_CYCLE_COUNT_SORT,
  sortCycleCountTasks,
  type SortDirection,
  type ThreeAxisSort,
} from "../../utils/listSort";
import {
  CONFIRM_RESOLUTION_OPTIONS,
  DISMISS_RESOLUTION_OPTIONS,
  discrepancyOutcomeLabel,
  formatCycleCountVariance,
  formatSignedVarianceEa,
  parseSignedVarianceInput,
  resolutionTypeLabel,
} from "../../utils/cycleCountVariance";
import {
  formatPickTriggerLine,
  isAwaitingCountApproval,
  isPickTriggeredOpenTask,
} from "../../utils/investigationCountWorkflow";
import {
  entityFocusDomId,
  entityFocusRingClass,
  useScrollToEntityFocus,
} from "../../utils/entityFocus";

type SummaryBucket =
  | "open"
  | "awaitingApproval"
  | "discrepancies"
  | "resolved";

type Props = {
  filters: Filters;
  focusEntityId?: string | null;
};

export function CycleCountModule({ filters, focusEntityId = null }: Props) {
  const [allTasks, setAllTasks] = useState<CycleCountTask[]>([]);
  const [summaryBuckets, setSummaryBuckets] = useState<Set<SummaryBucket>>(
    () => new Set(),
  );
  const [showAllTasks, setShowAllTasks] = useState(true);
  const [sortAxes, setSortAxes] = useState<ThreeAxisSort>(DEFAULT_CYCLE_COUNT_SORT);

  function setSortAxis(axis: keyof ThreeAxisSort, value: SortDirection) {
    setSortAxes((current) => ({ ...current, [axis]: value }));
  }
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [countDrafts, setCountDrafts] = useState<Record<string, string>>({});
  const [countErrors, setCountErrors] = useState<Record<string, string>>({});
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] =
    useState<CycleCountDiscrepancyOutcome | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      setAllTasks(await fetchCycleCountTasks(filters));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!focusEntityId) return;
    setShowAllTasks(true);
    setSummaryBuckets(new Set());
  }, [focusEntityId]);

  useScrollToEntityFocus(focusEntityId, !isLoading);

  const summary = useMemo(() => {
    return {
      total: allTasks.length,
      open: allTasks.filter((task) => isPickTriggeredOpenTask(task)).length,
      awaitingApproval: allTasks.filter((task) => isAwaitingCountApproval(task))
        .length,
      discrepancies: allTasks.filter((task) => task.status === "Discrepancy")
        .length,
      resolved: allTasks.filter((task) => task.status === "Resolved").length,
    };
  }, [allTasks]);

  const visibleTasks = useMemo(() => {
    let list = allTasks;

    if (!showAllTasks && summaryBuckets.size > 0) {
      list = list.filter((task) =>
        matchesSummaryBuckets(summaryBuckets, {
          open: isPickTriggeredOpenTask(task),
          awaitingApproval: isAwaitingCountApproval(task),
          discrepancies: task.status === "Discrepancy",
          resolved: task.status === "Resolved",
        }),
      );
    }

    const sorted = sortCycleCountTasks(list, sortAxes);
    if (focusEntityId && !sorted.some((task) => task.taskId === focusEntityId)) {
      const focused = allTasks.find((task) => task.taskId === focusEntityId);
      if (focused) return [focused, ...sorted];
    }
    return sorted;
  }, [allTasks, showAllTasks, summaryBuckets, sortAxes, focusEntityId]);

  function toggleBucket(bucket: SummaryBucket) {
    setShowAllTasks(false);
    setSummaryBuckets((current) => toggleSetMember(current, bucket));
  }

  function toggleShowAll() {
    setShowAllTasks((current) => {
      const next = !current;
      if (next) setSummaryBuckets(new Set());
      return next;
    });
  }

  async function handleStatusChange(taskId: string, status: CycleCountStatus) {
    setUpdatingTaskId(taskId);
    try {
      await updateCycleCountTaskStatus(taskId, status);
      if (status === "In Progress") {
        setCountDrafts((current) => ({ ...current, [taskId]: "" }));
        setCountErrors((current) => {
          const next = { ...current };
          delete next[taskId];
          return next;
        });
      }
      await loadTasks();
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function setCountDraft(taskId: string, value: string) {
    setCountDrafts((current) => ({ ...current, [taskId]: value }));
    setCountErrors((current) => {
      if (!current[taskId]) return current;
      const next = { ...current };
      delete next[taskId];
      return next;
    });
  }

  async function handleSubmitCount(taskId: string) {
    const raw = countDrafts[taskId]?.trim() ?? "";
    if (!raw) {
      setCountErrors((current) => ({
        ...current,
        [taskId]: "Enter the quantity you counted.",
      }));
      return;
    }

    const countedQty = Number.parseInt(raw, 10);
    if (!Number.isFinite(countedQty) || countedQty < 0) {
      setCountErrors((current) => ({
        ...current,
        [taskId]: "Enter a whole number of eaches (0 or greater).",
      }));
      return;
    }

    setUpdatingTaskId(taskId);
    try {
      await submitCycleCountResult(taskId, countedQty, "");
      setCountDrafts((current) => {
        const next = { ...current };
        delete next[taskId];
        return next;
      });
      setCountErrors((current) => {
        const next = { ...current };
        delete next[taskId];
        return next;
      });
      await loadTasks();
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleApproveCount(taskId: string) {
    setUpdatingTaskId(taskId);
    try {
      await approveInvestigationCount(taskId);
      await loadTasks();
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function openDiscrepancyReview(
    task: CycleCountTask,
    action: CycleCountDiscrepancyOutcome,
  ) {
    setReviewingTaskId(task.taskId);
    setReviewAction(action);
    setCountErrors((current) => {
      const next = { ...current };
      delete next[`${task.taskId}-review`];
      return next;
    });
  }

  function closeDiscrepancyReview() {
    setReviewingTaskId(null);
    setReviewAction(null);
  }

  async function handleSubmitDiscrepancyReview(
    task: CycleCountTask,
    outcome: CycleCountDiscrepancyOutcome,
    payload: {
      resolutionType: CycleCountResolutionType;
      comment: string;
      reviewedVarianceEa?: number;
      correctedCountedQty?: number;
    },
  ) {
    if (!payload.comment.trim()) {
      setCountErrors((current) => ({
        ...current,
        [`${task.taskId}-review`]: "Add findings from your review.",
      }));
      return;
    }

    if (outcome === "confirmed") {
      const signedVariance = payload.reviewedVarianceEa;
      if (
        signedVariance === undefined ||
        !Number.isFinite(signedVariance) ||
        signedVariance === 0
      ) {
        setCountErrors((current) => ({
          ...current,
          [`${task.taskId}-review`]:
            "Enter signed variance: positive for over, negative for short.",
        }));
        return;
      }
    } else {
      const corrected = payload.correctedCountedQty;
      if (
        corrected === undefined ||
        !Number.isFinite(corrected) ||
        corrected < 0
      ) {
        setCountErrors((current) => ({
          ...current,
          [`${task.taskId}-review`]:
            "Enter the corrected quantity after review.",
        }));
        return;
      }
    }

    setUpdatingTaskId(task.taskId);
    try {
      await reviewCycleCountDiscrepancy({
        taskId: task.taskId,
        outcome,
        resolutionType: payload.resolutionType,
        comment: payload.comment,
        reviewedVarianceEa: payload.reviewedVarianceEa,
        correctedCountedQty: payload.correctedCountedQty,
      });
      closeDiscrepancyReview();
      await loadTasks();
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <section className="module-panel p-5">
      <DashboardSectionHeader
        title={COPY.moduleTitle}
        description={COPY.moduleDescription}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FilterSummaryCard
          label="Open (after pick)"
          value={summary.open}
          isSelected={summaryBuckets.has("open")}
          onClick={() => toggleBucket("open")}
        />
        <FilterSummaryCard
          label="Approve count"
          value={summary.awaitingApproval}
          tone="blue"
          isSelected={summaryBuckets.has("awaitingApproval")}
          onClick={() => toggleBucket("awaitingApproval")}
        />
        <FilterSummaryCard
          label="Discrepancies"
          value={summary.discrepancies}
          tone="amber"
          isSelected={summaryBuckets.has("discrepancies")}
          onClick={() => toggleBucket("discrepancies")}
        />
        <FilterSummaryCard
          label="Resolved"
          value={summary.resolved}
          tone="emerald"
          isSelected={summaryBuckets.has("resolved")}
          onClick={() => toggleBucket("resolved")}
        />
        <FilterSummaryCard
          label="Total"
          value={summary.total}
          isSelected={showAllTasks}
          onClick={toggleShowAll}
        />
      </div>
      <p className="mt-2 type-muted">
        {COPY.openEmptyHint} Select summaries to filter (combined). Total shows
        every task in range.
      </p>

      <div className="mt-4">
        <ListSortAxes
          date={sortAxes.date}
          priority={sortAxes.priority}
          location={sortAxes.location}
          onDateChange={(value) => setSortAxis("date", value)}
          onPriorityChange={(value) => setSortAxis("priority", value)}
          onLocationChange={(value) => setSortAxis("location", value)}
        />
      </div>

      {isLoading ? (
        <p className="mt-5 type-muted">{COPY.loading}</p>
      ) : !visibleTasks.length ? (
        <p className="mt-5 type-muted">{COPY.emptyFilter}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {visibleTasks.map((task) => {
            const variance = formatCycleCountVariance(task);
            const varianceClass =
              variance.tone === "over" || variance.tone === "short"
                ? "type-emphasis text-amber-800"
                : variance.tone === "match"
                  ? "text-emerald-700"
                  : "text-slate-600";

            const isFocused = focusEntityId === task.taskId;

            return (
            <div
              key={task.taskId}
              id={entityFocusDomId(task.taskId)}
              className={`rounded-xl border p-3 ${
                task.status === "Discrepancy"
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              } ${entityFocusRingClass(isFocused)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="type-label">
                    {task.taskId}
                  </p>
                  {formatPickTriggerLine(task) && (
                    <p className="mt-1 text-xs font-medium text-blue-800">
                      {COPY.pickTriggerLabel}: {formatPickTriggerLine(task)}
                    </p>
                  )}
                  <ProductCardLines
                    className="mt-1"
                    data={{
                      clientCode: task.clientCode,
                      itemId: task.itemId,
                      productDescription: task.productDescription,
                      lotNumber: task.lotNumber,
                      palletId: task.palletId,
                      locationCode: task.locationCode,
                    }}
                  />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex flex-wrap justify-end gap-2">
                    <PriorityBadge priority={task.priority} />
                    <Badge
                      label={task.status}
                      highlight={task.status === "Discrepancy"}
                    />
                  </div>
                  <p className="type-muted">Due {task.dueDate}</p>
                </div>
              </div>

              <div className="mt-2 grid gap-2 border-t border-slate-200 pt-2 sm:grid-cols-2">
                <PersonnelBlock
                  label="Assigned to"
                  name={task.assignedTo}
                  detail={COPY.assignedDetail}
                />
                {task.countedBy ? (
                  <PersonnelBlock
                    label="Counted by"
                    name={task.countedBy}
                    detail={
                      task.countedAt
                        ? `Reported ${formatTimestamp(task.countedAt)}`
                        : COPY.countedDetail
                    }
                  />
                ) : (
                  <PersonnelBlock
                    label="Counted by"
                    name="—"
                    detail={COPY.noCountYet}
                    muted
                  />
                )}
                {task.status === "Resolved" && task.resolvedBy && (
                  <PersonnelBlock
                    label="Resolved by"
                    name={task.resolvedBy}
                    detail={
                      task.resolvedAt
                        ? `Closed ${formatTimestamp(task.resolvedAt)}`
                        : "Discrepancy closed"
                    }
                    className="sm:col-span-2"
                  />
                )}
              </div>

              <div className="mt-2 grid gap-1.5 type-text sm:grid-cols-3">
                <span>Expected {task.expectedQty} EA</span>
                <span>Counted {task.countedQty ?? "—"} EA</span>
                <span className={varianceClass}>
                  {variance.label}
                </span>
              </div>
              {variance.detail && (
                <p className="mt-0.5 text-xs text-amber-800">{variance.detail}</p>
              )}

              {task.notes && !task.resolutionNote && (
                <p className="mt-2 type-text">{task.notes}</p>
              )}

              {task.resolutionNote && task.discrepancyOutcome && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5">
                  <p className="type-label">
                    IC review · {discrepancyOutcomeLabel(task.discrepancyOutcome)}
                  </p>
                  {task.resolutionType && (
                    <p className="mt-0.5 type-emphasis">
                      {resolutionTypeLabel(task.resolutionType)}
                    </p>
                  )}
                  <p className="mt-1 whitespace-pre-line type-text">
                    {task.resolutionNote}
                  </p>
                  {task.resolvedBy && (
                    <p className="mt-1 type-muted">
                      {task.resolvedBy}
                      {task.resolvedAt
                        ? ` · ${formatTimestamp(task.resolvedAt)}`
                        : ""}
                    </p>
                  )}
                </div>
              )}

              {task.status === "In Progress" && (
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-0.5">
                      <span className="type-label">
                        {COPY.countFieldLabel}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={countDrafts[task.taskId] ?? ""}
                        disabled={updatingTaskId === task.taskId}
                        onChange={(event) =>
                          setCountDraft(task.taskId, event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSubmitCount(task.taskId);
                          }
                        }}
                        placeholder={`Expected ${task.expectedQty}`}
                        className="w-28 type-control disabled:opacity-60"
                        aria-invalid={Boolean(countErrors[task.taskId])}
                        aria-describedby={
                          countErrors[task.taskId]
                            ? `${task.taskId}-count-error`
                            : undefined
                        }
                      />
                    </label>
                    <ActionButton
                      label={COPY.submitCountButton}
                      disabled={updatingTaskId === task.taskId}
                      onClick={() =>
                        void handleSubmitCount(task.taskId)
                      }
                    />
                  </div>
                  {countErrors[task.taskId] && (
                    <p
                      id={`${task.taskId}-count-error`}
                      className="mt-1 text-xs font-medium text-red-700"
                    >
                      {countErrors[task.taskId]}
                    </p>
                  )}
                  <p className="mt-1 type-muted">
                    {COPY.countHint}
                  </p>
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {task.status === "Not Started" && task.pickOrderId && (
                  <ActionButton
                    label={COPY.startButton}
                    disabled={updatingTaskId === task.taskId}
                    onClick={() => void handleStatusChange(task.taskId, "In Progress")}
                  />
                )}
                {isAwaitingCountApproval(task) && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                    <ActionButton
                      label={COPY.approveCountButton}
                      disabled={updatingTaskId === task.taskId}
                      onClick={() => void handleApproveCount(task.taskId)}
                    />
                    <span className="type-muted">
                      {COPY.approveCountHint}
                    </span>
                  </div>
                )}
                {task.status === "Discrepancy" &&
                  reviewingTaskId !== task.taskId && (
                    <>
                      <ActionButton
                        label="Confirm discrepancy"
                        disabled={updatingTaskId === task.taskId}
                        onClick={() => openDiscrepancyReview(task, "confirmed")}
                      />
                      <ActionButton
                        label="Delete discrepancy"
                        tone="muted"
                        disabled={updatingTaskId === task.taskId}
                        onClick={() => openDiscrepancyReview(task, "dismissed")}
                      />
                    </>
                  )}
              </div>

              {task.status === "Discrepancy" &&
                reviewingTaskId === task.taskId &&
                reviewAction && (
                  <DiscrepancyReviewForm
                    task={task}
                    outcome={reviewAction}
                    variance={variance}
                    isSubmitting={updatingTaskId === task.taskId}
                    errorMessage={countErrors[`${task.taskId}-review`]}
                    onCancel={closeDiscrepancyReview}
                    onSubmit={(payload) =>
                      void handleSubmitDiscrepancyReview(
                        task,
                        reviewAction,
                        payload,
                      )
                    }
                  />
                )}
            </div>
          );
          })}
        </div>
      )}
    </section>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: CycleCountTask["priority"];
}) {
  const toneClass =
    priority === "Critical"
      ? "border-red-300 bg-red-100 text-red-900"
      : priority === "High"
        ? "border-amber-300 bg-amber-100 text-amber-900"
        : priority === "Medium"
          ? "border-blue-300 bg-blue-100 text-blue-900"
          : "border-slate-300 bg-white text-slate-700";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 type-badge ${toneClass}`}
    >
      {priority}
    </span>
  );
}

function Badge({
  label,
  highlight = false,
}: {
  label: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 type-badge ${
        highlight
          ? "border-amber-300 bg-amber-100 text-amber-900"
          : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PersonnelBlock({
  label,
  name,
  detail,
  muted = false,
  className = "",
}: {
  label: string;
  name: string;
  detail: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="type-label">
        {label}
      </p>
      <p
        className={`type-emphasis mt-0.5 ${
          muted ? "text-slate-400" : "text-slate-950"
        }`}
      >
        {name}
      </p>
      <p className="mt-0.5 type-muted">{detail}</p>
    </div>
  );
}

function DiscrepancyReviewForm({
  task,
  outcome,
  variance,
  isSubmitting,
  errorMessage,
  onCancel,
  onSubmit,
}: {
  task: CycleCountTask;
  outcome: CycleCountDiscrepancyOutcome;
  variance: ReturnType<typeof formatCycleCountVariance>;
  isSubmitting: boolean;
  errorMessage?: string;
  onCancel: () => void;
  onSubmit: (payload: {
    resolutionType: CycleCountResolutionType;
    comment: string;
    reviewedVarianceEa?: number;
    correctedCountedQty?: number;
  }) => void;
}) {
  const isConfirm = outcome === "confirmed";
  const [resolutionType, setResolutionType] = useState<CycleCountResolutionType>(
    isConfirm ? "submit_for_investigation" : "counting_error",
  );
  const [comment, setComment] = useState("");
  const [reviewedVarianceEa, setReviewedVarianceEa] = useState(
    String(task.discrepancyQty ?? 0),
  );
  const parsedSignedVariance = parseSignedVarianceInput(reviewedVarianceEa);
  const [correctedCountedQty, setCorrectedCountedQty] = useState(
    String(task.expectedQty),
  );

  const resolutionOptions = isConfirm
    ? CONFIRM_RESOLUTION_OPTIONS
    : DISMISS_RESOLUTION_OPTIONS;

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-white p-3">
      <p className="type-emphasis">
        {isConfirm ? "Confirm discrepancy" : "Delete discrepancy"}
      </p>
      <p className="mt-0.5 type-text">
        {isConfirm
          ? "Record review findings and next step (investigation or adjustment)."
          : "Document why this is not a real variance (e.g. counting error)."}
      </p>

      {variance.detail && (
        <p className="mt-2 text-xs font-medium text-amber-800">
          Investigation count: {variance.label} · {variance.detail}
        </p>
      )}

      <div className="mt-3 space-y-2">
        <label className="block">
          <span className="type-label">
            Review action
          </span>
          <select
            value={resolutionType}
            onChange={(event) =>
              setResolutionType(event.target.value as CycleCountResolutionType)
            }
            className="mt-0.5 w-full type-control"
          >
            {resolutionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {isConfirm ? (
          <label className="block">
            <span className="type-label">
              Confirmed variance (EA)
            </span>
            <input
              type="number"
              step={1}
              value={reviewedVarianceEa}
              onChange={(event) => setReviewedVarianceEa(event.target.value)}
              placeholder="e.g. -12 or 5"
              className="mt-0.5 w-28 type-control"
            />
            <span
              className={`mt-0.5 block text-xs font-medium ${
                parsedSignedVariance === null
                  ? "text-slate-500"
                  : parsedSignedVariance > 0
                    ? "text-amber-800"
                    : parsedSignedVariance < 0
                      ? "text-amber-800"
                      : "text-slate-500"
              }`}
            >
              {parsedSignedVariance === null
                ? "Use + for over, − for short (e.g. -12 = short 12 EA)"
                : formatSignedVarianceEa(parsedSignedVariance)}
            </span>
          </label>
        ) : (
          <label className="block">
            <span className="type-label">
              Corrected count (EA)
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={correctedCountedQty}
              onChange={(event) => setCorrectedCountedQty(event.target.value)}
              className="mt-0.5 w-28 type-control"
            />
            <span className="mt-0.5 block type-muted">
              Expected {task.expectedQty} EA
            </span>
          </label>
        )}

        <label className="block">
          <span className="type-label">
            Review findings
          </span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder={
              isConfirm
                ? "e.g. Verified short 24 EA on floor; requesting adjustment."
                : "e.g. Recount matched WMS; original count keyed wrong."
            }
            className="mt-0.5 w-full type-control"
          />
        </label>
      </div>

      {errorMessage && (
        <p className="mt-2 text-xs font-medium text-red-700">{errorMessage}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton
          label="Submit review"
          disabled={isSubmitting}
          onClick={() =>
            onSubmit({
              resolutionType,
              comment,
              reviewedVarianceEa: isConfirm
                ? (parseSignedVarianceInput(reviewedVarianceEa) ?? undefined)
                : undefined,
              correctedCountedQty: !isConfirm
                ? Number.parseInt(correctedCountedQty, 10)
                : undefined,
            })
          }
        />
        <ActionButton
          label="Cancel"
          tone="muted"
          disabled={isSubmitting}
          onClick={onCancel}
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "muted";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 type-btn disabled:opacity-60 ${
        tone === "muted"
          ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}
