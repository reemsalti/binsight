import { ArrowLeft } from "lucide-react";
import type {
  BinDetails,
  LoadReferenceKind,
  LocationHistoryRecord,
} from "../../types";
import {
  PalletDetailSections,
  statusBadgeClass,
  usePalletMovementHistory,
} from "../pallet/PalletDetailShared";

type Props = {
  details: BinDetails | null;
  history: LocationHistoryRecord[];
  palletHistory: LocationHistoryRecord[];
  isLoading: boolean;
  isPalletHistoryLoading: boolean;
  isHistoryLoading: boolean;
  onBack: () => void;
  onLoadReferenceSelect?: (kind: LoadReferenceKind, reference: string) => void;
  onActivityLocationSelect?: (locationCode: string) => void;
};

function zoneWorkflowBanner(details: BinDetails) {
  if (details.zone === "instage" && details.status === "occupied" && details.stock) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
        <p className="type-emphasis text-amber-950">Awaiting putaway</p>
        <p className="mt-1 type-text text-amber-900">
          {details.stock.quantityOnReceipt > 0
            ? `${details.stock.quantityOnReceipt} EA on receipt at instage.`
            : "PLT at instage — confirm putaway to a rack bin."}
          {details.receiptReference ? ` Receipt ${details.receiptReference}.` : ""}
        </p>
      </section>
    );
  }

  if (details.zone === "outstage" && details.status === "occupied" && details.stock) {
    return (
      <section className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5">
        <p className="type-emphasis text-violet-950">Staged for outbound</p>
        <p className="mt-1 type-text text-violet-900">
          {details.outboundOrderReference
            ? `Order ${details.outboundOrderReference} · ${details.stock.quantityOnOrder} EA allocated for load.`
            : "PLT staged for dispatch trailer loading."}
        </p>
      </section>
    );
  }

  return null;
}

export function PalletDetailPage({
  details,
  history,
  palletHistory,
  isLoading,
  isPalletHistoryLoading,
  isHistoryLoading,
  onBack,
  onLoadReferenceSelect,
  onActivityLocationSelect,
}: Props) {
  const { activityLog, historyDetail } = usePalletMovementHistory(
    details,
    history,
    palletHistory,
  );
  const activityLoading = isPalletHistoryLoading || isHistoryLoading;
  const stock = details?.stock;

  const handleActivitySelect = (locationCode: string) => {
    onBack();
    onActivityLocationSelect?.(locationCode);
  };

  const handleLoadReference = (kind: LoadReferenceKind, reference: string) => {
    onBack();
    onLoadReferenceSelect?.(kind, reference);
  };

  return (
    <div className="module-workspace flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:px-6">
        {isLoading || !details || !stock ? (
          <p className="type-muted">Loading PLT details…</p>
        ) : (
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={onBack}
                className="type-emphasis inline-flex shrink-0 items-center gap-1.5 text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft size={15} />
                Back to blueprint
              </button>
              <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="type-heading font-mono tracking-tight">{stock.palletId}</h1>
                <span className="type-muted font-mono">{details.locationCode}</span>
                <span
                  className={`type-badge inline-flex rounded-full border px-2.5 py-0.5 ${statusBadgeClass(details.status)}`}
                >
                  {details.statusLabel}
                </span>
              </div>
            </div>

            {zoneWorkflowBanner(details)}
            <PalletDetailSections
              details={details}
              activityLog={activityLog}
              historyDetail={historyDetail}
              activityLoading={activityLoading}
              onLoadReferenceSelect={handleLoadReference}
              onActivityLocationSelect={handleActivitySelect}
              layout="page"
            />
          </div>
        )}
      </div>
    </div>
  );
}
