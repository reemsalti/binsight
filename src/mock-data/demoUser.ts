export type DemoPermission =
  | "view_bins"
  | "view_inventory"
  | "view_location_history"
  | "export_reports"
  | "request_adjustments"
  | "request_hold_release";

export type DemoUser = {
  name: string;
  role: string;
  accessLevel: string;
  permissions: DemoPermission[];
};

export const demoUser: DemoUser = {
  name: "Reem",
  role: "Inventory Control Coordinator",
  accessLevel: "Inventory Access",
  permissions: [
    "view_bins",
    "view_inventory",
    "view_location_history",
    "export_reports",
    "request_adjustments",
    "request_hold_release",
  ],
};
