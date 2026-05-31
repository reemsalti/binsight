import type { Filters } from "../types";

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
};

export function AisleFilterBar({ filters, onChange }: Props) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-3">
        <h2 className="type-heading">Aisle range filter</h2>
        <p className="type-muted">
          Applies to WMS demo feed results across KPIs, blueprint, and audit
          tables.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Aisle from
          <input
            className="w-28 rounded-xl border px-3 py-2"
            type="number"
            min={601}
            max={622}
            value={filters.aisleFrom}
            onChange={(event) =>
              onChange({ ...filters, aisleFrom: Number(event.target.value) })
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Aisle to
          <input
            className="w-28 rounded-xl border px-3 py-2"
            type="number"
            min={601}
            max={622}
            value={filters.aisleTo}
            onChange={(event) =>
              onChange({ ...filters, aisleTo: Number(event.target.value) })
            }
          />
        </label>
      </div>
    </section>
  );
}
