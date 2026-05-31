import { Truck } from "lucide-react";
import type { LoadReferenceKind } from "../types";
import type { StagingZoneBlueprint } from "../utils/warehouseStagingBlueprint";

const STAGING_ZONE_STYLES = {
  instage: {
    panel: "border-amber-300/90 bg-amber-50/50",
    header: "text-amber-950",
    door: "border-amber-200 bg-amber-100/80 text-amber-900",
    floor: "border-amber-200/80 bg-amber-50/60",
    pallet:
      "border-orange-400 bg-orange-100 text-orange-950 hover:bg-orange-200",
    empty: "text-amber-800/70",
  },
  outstage: {
    panel: "border-violet-300/90 bg-violet-50/50",
    header: "text-violet-950",
    door: "border-violet-200 bg-violet-100/80 text-violet-900",
    floor: "border-violet-200/80 bg-violet-50/60",
    pallet:
      "border-indigo-400 bg-indigo-100 text-indigo-950 hover:bg-indigo-200",
    empty: "text-violet-800/70",
  },
} as const;

type Props = {
  blueprint: StagingZoneBlueprint;
  selectedLocation: string | null;
  onBinSelect: (locationCode: string) => void;
  onLoadReferenceSelect: (kind: LoadReferenceKind, reference: string) => void;
};

export function StagingDockBlueprint({
  blueprint,
  selectedLocation,
  onBinSelect,
  onLoadReferenceSelect,
}: Props) {
  const styles = STAGING_ZONE_STYLES[blueprint.zone];
  const isInstage = blueprint.zone === "instage";

  return (
    <section
      className={`rounded-xl border-2 border-dashed p-4 ${styles.panel}`}
      aria-label={blueprint.title}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${styles.door}`}
          >
            <Truck size={16} className={isInstage ? "rotate-180" : ""} />
          </span>
          <div>
            <p className={`type-emphasis ${styles.header}`}>{blueprint.title}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {blueprint.docks.map((dock) => (
          <div
            key={dock.dockDoor}
            className="rounded-lg border border-white/70 bg-white/80 p-3"
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
              <div>
                <p className={`type-emphasis ${styles.header}`}>{dock.dockLabel}</p>
                {dock.clientCode ? (
                  <p className="type-label mt-0.5">{dock.clientCode}</p>
                ) : (
                  <p className={`type-muted mt-0.5 ${styles.empty}`}>
                    No PLT staged
                  </p>
                )}
              </div>
              {dock.loadReference ? (
                <button
                  type="button"
                  onClick={() =>
                    onLoadReferenceSelect(
                      isInstage ? "receipt" : "order",
                      dock.loadReference!,
                    )
                  }
                  className="type-code type-emphasis rounded px-1 py-0.5 text-blue-700 transition hover:bg-blue-50 hover:text-blue-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                >
                  {dock.loadReference}
                </button>
              ) : null}
            </div>

            <div
              className={`min-h-[5.5rem] rounded-lg border border-dashed p-3 ${styles.floor}`}
            >
              {dock.pallets.length ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {dock.pallets.map((pallet) => (
                    <button
                      key={pallet.location}
                      type="button"
                      title={`${pallet.location} · ${pallet.productDescription}`}
                      onClick={() => onBinSelect(pallet.location)}
                      className={`flex h-[4.25rem] w-[5.75rem] shrink-0 flex-col items-center justify-center rounded-md border px-1.5 py-1.5 text-center transition ${styles.pallet} ${
                        selectedLocation === pallet.location
                          ? "ring-2 ring-slate-900 ring-offset-1"
                          : ""
                      }`}
                    >
                      <span className="block w-full text-center font-mono text-[11px] font-semibold tabular-nums leading-none">
                        {pallet.palletId}
                      </span>
                      <span className="mt-1 line-clamp-2 w-full text-center text-[10px] leading-tight opacity-80">
                        {pallet.productDescription}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`type-muted py-4 text-center ${styles.empty}`}>
                  Open floor
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
