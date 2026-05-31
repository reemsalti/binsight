import { X } from "lucide-react";
import type { LoadReferenceBreakdown } from "../types";
import { formatPltCount } from "../utils/wmsLabels";
import { ProductCardLines } from "./ProductCardLines";

type Props = {
  breakdown: LoadReferenceBreakdown;
  onClose: () => void;
  onSelectLocation: (locationCode: string) => void;
};

export function LoadReferenceBreakdownPanel({
  breakdown,
  onClose,
  onSelectLocation,
}: Props) {
  const isReceipt = breakdown.kind === "receipt";
  const title = isReceipt ? "Receipt breakdown" : "Order breakdown";
  const accentBorder = isReceipt ? "border-amber-200" : "border-violet-200";
  const accentBg = isReceipt ? "bg-amber-50" : "bg-violet-50";
  const accentText = isReceipt ? "text-amber-950" : "text-violet-950";

  return (
    <aside className="flex max-h-full w-[28rem] min-h-0 shrink-0 flex-col border-l border-slate-300 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="type-badge text-slate-500">{title}</p>
          <h2 className="type-heading mt-0.5 font-mono">{breakdown.reference}</h2>
          <p className="type-muted mt-1">
            {breakdown.clientCode} · {breakdown.clientName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          aria-label="Close breakdown"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section
          className={`mb-4 rounded-xl border p-4 ${accentBorder} ${accentBg}`}
        >
          <p className={`type-emphasis ${accentText}`}>
            {formatPltCount(breakdown.palletCount)} ·{" "}
            {breakdown.totalQuantityEa.toLocaleString()} EA total
          </p>
          <p className="type-muted mt-1">
            {isReceipt
              ? "Inbound receipt lines staged or put away under this ASN."
              : "Outbound order lines picked and staged for load."}
          </p>
        </section>

        <div className="space-y-2">
          <h3 className="type-label">Lines</h3>
          {breakdown.lines.map((line) => (
            <button
              key={`${line.locationCode}-${line.palletId}`}
              type="button"
              onClick={() => onSelectLocation(line.locationCode)}
              className="group w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-400 hover:bg-white"
            >
              <ProductCardLines
                className="min-w-0"
                data={{
                  clientCode: line.clientCode,
                  itemId: line.itemId,
                  productDescription: line.productDescription,
                  lotNumber: line.lotNumber,
                  palletId: line.palletId,
                  locationCode: line.locationCode,
                }}
              />
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 type-muted">
                <span className="type-emphasis">
                  QOH {line.quantityOnHand.toLocaleString()} EA
                </span>
                <span>{line.packageDetails}</span>
              </div>
              <p className="type-label mt-2 transition group-hover:text-slate-600">
                View location →
              </p>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
