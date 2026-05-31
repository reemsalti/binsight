import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { DemoPermission } from "../mock-data/demoUser";
import type {
  BinDetails,
  Filters,
  LoadReferenceKind,
  LocationHistoryRecord,
} from "../types";
import { hasPermission } from "../utils/permissions";
import { ProductCardLines } from "./ProductCardLines";
import { StockReportForm, type StockReportFormValues } from "./StockReportForm";
import {
  ClickableDetailRow,
  DetailRow,
  DetailSection,
  HistoryDetailCard,
  PalletDetailSections,
  statusBadgeClass,
  usePalletMovementHistory,
} from "./pallet/PalletDetailShared";

const PANEL_WIDTH_STORAGE_KEY = "binsight-bin-panel-width";
const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 760;
const PANEL_DEFAULT_WIDTH = 460;

type Props = {
  details: BinDetails | null;
  filters?: Filters;
  history: LocationHistoryRecord[];
  palletHistory: LocationHistoryRecord[];
  permissions: DemoPermission[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  isPalletHistoryLoading: boolean;
  onClose: () => void;
  onLoadHistory: () => void;
  onLoadReferenceSelect?: (kind: LoadReferenceKind, reference: string) => void;
  onActivityLocationSelect?: (locationCode: string) => void;
  onExpandPalletDetail?: (locationCode: string) => void;
  onSubmitReport: (values: StockReportFormValues) => Promise<void>;
  isSubmittingReport: boolean;
  reportSubmittedFor: string | null;
};

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return <DetailSection title={title} id={id}>{children}</DetailSection>;
}

function DemoActionButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full flex-col items-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-left type-emphasis transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
      <span className="type-muted mt-0.5">Demo action</span>
    </button>
  );
}

