import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  ClipboardCheck,
  ClipboardList,
  FileWarning,
  Flag,
  Layers,
  MapPinCheck,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Printer,
  RotateCcw,
  ShieldCheck,
  ShieldMinus,
  ShieldPlus,
  SlidersHorizontal,
  Target,
  Truck,
  UserCheck,
} from "lucide-react";
import type { DemoPermission } from "../mock-data/demoUser";
import type { WarehouseModule } from "../types";

export type WarehouseActionId =
  | "relocate"
  | "bin_transfer"
  | "putaway"
  | "adjustment"
  | "inventory_status"
  | "place_hold"
  | "release_hold"
  | "damage_client"
  | "investigation_recount"
  | "qa_hold"
  | "stock_report"
  | "return_vendor"
  | "scrap"
  | "reprint_label"
  | "audit_by_operator"
  | "putaway_audit"
  | "relocation_audit"
  | "pick_accuracy_audit"
  | "empty_location_audit"
  | "hold_compliance_audit"
  | "receipt_audit";

export type WarehouseActionKind = "navigate" | "form";

export type WarehouseAction = {
  id: WarehouseActionId;
  group: string;
  label: string;
  description: string;
  icon: LucideIcon;
  kind: WarehouseActionKind;
  permission?: DemoPermission;
  targetModule?: WarehouseModule;
};

export const WAREHOUSE_ACTION_GROUPS: { title: string; actions: WarehouseAction[] }[] =
  [
    {
      title: "Movement",
      actions: [
        {
          id: "relocate",
          group: "Movement",
          label: "Relocate PLT",
          description: "Move stock from one bin to another",
          icon: Truck,
          kind: "form",
          permission: "request_adjustments",
        },
        {
          id: "bin_transfer",
          group: "Movement",
          label: "Bin transfer",
          description: "Transfer quantity within the same facility",
          icon: ArrowRightLeft,
          kind: "form",
          permission: "request_adjustments",
        },
        {
          id: "putaway",
          group: "Movement",
          label: "Putaway",
          description: "Move receipt PLT from instage to rack storage",
          icon: PackagePlus,
          kind: "form",
          permission: "request_adjustments",
        },
      ],
    },
    {
      title: "Inventory",
      actions: [
        {
          id: "adjustment",
          group: "Inventory",
          label: "Quantity adjustment",
          description: "Correct on-hand quantity after count or damage",
          icon: SlidersHorizontal,
          kind: "form",
          permission: "request_adjustments",
        },
        {
          id: "inventory_status",
          group: "Inventory",
          label: "Change inventory status",
          description: "Update available, damaged, or hold eligibility",
          icon: Layers,
          kind: "navigate",
          permission: "view_inventory",
          targetModule: "inventory-lookup",
        },
      ],
    },
    {
      title: "Audits",
      actions: [
        {
          id: "audit_by_operator",
          group: "Audits",
          label: "Audit by operator",
          description: "Review scans and transactions for a specific user",
          icon: UserCheck,
          kind: "form",
          permission: "view_inventory",
        },
        {
          id: "putaway_audit",
          group: "Audits",
          label: "Putaway audit",
          description: "Verify receipt putaways match WMS location records",
          icon: PackageCheck,
          kind: "form",
          permission: "view_inventory",
        },
        {
          id: "relocation_audit",
          group: "Audits",
          label: "Relocation audit",
          description: "Sample moves and bin transfers for accuracy",
          icon: ArrowRightLeft,
          kind: "form",
          permission: "view_inventory",
        },
        {
          id: "pick_accuracy_audit",
          group: "Audits",
          label: "Pick accuracy audit",
          description: "Compare picked quantity to order and scan trail",
          icon: Target,
          kind: "form",
          permission: "view_inventory",
        },
        {
          id: "receipt_audit",
          group: "Audits",
          label: "Receipt audit",
          description: "Check inbound receipts against ASN and labels",
          icon: ClipboardList,
          kind: "form",
          permission: "view_inventory",
        },
        {
          id: "empty_location_audit",
          group: "Audits",
          label: "Empty location audit",
          description: "Walk available bins and confirm physically clear",
          icon: MapPinCheck,
          kind: "navigate",
          permission: "view_bins",
          targetModule: "location-availability",
        },
        {
          id: "hold_compliance_audit",
          group: "Audits",
          label: "Hold compliance audit",
          description: "Review active holds, codes, and release documentation",
          icon: ShieldCheck,
          kind: "navigate",
          permission: "view_inventory",
          targetModule: "stock-holds",
        },
      ],
    },
    {
      title: "Holds",
      actions: [
        {
          id: "place_hold",
          group: "Holds",
          label: "Place hold",
          description: "Block allocation on a PLT or location",
          icon: ShieldPlus,
          kind: "form",
          permission: "request_adjustments",
        },
        {
          id: "release_hold",
          group: "Holds",
          label: "Release hold",
          description: "Clear an active or pending-release hold",
          icon: ShieldMinus,
          kind: "navigate",
          permission: "request_hold_release",
          targetModule: "stock-holds",
        },
      ],
    },
    {
      title: "Quality & client",
      actions: [
        {
          id: "damage_client",
          group: "Quality & client",
          label: "Damage report to client",
          description: "Notify the client of damaged inventory",
          icon: FileWarning,
          kind: "form",
          permission: "request_adjustments",
        },
        {
          id: "investigation_recount",
          group: "Quality & client",
          label: "Investigation recount",
          description: "Floor count after pick or variance review",
          icon: ClipboardCheck,
          kind: "navigate",
          permission: "view_inventory",
          targetModule: "cycle-count",
        },
        {
          id: "qa_hold",
          group: "Quality & client",
          label: "QA / inspection hold",
          description: "Hold stock pending quality sign-off",
          icon: ShieldPlus,
          kind: "form",
          permission: "request_adjustments",
        },
      ],
    },
    {
      title: "Reporting & other",
      actions: [
        {
          id: "stock_report",
          group: "Reporting & other",
          label: "File stock report",
          description: "Misplaced, missing, or unexpected stock",
          icon: Flag,
          kind: "navigate",
          permission: "request_adjustments",
          targetModule: "stock-reports",
        },
        {
          id: "return_vendor",
          group: "Reporting & other",
          label: "Return to vendor",
          description: "Create an RTV movement from hold stock",
          icon: RotateCcw,
          kind: "form",
          permission: "request_adjustments",
        },
        {
          id: "scrap",
          group: "Reporting & other",
          label: "Scrap / disposal",
          description: "Remove unsellable quantity from inventory",
          icon: PackageMinus,
          kind: "form",
          permission: "request_adjustments",
        },
        {
          id: "reprint_label",
          group: "Reporting & other",
          label: "Reprint PLT label",
          description: "Reprint barcode for a PLT or location",
          icon: Printer,
          kind: "form",
        },
      ],
    },
  ];

export function listVisibleWarehouseActions(
  permissions: DemoPermission[],
): typeof WAREHOUSE_ACTION_GROUPS {
  const has = (p?: DemoPermission) => !p || permissions.includes(p);

  return WAREHOUSE_ACTION_GROUPS.map((group) => ({
    ...group,
    actions: group.actions.filter((action) => has(action.permission)),
  })).filter((group) => group.actions.length > 0);
}
