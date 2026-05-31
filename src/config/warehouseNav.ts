import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  ClipboardList,
  Eye,
  Flag,
  History,
  MapPin,
  PackageSearch,
  ShieldAlert,
} from "lucide-react";
import type { DemoPermission } from "../mock-data/demoUser";
import type { WarehouseModule } from "../types";

export type WarehouseNavItem = {
  id: WarehouseModule;
  label: string;
  title: string;
  icon: LucideIcon;
  permission?: DemoPermission;
};

export const WAREHOUSE_NAV: WarehouseNavItem[] = [
  {
    id: "work-queue",
    label: "Queue",
    title: "Work queue — reports, holds, and counts needing attention",
    icon: ClipboardList,
  },
  {
    id: "bin-visibility",
    label: "Bins",
    title: "Bin visibility — rack blueprint and location drill-down",
    icon: MapPin,
    permission: "view_bins",
  },
  {
    id: "inventory-lookup",
    label: "Lookup",
    title: "Inventory lookup — search items, PLT, and locations",
    icon: PackageSearch,
    permission: "view_inventory",
  },
  {
    id: "location-history",
    label: "History",
    title: "Location history — receipts, moves, and adjustments",
    icon: History,
    permission: "view_location_history",
  },
  {
    id: "cycle-count",
    label: "Counts",
    title: "Investigation item counts — recounts and variance review",
    icon: ClipboardCheck,
    permission: "view_inventory",
  },
  {
    id: "stock-holds",
    label: "Holds",
    title: "Stock holds monitoring",
    icon: ShieldAlert,
    permission: "view_inventory",
  },
  {
    id: "location-availability",
    label: "Available",
    title: "Location availability and verification check sheet",
    icon: Eye,
    permission: "view_bins",
  },
  {
    id: "stock-reports",
    label: "Reports",
    title: "Stock reports queue",
    icon: Flag,
    permission: "view_inventory",
  },
];
