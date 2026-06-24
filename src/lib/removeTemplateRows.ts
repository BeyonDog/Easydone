import type { SheetMatrix } from "./xlsxHelpers.ts";

/** 决定要从模板中删除哪些 dataIdx（0-based，不含表头） */
export function resolveTemplateRowsToDelete(
  dataIdx: number | null,
  selectedRows: Set<number>,
): Set<number> {
  if (selectedRows.size >= 2) return new Set(selectedRows);
  if (dataIdx != null) return new Set([dataIdx]);
  if (selectedRows.size === 1) return new Set(selectedRows);
  return new Set();
}

/** 从 aoa 中移除指定 dataIdx 行，保留表头 */
export function removeDataRowsFromAoa(aoa: SheetMatrix, rowsToRemove: Set<number>): SheetMatrix {
  if (!aoa.length || rowsToRemove.size === 0) return aoa;
  const header = aoa[0];
  const dataRows = aoa.slice(1).filter((_, i) => !rowsToRemove.has(i));
  return [header, ...dataRows];
}
