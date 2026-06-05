import { parseTaskRowForComplete } from "./completeTask.ts";
import {
  cellStr,
  parseCellAsInteger,
  resolveItemIdColumnIndex,
  type SheetMatrix,
} from "./xlsxHelpers.ts";

export function parseItemRowId(aoa: SheetMatrix, dataIdx: number): string | null {
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveItemIdColumnIndex(headersRow);
  if (idCol < 0) return null;
  const row = aoa[dataIdx + 1];
  if (!row) return null;
  const q = parseCellAsInteger(row[idCol]);
  const idKey = q != null ? String(q) : cellStr(row[idCol]).trim();
  return idKey || null;
}

export function parseTableRowIdForCopy(
  aoa: SheetMatrix,
  dataIdx: number,
  source: "item" | "task",
): string | null {
  if (source === "task") {
    return parseTaskRowForComplete(aoa, dataIdx)?.taskId ?? null;
  }
  return parseItemRowId(aoa, dataIdx);
}

export function resolveTableContextDataIdx(target: EventTarget | null): number | null {
  if (!(target instanceof Element)) return null;
  const tr = target.closest("tr[data-data-idx]");
  if (!tr) return null;
  const raw = tr.getAttribute("data-data-idx");
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
