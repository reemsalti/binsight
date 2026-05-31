import type { DemoPermission } from "../mock-data/demoUser";
import type { WarehouseModule } from "../types";
import {
  ClipboardCheck,
  Eye,
  Flag,
  History,
  MapPin,
  PackageSearch,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type OperationModuleDef = {
  id: WarehouseModule;
  title: string;
  description: string;
  icon: LucideIcon;
  permission: DemoPermission;
};

export const WAREHOUSE_MODULES: OperationModuleDef[] = [
  {
    id: "bin-visibility",
    title: "Bin Visibility",
    description:
      "Rack blueprint, bin status, and location drill-down across aisles.",
    icon: MapPin,
    permission: "view_bins",
  },
  {
    id: "inventory-lookup",
    title: "Inventory Lookup",
    description: "Search PLT, item, client, and location-level inventory.",
    icon: PackageSearch,
    permission: "view_inventory",
  },
  {
    id: "location-history",
    title: "Location History",
    description:
      "Review prior receipts, moves, picks, and adjustments by location.",
    icon: History,
    permission: "view_location_history",
  },
  {
    id: "cycle-count",
    title: "Investigation Item Counts",
    description:
      "Track floor investigation counts, quantity variances, and IC review outcomes.",
    icon: ClipboardCheck,
    permission: "view_inventory",
  },
  {
    id: "stock-holds",
    title: "Stock Holds",
    description:
      "Monitor QA holds, damage blocks, returns, recalls, and quarantine status.",
    icon: ShieldAlert,
    permission: "view_inventory",
  },
  {
    id: "location-availability",
    title: "Location Availability",
    description:
      "Review available bin locations and export a verification check sheet for a physical walk.",
    icon: Eye,
    permission: "view_bins",
  },
  {
    id: "stock-reports",
    title: "Stock Reports",
    description:
      "Review and resolve floor reports of misplaced or unexpected stock.",
    icon: Flag,
    permission: "view_inventory",
  },
];

type Props = {
  selectedModule: WarehouseModule;
  onSelectModule: (module: WarehouseModule) => void;
  allowedModules: WarehouseModule[];
};

export function OperationModules({
  selectedModule,
  onSelectModule,
  allowedModules,
}: Props) {
  const visibleModules = WAREHOUSE_MODULES.filter((module) =>
    allowedModules.includes(module.id),
  );

  return (
    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-4">
        <h2 className="type-heading">
          Operations modules
        </h2>
        <p className="mt-1 type-muted">
          WMS-side tools for bin visibility, inventory control, stock holds, and
          investigation item count operations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleModules.map((module) => {
          const Icon = module.icon;
          const isSelected = selectedModule === module.id;

          return (
            <button
              key={module.id}
              type="button"
              onClick={() => onSelectModule(module.id)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  isSelected
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <Icon size={18} />
              </div>
              <h3 className="mt-3 text-sm font-medium">{module.title}</h3>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  isSelected ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {module.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
