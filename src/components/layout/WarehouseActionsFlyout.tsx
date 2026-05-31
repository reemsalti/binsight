import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import type { DemoPermission } from "../../mock-data/demoUser";
import {
  listVisibleWarehouseActions,
  type WarehouseAction,
} from "../../config/warehouseActions";
import type { WarehouseModule } from "../../types";
import { WarehouseActionDialog } from "./WarehouseActionDialog";

type Props = {
  permissions: DemoPermission[];
  allowedModules: WarehouseModule[];
  onSelectModule: (module: WarehouseModule) => void;
};

type MenuLayout = {
  top: number;
  bottom: number;
  left: number;
};

const PAGE_INSET_PX = 8;

function measureMenuLayout(button: HTMLButtonElement): MenuLayout {
  return {
    top: PAGE_INSET_PX,
    bottom: PAGE_INSET_PX,
    left: button.getBoundingClientRect().right + 10,
  };
}

export function WarehouseActionsFlyout({
  permissions,
  allowedModules,
  onSelectModule,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [formAction, setFormAction] = useState<WarehouseAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuLayout, setMenuLayout] = useState<MenuLayout>({
    top: 0,
    bottom: PAGE_INSET_PX,
    left: 0,
  });

  const groups = listVisibleWarehouseActions(permissions);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updateLayout = () => {
      if (!buttonRef.current) return;
      setMenuLayout(measureMenuLayout(buttonRef.current));
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);

    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleAction = (action: WarehouseAction) => {
    setNotice(null);
    if (action.kind === "form") {
      setFormAction(action);
      setIsOpen(false);
      return;
    }
    if (
      action.targetModule &&
      allowedModules.includes(action.targetModule)
    ) {
      onSelectModule(action.targetModule);
      setNotice(`${action.label} — continue in the module that opened.`);
    } else {
      setNotice("You do not have access to that module in this demo.");
    }
    setIsOpen(false);
  };

  const menuPortal =
    isOpen &&
    createPortal(
      <>
        <button
          type="button"
          aria-label="Close quick actions menu"
          className="fixed inset-0 z-[200] cursor-default bg-slate-900/35 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
        />
        <div
          role="menu"
          style={{
            top: menuLayout.top,
            bottom: menuLayout.bottom,
            left: menuLayout.left,
          }}
          className="fixed z-[210] flex w-[19rem] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/90 bg-slate-900 px-3 py-2.5 text-white">
            <p className="type-label text-white">Quick actions</p>
            <button
              type="button"
              aria-label="Close quick actions menu"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-0.5 text-slate-300 hover:bg-white/15 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white py-1">
            {groups.map((group) => (
              <div key={group.title} className="border-b border-slate-100 last:border-b-0">
                <p className="type-label bg-slate-100 px-3 py-1.5">{group.title}</p>
                <ul className="px-1 py-1">
                  {group.actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <li key={action.id}>
                        <button
                          type="button"
                          role="menuitem"
                          title={action.description}
                          onClick={() => handleAction(action)}
                          className="menu-item-hover-delay flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-800">
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="type-emphasis block">{action.label}</span>
                            <span className="type-muted mt-0.5 block leading-snug">
                              {action.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </>,
      document.body,
    );

  return (
    <div className="relative z-[220] px-1.5">
      <button
        ref={buttonRef}
        type="button"
        title="Quick actions — moves, audits, adjustments, holds, and reports"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 transition ${
          isOpen
            ? "bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-2 ring-offset-white"
            : "bg-blue-50 text-blue-900 hover:bg-blue-100"
        }`}
      >
        <Plus size={18} strokeWidth={2.5} />
        <span
          className={`max-w-full text-center leading-tight text-[10px] font-medium ${
            isOpen ? "text-white" : "text-blue-800"
          }`}
        >
          Quick
          <br />
          actions
        </span>
      </button>

      {menuPortal}

      {notice &&
        createPortal(
          <div
            role="status"
            className="fixed bottom-5 left-1/2 z-[220] flex max-w-md -translate-x-1/2 items-start gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-3"
          >
            <p className="type-text min-w-0 flex-1">{notice}</p>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
              className="shrink-0 rounded-md p-0.5 text-slate-500 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>,
          document.body,
        )}

      {formAction && (
        <WarehouseActionDialog
          action={formAction}
          onClose={() => setFormAction(null)}
          onSubmitted={(message) => setNotice(message)}
        />
      )}
    </div>
  );
}
