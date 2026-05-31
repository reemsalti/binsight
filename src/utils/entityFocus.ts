import { useEffect } from "react";

export function entityFocusDomId(entityId: string): string {
  return `entity-focus-${entityId}`;
}

export function useScrollToEntityFocus(
  entityId: string | null | undefined,
  ready: boolean,
): void {
  useEffect(() => {
    if (!entityId || !ready) return;
    const element = document.getElementById(entityFocusDomId(entityId));
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [entityId, ready]);
}

export function entityFocusRingClass(isFocused: boolean): string {
  return isFocused ? "ring-2 ring-slate-900 border-slate-900" : "";
}
