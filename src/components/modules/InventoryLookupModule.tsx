import { useState } from "react";
import { Search } from "lucide-react";
import { DashboardSectionHeader } from "../DashboardSectionHeader";
import { ProductCardLines } from "../ProductCardLines";
import type {
  Filters,
  InventoryLookupResult,
  LoadReferenceKind,
  StockOnHandRecord,
} from "../../types";
import { searchInventory, searchLoadReferences } from "../../services/wmsApi";
import type { LoadReferenceSearchResult } from "../../utils/loadReferenceSearch";
import { formatPltCount } from "../../utils/wmsLabels";

type Props = {
  filters: Filters;
  stockRecords: StockOnHandRecord[];
  onSelectLocation: (locationCode: string) => void;
  onSelectLoadReference: (kind: LoadReferenceKind, reference: string) => void;
};

export function InventoryLookupModule({
  filters,
  stockRecords,
  onSelectLocation,
  onSelectLoadReference,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InventoryLookupResult[]>([]);
  const [loadResults, setLoadResults] = useState<LoadReferenceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const [inventoryResults, referenceResults] = await Promise.all([
        searchInventory(query, filters),
        searchLoadReferences(query, stockRecords),
      ]);
      setResults(inventoryResults);
      setLoadResults(referenceResults);
    } finally {
      setIsSearching(false);
    }
  }

  const totalMatches = results.length + loadResults.length;

  return (
    <section className="module-panel p-5">
      <DashboardSectionHeader
        title="Inventory Lookup"
        description="Search PLT, items, receipts, orders, and locations."
      />

      <form onSubmit={(event) => void handleSearch(event)} className="mt-4 flex flex-wrap gap-3">
        <label className="min-w-[16rem] flex-1">
          <span className="sr-only">Search inventory</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Item, PLT, client, RCV-/ORD- reference, or location"
            className="w-full type-control"
          />
        </label>
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="type-btn gap-2 bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60"
        >
          <Search size={16} />
          {isSearching ? "Searching…" : "Search inventory"}
        </button>
      </form>

      <p className="mt-3 type-muted">
        Demo search scans stock-on-hand and load references (receipt / outbound
        order) across the warehouse snapshot.
      </p>

      {hasSearched && (
        <div className="mt-5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="type-heading">Search results</h3>
            <span className="type-muted">{totalMatches} matches</span>
          </div>

          {!totalMatches ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 type-muted">
              No inventory or load references matched your search.
            </p>
          ) : (
            <>
              {loadResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="type-label">Receipts & orders</h4>
                  {loadResults.map((record) => (
                    <button
                      key={`${record.kind}-${record.reference}`}
                      type="button"
                      onClick={() =>
                        onSelectLoadReference(record.kind, record.reference)
                      }
                      className="group w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-400 hover:bg-white"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="type-label">
                            {record.kind === "receipt"
                              ? "Receipt breakdown"
                              : "Order breakdown"}
                          </p>
                          <p className="type-heading mt-0.5 font-mono">
                            {record.reference}
                          </p>
                          <p className="type-muted mt-1">
                            {record.clientCode} · {record.clientName}
                          </p>
                        </div>
                        <span className="type-badge rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-800">
                          {formatPltCount(record.palletCount)}
                        </span>
                      </div>
                      <p className="type-label mt-2 transition group-hover:text-slate-600">
                        Open breakdown →
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="type-label">Inventory lines</h4>
                  {results.map((record) => (
                    <button
                      key={`${record.binCode}-${record.palletId}`}
                      type="button"
                      onClick={() => onSelectLocation(record.binCode)}
                      className="group w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-400 hover:bg-white"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <ProductCardLines
                          className="min-w-0 flex-1"
                          data={{
                            clientCode: record.clientCode,
                            itemId: record.itemId,
                            productDescription: record.productDescription,
                            lotNumber: record.lotNumber,
                            palletId: record.palletId,
                            locationCode: record.binCode,
                          }}
                        />
                        <span className="type-badge rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-800">
                          Matched on: {record.matchField}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 type-muted">
                        <span className="type-emphasis">
                          QOH {record.quantityOnHand} EA
                        </span>
                        <span>{record.packageDetails}</span>
                      </div>
                      <p className="type-label mt-2 transition group-hover:text-slate-600">
                        Jump to bin →
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
