import { partitionRowsByPinOrder, type PinRowLike } from "./tablePinRows.ts";

export type TableSortState = { colIndex: number; descending: boolean } | null;

/**
 * When sorting is active, global column sort takes precedence over pinning.
 * When sorting is inactive, pinned rows are partitioned to the top.
 */
export function computeDisplayBodyRows<T extends PinRowLike & { row: unknown[] }>(
  filteredRows: T[],
  tableSort: TableSortState,
  pinnedOrder: number[],
  compareCells: (a: unknown, b: unknown) => number,
): T[] {
  if (tableSort) {
    const { colIndex, descending } = tableSort;
    const dir = descending ? -1 : 1;
    return [...filteredRows].sort((x, y) => dir * compareCells(x.row[colIndex], y.row[colIndex]));
  }

  return pinnedOrder.length ? partitionRowsByPinOrder(filteredRows, pinnedOrder) : filteredRows;
}

