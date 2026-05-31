import type { SortDirection } from "../utils/listSort";

const OFF_OPTION = { value: "off" as const, label: "—" };

const DATE_OPTIONS = [
  OFF_OPTION,
  { value: "asc" as const, label: "Oldest first" },
  { value: "desc" as const, label: "Newest first" },
];

const PRIORITY_OPTIONS = [
  OFF_OPTION,
  { value: "asc" as const, label: "Lowest first" },
  { value: "desc" as const, label: "Highest first" },
];

const STATUS_OPTIONS = [
  OFF_OPTION,
  { value: "asc" as const, label: "Open first" },
  { value: "desc" as const, label: "Resolved first" },
];

const QUANTITY_OPTIONS = [
  OFF_OPTION,
  { value: "asc" as const, label: "Lowest qty" },
  { value: "desc" as const, label: "Highest qty" },
];

const LOCATION_OPTIONS = [
  OFF_OPTION,
  { value: "asc" as const, label: "A–Z" },
  { value: "desc" as const, label: "Z–A" },
];

type AxisSelectProps = {
  label: string;
  value: SortDirection;
  options: readonly { value: SortDirection; label: string }[];
  onChange: (value: SortDirection) => void;
};

function SortAxisSelect({ label, value, options, onChange }: AxisSelectProps) {
  return (
    <label className="type-label flex min-w-[9.5rem] flex-1 flex-col gap-1 sm:max-w-[11rem]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortDirection)}
        className="type-control w-full"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type Props = {
  date: SortDirection;
  priority: SortDirection;
  location: SortDirection;
  onDateChange: (value: SortDirection) => void;
  onPriorityChange: (value: SortDirection) => void;
  onLocationChange: (value: SortDirection) => void;
  /** Label for the middle axis (priority on counts, status on reports, qty on holds). */
  priorityLabel?: string;
  priorityOptions?: readonly { value: SortDirection; label: string }[];
};

export function ListSortAxes({
  date,
  priority,
  location,
  onDateChange,
  onPriorityChange,
  onLocationChange,
  priorityLabel = "Priority",
  priorityOptions = PRIORITY_OPTIONS,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <SortAxisSelect
          label="Date"
          value={date}
          options={DATE_OPTIONS}
          onChange={onDateChange}
        />
        <SortAxisSelect
          label={priorityLabel}
          value={priority}
          options={priorityOptions}
          onChange={onPriorityChange}
        />
        <SortAxisSelect
          label="Location"
          value={location}
          options={LOCATION_OPTIONS}
          onChange={onLocationChange}
        />
      </div>
      <p className="type-muted">
        Each sort is independent. Active sorts apply in order: date, then{" "}
        {priorityLabel.toLowerCase()}, then location. Use — to skip an axis.
      </p>
    </div>
  );
}

export { STATUS_OPTIONS, QUANTITY_OPTIONS };
