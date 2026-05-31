import { useMemo, type ReactNode } from "react";
import type {
  BinDetails,
  LoadReferenceKind,
  LocationHistoryRecord,
  StockOnHandRecord,
} from "../../types";
import {
  historyActionBadgeClass,
  historyActionDotClass,
} from "../../utils/historyActions";
import { ProductCardLines } from "../ProductCardLines";

export function sortHistoryAscending(
  records: LocationHistoryRecord[],
): LocationHistoryRecord[] {
  return [...records].sort(
    (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
  );
}

export function sortHistoryDescending(
  records: LocationHistoryRecord[],
): LocationHistoryRecord[] {
  return [...records].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
}

export function formatHoldStatus(stock: StockOnHandRecord): string {
  if (stock.holdStatus === "None") return "None";
  return `${stock.holdStatus} · ${stock.holdCode}`;
}

export function usePalletMovementHistory(
  details: BinDetails | null,
  history: LocationHistoryRecord[],
  palletHistory: LocationHistoryRecord[],
) {
  const movementHistory = useMemo(() => {
    if (!details?.stock) return [];
    if (palletHistory.length) return palletHistory;
    return history.filter(
      (record) => record.palletId === details.stock?.palletId,
    );
  }, [details?.stock, history, palletHistory]);

  const activityLog = useMemo(
    () => sortHistoryAscending(movementHistory),
    [movementHistory],
  );

  const historyDetail = useMemo(
    () => sortHistoryDescending(movementHistory),
    [movementHistory],
  );

  return { movementHistory, activityLog, historyDetail };
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="grid grid-cols-[minmax(9rem,42%)_1fr] items-start gap-x-4 gap-y-0.5 border-b border-slate-200/80 py-2 last:border-0">
      <dt className="type-label leading-snug">{label}</dt>
      <dd className="type-emphasis text-right leading-snug">{value}</dd>
    </div>
  );
}

export function ClickableDetailRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(9rem,42%)_1fr] items-start gap-x-4 gap-y-0.5 border-b border-slate-200/80 py-2 last:border-0">
      <dt className="type-label leading-snug">{label}</dt>
      <dd className="text-right leading-snug">
        <button
          type="button"
          onClick={onClick}
          className="type-code type-emphasis text-blue-700 hover:text-blue-900 hover:underline"
        >
          {value}
        </button>
      </dd>
    </div>
  );
}

