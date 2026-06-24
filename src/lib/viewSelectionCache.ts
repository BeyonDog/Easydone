import type { ActiveView } from "../types.ts";

export type ViewSelectionSnapshot = {
  selectedRows: number[];
  selectedRowOrder: number[];
  itemLineQty: Record<number, number>;
  itemLineWear: Record<number, number>;
  wearRowOverride: number[];
  itemLineDurability: Record<number, number>;
  durabilityRowOverride: number[];
};

export function viewSelectionKey(view: ActiveView): string | null {
  if (view.kind === "item") return "item";
  if (view.kind === "task") return "task";
  if (view.kind === "template" || view.kind === "snapshot") return `template:${view.id}`;
  return null;
}

export function snapshotFromSelection(
  selectedRows: Set<number>,
  selectedRowOrder: number[],
  itemLineQty: Record<number, number>,
  itemLineWear: Record<number, number> = {},
  wearRowOverride: ReadonlySet<number> = new Set(),
  itemLineDurability: Record<number, number> = {},
  durabilityRowOverride: ReadonlySet<number> = new Set(),
): ViewSelectionSnapshot {
  return {
    selectedRows: [...selectedRows],
    selectedRowOrder: [...selectedRowOrder],
    itemLineQty: { ...itemLineQty },
    itemLineWear: { ...itemLineWear },
    wearRowOverride: [...wearRowOverride],
    itemLineDurability: { ...itemLineDurability },
    durabilityRowOverride: [...durabilityRowOverride],
  };
}

export function applySnapshot(snapshot: ViewSelectionSnapshot): {
  selectedRows: Set<number>;
  selectedRowOrder: number[];
  itemLineQty: Record<number, number>;
  itemLineWear: Record<number, number>;
  wearRowOverride: Set<number>;
  itemLineDurability: Record<number, number>;
  durabilityRowOverride: Set<number>;
} {
  return {
    selectedRows: new Set(snapshot.selectedRows),
    selectedRowOrder: [...snapshot.selectedRowOrder],
    itemLineQty: { ...snapshot.itemLineQty },
    itemLineWear: { ...(snapshot.itemLineWear ?? {}) },
    wearRowOverride: new Set(snapshot.wearRowOverride ?? []),
    itemLineDurability: { ...(snapshot.itemLineDurability ?? {}) },
    durabilityRowOverride: new Set(snapshot.durabilityRowOverride ?? []),
  };
}
