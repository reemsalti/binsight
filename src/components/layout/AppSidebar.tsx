import { WAREHOUSE_NAV, type WarehouseNavItem } from "../../config/warehouseNav";
import type { DemoPermission } from "../../mock-data/demoUser";
import type { WarehouseModule } from "../../types";
import { WarehouseActionsFlyout } from "./WarehouseActionsFlyout";

type Props = {
  selectedModule: WarehouseModule;
  onSelectModule: (module: WarehouseModule) => void;
  allowedModules: WarehouseModule[];
  permissions: DemoPermission[];
};

export function AppSidebar({
  selectedModule,
  onSelectModule,
  allowedModules,
  permissions,
}: Props) {
  const visibleNav = WAREHOUSE_NAV.filter((item) =>
    allowedModules.includes(item.id),
  );

  return (
    <nav
      className="surface-card flex h-full w-[4.75rem] shrink-0 flex-col gap-0.5 overflow-hidden py-1.5"
      aria-label="Operations modules"
    >
      <WarehouseActionsFlyout
        permissions={permissions}
        allowedModules={allowedModules}
        onSelectModule={onSelectModule}
      />

      <div className="mx-2 border-t border-slate-200" aria-hidden />

      {visibleNav.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          isSelected={selectedModule === item.id}
          onSelect={() => onSelectModule(item.id)}
        />
      ))}
    </nav>
  );
}

function NavButton({
  item,
  isSelected,
  onSelect,
}: {
  item: WarehouseNavItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      title={item.title}
      onClick={onSelect}
      className={`mx-1.5 flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors ${
        isSelected
          ? "bg-blue-600 text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      <Icon size={18} strokeWidth={isSelected ? 2.25 : 2} />
      <span
        className={`max-w-full text-center leading-tight ${
          isSelected ? "text-[10px] font-medium text-white" : "type-nav"
        }`}
      >
        {item.label}
      </span>
    </button>
  );
}