function BinActionsSection({
  details,
  permissions,
  onViewHistory,
  onReport,
}: {
  details: BinDetails;
  permissions: DemoPermission[];
  onViewHistory: () => void;
  onReport: () => void;
}) {
  const canViewInventory = hasPermission(permissions, "view_inventory");
  const canViewHistory = hasPermission(permissions, "view_location_history");
  const canReport = hasPermission(permissions, "request_adjustments");

  const isOccupied = details.status === "occupied";

  const actions: ReactNode[] = [];

  if (isOccupied && canViewInventory) {
    actions.push(
      <DemoActionButton
        key="view-inventory"
        label="View inventory details"
        onClick={() =>
          document
            .getElementById("bin-inventory-details")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />,
    );
  }

  if (canViewHistory) {
    actions.push(
      <DemoActionButton
        key="view-history"
        label="View location history"
        onClick={onViewHistory}
      />,
    );
  }

  if (canReport) {
    actions.push(
      <DemoActionButton
        key="report"
        label="Report misplaced stock"
        onClick={onReport}
      />,
    );
  }

  if (actions.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="type-label mb-3">
        Actions
      </h3>
      <div className="space-y-2">{actions}</div>
      <p className="mt-3 type-muted">
        Found something out of place? Report it so Inventory Control can resolve
        it.
      </p>
    </section>
  );
}

export function BinDetailsPanel({
  details,
  filters,
  history,
  palletHistory,
  permissions,
  isLoading,
  isHistoryLoading,
  isPalletHistoryLoading,
  onClose,
  onLoadHistory,
  onLoadReferenceSelect,
  onActivityLocationSelect,
  onExpandPalletDetail,
  onSubmitReport,
  isSubmittingReport,
  reportSubmittedFor,
}: Props) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const panelWidthRef = useRef(panelWidth);

  useEffect(() => {
    const saved = window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
    if (!saved) return;
    const parsed = Number(saved);
    if (Number.isFinite(parsed)) {
      const next = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, parsed));
      setPanelWidth(next);
      panelWidthRef.current = next;
    }
  }, []);

  useEffect(() => {
    panelWidthRef.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    setHistoryExpanded(false);
    setReportOpen(false);
  }, [details?.locationCode]);

  const { activityLog, historyDetail } = usePalletMovementHistory(
    details,
    history,
    palletHistory,
  );
  const showPalletActivity = Boolean(details?.stock);
  const activityLoading = isPalletHistoryLoading || isHistoryLoading;

  const reportJustSubmitted =
    !!details && reportSubmittedFor === details.locationCode;

  useEffect(() => {
    if (reportJustSubmitted) setReportOpen(false);
  }, [reportJustSubmitted]);

  function startPanelResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidthRef.current;

    function handleMouseMove(moveEvent: MouseEvent) {
      const nextWidth = Math.min(
        PANEL_MAX_WIDTH,
        Math.max(PANEL_MIN_WIDTH, startWidth + (startX - moveEvent.clientX)),
      );
      panelWidthRef.current = nextWidth;
      setPanelWidth(nextWidth);
    }

    function handleMouseUp() {
      window.localStorage.setItem(
        PANEL_WIDTH_STORAGE_KEY,
        String(panelWidthRef.current),
      );
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleViewHistory() {
    setHistoryExpanded(true);
    onLoadHistory();
  }

  function handleClose() {
    setHistoryExpanded(false);
    setReportOpen(false);
    onClose();
  }

  return (
    <aside
      style={{ width: panelWidth }}
      className="flex max-h-full min-h-0 shrink-0 border-l border-slate-300 bg-white"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize bin details panel"
        onMouseDown={startPanelResize}
        className="group flex w-2 shrink-0 cursor-col-resize items-center justify-center border-r border-slate-200 bg-slate-50 hover:bg-slate-200"
      >
        <div className="h-12 w-0.5 rounded-full bg-slate-300 group-hover:bg-slate-500" />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="type-label">
                {showPalletActivity ? "PLT details" : "Bin details"}
              </p>
              {details && !isLoading && !showPalletActivity && (
                <button
                  type="button"
                  onClick={
                    historyExpanded
                      ? () => setHistoryExpanded(false)
                      : handleViewHistory
                  }
                  className="type-emphasis underline underline-offset-2 hover:text-slate-950"
                >
                  {historyExpanded ? "Hide Bin History" : "View Bin History"}
                </button>
              )}
              {details && !isLoading && showPalletActivity && onExpandPalletDetail && (
                <button
                  type="button"
                  onClick={() => onExpandPalletDetail(details.locationCode)}
                  className="type-emphasis inline-flex items-center gap-1 text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline"
                >
                  Open full PLT view
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>
            <h2 className="type-heading mt-1">
              {showPalletActivity && details?.stock
                ? details.stock.palletId
                : (details?.locationCode ?? "Loading…")}
            </h2>
            {showPalletActivity && details?.stock && (
              <p className="type-muted mt-0.5 font-mono">{details.locationCode}</p>
            )}
            {details && (
              <span
                className={`type-badge mt-2 inline-flex rounded-full border px-2.5 py-1 ${statusBadgeClass(details.status)}`}
              >
                {details.statusLabel}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {showPalletActivity && onExpandPalletDetail && details?.stock && (
              <button
                type="button"
                title="Open full PLT view"
                aria-label="Open full PLT view"
                onClick={() => onExpandPalletDetail(details.locationCode)}
                className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
              >
                <ArrowUpRight size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading || !details ? (
            <p className="type-muted">Loading bin details…</p>
          ) : (
            <div className="space-y-4">
              {details && !isLoading && (
                <BinActionsSection
                  details={details}
                  permissions={permissions}
                  onViewHistory={handleViewHistory}
                  onReport={() => setReportOpen(true)}
                />
              )}

              {reportJustSubmitted && !reportOpen && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="type-emphasis text-emerald-900">
                    Report submitted
                  </p>
                  <p className="mt-1 type-text text-emerald-800">
                    Inventory Control will review it in the Stock Reports queue.
                  </p>
                </section>
              )}

              {reportOpen && details && (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="type-label mb-3">
                    File stock report
                  </h3>
                  <StockReportForm
                    fixedLocation={details.locationCode}
                    wmsStatusLabel={details.statusLabel}
                    wmsBinStatus={details.status}
                    filters={filters}
                    isSubmitting={isSubmittingReport}
                    onSubmit={(values) => void onSubmitReport(values)}
                    onCancel={() => setReportOpen(false)}
                  />
                </section>
              )}

              {showPalletActivity && details.stock && (
                <PalletDetailSections
                  details={details}
                  activityLog={activityLog}
                  historyDetail={historyDetail}
                  activityLoading={activityLoading}
                  onLoadReferenceSelect={onLoadReferenceSelect}
                  onActivityLocationSelect={onActivityLocationSelect}
                  layout="compact"
                />
              )}

              {!showPalletActivity && historyExpanded && (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="type-label mb-3">
                    Bin History
                  </h3>
                  {isHistoryLoading ? (
                    <p className="type-muted">
                      Loading bin history…
                    </p>
                  ) : history.length === 0 ? (
                    <p className="type-muted">
                      No history records found for this bin.
                    </p>
                  ) : (
                    <div className="space-y-3 border-l-2 border-slate-200 pl-4">
                      {history.map((record, index) => (
                        <HistoryDetailCard
                          key={`${record.date}-${record.action}-${index}`}
                          record={record}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              <Section title="Location">
                <DetailRow label="Location Code" value={details.locationCode} />
                <DetailRow label="Status" value={details.statusLabel} />
                {details.zone === "rack" ? (
                  <>
                    <DetailRow label="Zone" value="Rack storage" />
                    <DetailRow label="Aisle" value={details.aisle ?? "—"} />
                    <DetailRow label="Bay" value={details.bay ?? "—"} />
                    <DetailRow label="Level" value={details.level ?? "—"} />
                    <DetailRow label="Position" value={details.position ?? "—"} />
                  </>
                ) : (
                  <>
                    <DetailRow
                      label="Zone"
                      value={
                        details.zone === "instage"
                          ? "Instage (receiving)"
                          : "Outstage (shipping)"
                      }
                    />
                    <DetailRow label="Dock door" value={details.dockDoor ?? "—"} />
                    <DetailRow label="Position" value={details.dockPosition ?? "—"} />
                    {details.stagingWorkflowLabel ? (
                      <DetailRow
                        label="Workflow"
                        value={details.stagingWorkflowLabel}
                      />
                    ) : null}
                    {details.receiptReference ? (
                      onLoadReferenceSelect ? (
                        <ClickableDetailRow
                          label="Receipt / ASN"
                          value={details.receiptReference}
                          onClick={() =>
                            onLoadReferenceSelect(
                              "receipt",
                              details.receiptReference!,
                            )
                          }
                        />
                      ) : (
                        <DetailRow
                          label="Receipt / ASN"
                          value={details.receiptReference}
                        />
                      )
                    ) : null}
                    {details.outboundOrderReference ? (
                      onLoadReferenceSelect ? (
                        <ClickableDetailRow
                          label="Outbound order"
                          value={details.outboundOrderReference}
                          onClick={() =>
                            onLoadReferenceSelect(
                              "order",
                              details.outboundOrderReference!,
                            )
                          }
                        />
                      ) : (
                        <DetailRow
                          label="Outbound order"
                          value={details.outboundOrderReference}
                        />
                      )
                    ) : null}
                  </>
                )}
              </Section>

              {details.zone === "instage" && details.status === "empty" && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="type-emphasis text-amber-950">
                    Instage slot open
                  </p>
                  <p className="mt-1 type-text text-amber-900">
                    Ready for inbound trailer unload. Receipt scans post here
                    before putaway moves PLT to rack storage.
                  </p>
                </section>
              )}

              {details.zone === "outstage" && details.status === "empty" && (
                <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="type-emphasis text-violet-950">
                    Outstage slot open
                  </p>
                  <p className="mt-1 type-text text-violet-900">
                    Available for outbound order staging after pick confirmation
                    from rack locations.
                  </p>
                </section>
              )}

              {details.zone === "instage" &&
                details.status === "occupied" &&
                details.stock && (
                  <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="type-emphasis text-amber-950">
                      Awaiting putaway
                    </p>
                    <p className="mt-1 type-text text-amber-900">
                      {details.stock.quantityOnReceipt > 0
                        ? `${details.stock.quantityOnReceipt} EA on receipt at instage. Use Putaway from Quick actions to confirm rack location.`
                        : "PLT at instage — confirm putaway to a rack bin."}
                    </p>
                  </section>
                )}

              {details.zone === "outstage" &&
                details.status === "occupied" &&
                details.stock && (
                  <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                    <p className="type-emphasis text-violet-950">
                      Staged for outbound
                    </p>
                    <p className="mt-1 type-text text-violet-900">
                      {details.outboundOrderReference
                        ? `Order ${details.outboundOrderReference} · ${details.stock.quantityOnOrder} EA allocated for load.`
                        : "PLT staged for dispatch trailer loading."}
                    </p>
                  </section>
                )}

              {details.zone === "rack" &&
                details.status === "empty" &&
                details.inWmsAvailableFeed && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="type-emphasis text-emerald-900">
                    Location available
                  </p>
                  <p className="mt-1 type-text text-emerald-800">
                    The WMS lists this location as available. Include it on a
                    physical verification walk to confirm it is truly empty.
                  </p>
                </section>
              )}

              {details.zone === "rack" &&
                details.status === "empty" &&
                !details.inWmsAvailableFeed && (
                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="type-emphasis">
                    No stock on hand in WMS
                  </p>
                  <p className="mt-1 type-text">
                    This bin is not on the available list and has no stock
                    record in the current snapshot. Verify physically before
                    use.
                  </p>
                </section>
              )}

              <p className="text-xs leading-relaxed text-slate-500">
                Demo data only. Company names are used for sample portfolio
                visualization.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
