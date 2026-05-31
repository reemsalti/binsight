type Tone = "slate" | "amber" | "emerald" | "red" | "blue";

const TONE_STYLES: Record<
  Tone,
  { base: string; selected: string }
> = {
  slate: {
    base: "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80",
    selected: "border-slate-900 bg-slate-50",
  },
  amber: {
    base: "border-amber-200/90 bg-white hover:border-amber-300 hover:bg-amber-50/50",
    selected: "border-amber-600 bg-amber-50/80",
  },
  emerald: {
    base: "border-emerald-200/90 bg-white hover:border-emerald-300 hover:bg-emerald-50/50",
    selected: "border-emerald-600 bg-emerald-50/80",
  },
  red: {
    base: "border-red-200/90 bg-white hover:border-red-300 hover:bg-red-50/50",
    selected: "border-red-600 bg-red-50/80",
  },
  blue: {
    base: "border-blue-200/90 bg-white hover:border-blue-300 hover:bg-blue-50/50",
    selected: "border-blue-600 bg-blue-50/80",
  },
};

type Props = {
  label: string;
  value: number;
  tone?: Tone;
  isSelected: boolean;
  onClick: () => void;
};

export function FilterSummaryCard({
  label,
  value,
  tone = "slate",
  isSelected,
  onClick,
}: Props) {
  const styles = TONE_STYLES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`rounded-xl border p-4 text-left transition-colors ${isSelected ? styles.selected : styles.base}`}
    >
      <p className="type-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
      {isSelected && <p className="type-label mt-1">Included</p>}
    </button>
  );
}

/** Toggle a value in a set (for multi-select summary filters). */
export function toggleSetMember<T>(set: Set<T>, member: T): Set<T> {
  const next = new Set(set);
  if (next.has(member)) {
    next.delete(member);
  } else {
    next.add(member);
  }
  return next;
}

export function matchesSummaryBuckets<T extends string>(
  buckets: Set<T>,
  matchers: Record<T, boolean>,
): boolean {
  for (const bucket of buckets) {
    if (matchers[bucket]) return true;
  }
  return false;
}
