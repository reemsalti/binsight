import type { DemoPermission, DemoUser } from "../mock-data/demoUser";

export function hasPermission(
  userOrPermissions: DemoUser | DemoPermission[],
  permission: DemoPermission,
): boolean {
  const permissions = Array.isArray(userOrPermissions)
    ? userOrPermissions
    : userOrPermissions.permissions;
  return permissions.includes(permission);
}
