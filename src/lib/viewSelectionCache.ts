import type { ActiveView } from "../types.ts";

export type ViewSelectionSnapshot = {
  selectedRows: number[];
  selectedRowOrder: number[];
  itemLineQty: Record<number, number>;
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
): ViewSelectionSnapshot {
  return {
    selectedRows: [...selectedRows],
    selectedRowOrder: [...selectedRowOrder],
    itemLineQty: { ...itemLineQty },
  };
}

export function applySnapshot(snapshot: ViewSelectionSnapshot): {
  selectedRows: Set<number>;
  selectedRowOrder: number[];
  itemLineQty: Record<number, number>;
} {
  return {
    selectedRows: new Set(snapshot.selectedRows),
    selectedRowOrder: [...snapshot.selectedRowOrder],
    itemLineQty: { ...snapshot.itemLineQty },
  };
}