export function DetailSection({
  title,
  id,
  children,
  className = "",
  compact = false,
}: {
  title: string;
  id?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-2 rounded-xl border border-slate-200 bg-slate-50 ${
        compact ? "p-3" : "p-4"
      } ${className}`}
    >
      <h3 className={`type-label ${compact ? "mb-2" : "mb-3"}`}>{title}</h3>
      <dl className="space-y-0">{children}</dl>
    </section>
  );
}

export function HistoryDetailCard({
  record,
  onLocationSelect,
  spacious = false,
}: {
  record: LocationHistoryRecord;
  onLocationSelect?: (locationCode: string) => void;
  spacious?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border border-slate-200 bg-white ${
        spacious ? "p-4" : "rounded-lg bg-slate-50 p-3"
      }`}
    >
      {!spacious && (
        <span
          className={`absolute -left-[1.3125rem] top-4 h-2.5 w-2.5 rounded-full ring-2 ring-white ${historyActionDotClass(record.action)}`}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 type-badge ${historyActionBadgeClass(record.action)}`}
        >
          {record.action}
        </span>
        <p className="type-muted">{record.date}</p>
      </div>
      <p className="type-label mt-2">Operator · {record.operator}</p>
      {onLocationSelect ? (
        <button
          type="button"
          onClick={() => onLocationSelect(record.locationCode)}
          className="type-code type-emphasis mt-2 text-blue-700 hover:text-blue-900 hover:underline"
        >
          {record.locationCode}
        </button>
      ) : (
        <p className="type-code type-emphasis mt-2">{record.locationCode}</p>
      )}
      <ProductCardLines
        className="mt-3"
        data={{
          clientCode: record.clientCode,
          itemId: record.itemId,
          productDescription: record.productDescription,
          lotNumber: record.lotNumber,
          palletId: record.palletId,
          locationCode: record.locationCode,
        }}
      />
      <div className="mt-3 grid gap-2 type-muted sm:grid-cols-2">
        <span>Available {record.quantityAvailable} EA</span>
        <span>On hand {record.quantityOnHand} EA</span>
        <span>On order {record.quantityOnOrder} EA</span>
        <span>On receipt {record.quantityOnReceipt} EA</span>
      </div>
      <p className="mt-3 type-muted">{record.packageDetails}</p>
      <p className="mt-1 type-muted">{record.quantityBreakdown}</p>
      <p className="mt-1 type-muted">{record.weightBreakdown}</p>
      <p className="mt-3 type-text leading-relaxed">{record.note}</p>
    </div>
  );
}

function ActivityLogRow({
  record,
  onLocationSelect,
  spacious = false,
}: {
  record: LocationHistoryRecord;
  onLocationSelect?: (locationCode: string) => void;
  spacious?: boolean;
}) {
  if (spacious) {
    return (
      <div className="relative rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 type-badge ${historyActionBadgeClass(record.action)}`}
            >
              {record.action}
            </span>
            <p className="type-label mt-2">Operator · {record.operator}</p>
          </div>
          <time className="type-muted">{record.date}</time>
        </div>
        {onLocationSelect ? (
          <button
            type="button"
            onClick={() => onLocationSelect(record.locationCode)}
            className="type-code type-emphasis mt-3 text-blue-700 hover:text-blue-900 hover:underline"
          >
            {record.locationCode}
          </button>
        ) : (
          <p className="type-code type-emphasis mt-3">{record.locationCode}</p>
        )}
        <p className="type-muted mt-2">
          Available {record.quantityAvailable} · On hand {record.quantityOnHand}{" "}
          · On order {record.quantityOnOrder} · On receipt{" "}
          {record.quantityOnReceipt}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-slate-200/80 py-2.5 last:border-0">
      <time className="type-muted leading-snug">{record.date}</time>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 type-badge ${historyActionBadgeClass(record.action)}`}
          >
            {record.action}
          </span>
          {onLocationSelect ? (
            <button
              type="button"
              onClick={() => onLocationSelect(record.locationCode)}
              className="type-code type-emphasis text-blue-700 hover:text-blue-900 hover:underline"
            >
              {record.locationCode}
            </button>
          ) : (
            <span className="type-code type-emphasis">{record.locationCode}</span>
          )}
        </div>
        <p className="type-muted mt-1">
          Operator · {record.operator} · Available {record.quantityAvailable} ·
          On hand {record.quantityOnHand} · On order {record.quantityOnOrder} ·
          On receipt {record.quantityOnReceipt}
        </p>
      </div>
    </div>
  );
}

type PalletSectionsProps = {
  details: BinDetails;
  activityLog: LocationHistoryRecord[];
  historyDetail: LocationHistoryRecord[];
  activityLoading: boolean;
  onLoadReferenceSelect?: (kind: LoadReferenceKind, reference: string) => void;
  onActivityLocationSelect?: (locationCode: string) => void;
  layout?: "compact" | "page";
};

export function PalletDetailSections({
  details,
  activityLog,
  historyDetail,
  activityLoading,
  onLoadReferenceSelect,
  onActivityLocationSelect,
  layout = "compact",
}: PalletSectionsProps) {
  const stock = details.stock!;
  const spacious = layout === "page";

  return (
    <>
      <div
        className={
          spacious
            ? "grid gap-4 lg:grid-cols-2"
            : "space-y-4"
        }
      >
        <DetailSection title="Current at location" compact={spacious} className={spacious ? "bg-white" : ""}>
          <DetailRow label="Location" value={details.locationCode} />
          <DetailRow label="Quantity available" value={stock.quantityAvailable} />
          <DetailRow label="Quantity on hand" value={stock.quantityOnHand} />
          <DetailRow label="Quantity on order" value={stock.quantityOnOrder} />
          <DetailRow label="Quantity on receipt" value={stock.quantityOnReceipt} />
          <DetailRow label="Hold status" value={formatHoldStatus(stock)} />
          {stock.holdStatus !== "None" && (
            <>
              <DetailRow label="Hold reason" value={stock.holdReason || "—"} />
              <DetailRow label="Hold date" value={stock.holdDate || "—"} />
            </>
          )}
        </DetailSection>

        <DetailSection title="Inventory identity" compact={spacious} className={spacious ? "bg-white" : ""}>
          <div className="mb-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
            <ProductCardLines
              data={{
                clientCode: stock.clientCode,
                itemId: stock.itemId,
                productDescription: stock.productDescription,
                lotNumber: stock.lotNumber,
                palletId: stock.palletId,
                locationCode: details.locationCode,
              }}
            />
          </div>
          <DetailRow label="Client name" value={stock.clientName} />
          <DetailRow label="Package details" value={stock.packageDetails} />
          <DetailRow label="Original receipt" value={stock.originalReceiptDate} />
          <DetailRow label="Expiry date" value={stock.expiryDate} />
          <DetailRow label="Last movement" value={stock.lastMovementDate} />
          <DetailRow label="Bin status" value={stock.binStatus} />
          {details.receiptReference && onLoadReferenceSelect ? (
            <ClickableDetailRow
              label="Receipt / ASN"
              value={details.receiptReference}
              onClick={() =>
                onLoadReferenceSelect("receipt", details.receiptReference!)
              }
            />
          ) : details.receiptReference ? (
            <DetailRow label="Receipt / ASN" value={details.receiptReference} />
          ) : null}
          {details.outboundOrderReference && onLoadReferenceSelect ? (
            <ClickableDetailRow
              label="Outbound order"
              value={details.outboundOrderReference}
              onClick={() =>
                onLoadReferenceSelect("order", details.outboundOrderReference!)
              }
            />
          ) : details.outboundOrderReference ? (
            <DetailRow label="Outbound order" value={details.outboundOrderReference} />
          ) : null}
        </DetailSection>
      </div>

      <div className={spacious ? "grid gap-4 xl:grid-cols-2" : "space-y-4"}>
        <section
          className={`rounded-xl border border-slate-200 ${
            spacious ? "bg-white p-4" : "bg-white p-4"
          }`}
        >
          <h3 className="type-label mb-1">Activity log</h3>
          <p className="type-muted mb-3">
            Where this PLT has been, oldest to newest.
          </p>
          {activityLoading ? (
            <p className="type-muted">Loading PLT activity…</p>
          ) : activityLog.length === 0 ? (
            <p className="type-muted">No movement history found for this PLT.</p>
          ) : spacious ? (
            <div className="relative space-y-3 pl-6">
              <div
                className="absolute bottom-2 left-[0.4375rem] top-2 w-0.5 bg-slate-200"
                aria-hidden
              />
              {activityLog.map((record, step) => (
                <div key={`${record.date}-${record.action}-${record.locationCode}`} className="relative">
                  <span
                    className="absolute -left-6 top-4 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-600 shadow-sm"
                  >
                    {step + 1}
                  </span>
                  <ActivityLogRow
                    record={record}
                    onLocationSelect={onActivityLocationSelect}
                    spacious
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3">
              {activityLog.map((record) => (
                <ActivityLogRow
                  key={`${record.date}-${record.action}-${record.locationCode}`}
                  record={record}
                  onLocationSelect={onActivityLocationSelect}
                />
              ))}
            </div>
          )}
        </section>

        <section
          id="pallet-history-detail"
          className={`rounded-xl border border-slate-200 ${
            spacious ? "bg-white p-4" : "bg-white p-4"
          }`}
        >
          <h3 className="type-label mb-3">History detail</h3>
          {activityLoading ? (
            <p className="type-muted">Loading history detail…</p>
          ) : historyDetail.length === 0 ? (
            <p className="type-muted">No detailed history records for this PLT.</p>
          ) : spacious ? (
            <div className="grid gap-3 md:grid-cols-2">
              {historyDetail.map((record) => (
                <HistoryDetailCard
                  key={`${record.date}-${record.action}-${record.locationCode}`}
                  record={record}
                  onLocationSelect={onActivityLocationSelect}
                  spacious
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3 border-l-2 border-slate-200 pl-4">
              {historyDetail.map((record) => (
                <HistoryDetailCard
                  key={`${record.date}-${record.action}-${record.locationCode}`}
                  record={record}
                  onLocationSelect={onActivityLocationSelect}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {spacious && (
        <DetailSection title="PLT breakdown" compact className="bg-white">
          <DetailRow label="CS/PLT" value={stock.casesPerPallet} />
          <DetailRow label="EA per case" value={stock.eachesPerCase} />
          <DetailRow label="Total EA" value={stock.totalEaches} />
          <DetailRow label="Quantity breakdown" value={stock.quantityBreakdown} />
          <DetailRow label="Weight breakdown" value={stock.weightBreakdown} />
        </DetailSection>
      )}
    </>
  );
}

export function statusBadgeClass(status: BinDetails["status"]): string {
  switch (status) {
    case "empty":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "occupied":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
