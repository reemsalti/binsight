import { EmptyLocationRow } from "../types";
type Props = { title: string; rows: EmptyLocationRow[]; limit?: number; };
export function DataTable({ title, rows, limit = 12 }: Props) {
  const preview = rows.slice(0, limit);
  return <section className="rounded-2xl border bg-white p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-medium text-slate-950">{title}</h2><span className="type-muted">{rows.length} rows</span></div>{!rows.length ? <p className="type-muted">No rows yet.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-2 pr-4">Location</th><th className="py-2 pr-4">Preview</th></tr></thead><tbody>{preview.map((row)=><tr key={row.normalizedLocation} className="border-b last:border-0"><td className="whitespace-nowrap py-2 pr-4 font-semibold">{row.normalizedLocation}</td><td className="py-2 pr-4 text-slate-600">{Object.entries(row.original).slice(0,4).map(([key,value])=>`${key}: ${value}`).join(" • ")}</td></tr>)}</tbody></table>{rows.length > limit && <p className="mt-3 type-muted">Showing first {limit} rows.</p>}</div>}</section>;
}
