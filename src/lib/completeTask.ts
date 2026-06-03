import {
  cellStr,
  parseCellAsInteger,
  resolveRemarkColumnIndex,
  resolveTaskChainColumnIndex,
  resolveTaskIdColumnIndex,
  type SheetMatrix,
} from "./xlsxHelpers.ts";

export type ParsedTaskRow = {
  taskId: string;
  remarkLabel: string;
};

export type TaskIdSortKey = {
  num: number | null;
  str: string;
};

export function taskIdSortKeyFromCell(v: unknown): TaskIdSortKey {
  const q = parseCellAsInteger(v);
  if (q != null) return { num: q, str: String(q) };
  const str = cellStr(v).trim();
  return { num: null, str };
}

export function compareTaskIdSortKeys(a: TaskIdSortKey, b: TaskIdSortKey): number {
  if (a.num != null && b.num != null) return a.num - b.num;
  if (a.num != null) return -1;
  if (b.num != null) return 1;
  return a.str.localeCompare(b.str, undefined, { numeric: true });
}

export function parseTaskRowForComplete(currentAoa: SheetMatrix, dataIdx: number): ParsedTaskRow | null {
  const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveTaskIdColumnIndex(headersRow);
  if (idCol < 0) return null;
  const row = currentAoa[dataIdx + 1];
  if (!row) return null;
  const key = taskIdSortKeyFromCell(row[idCol]);
  const taskId = key.num != null ? String(key.num) : key.str;
  if (!taskId) return null;
  const remarkCol = resolveRemarkColumnIndex(headersRow, null);
  const remarkLabel = remarkCol >= 0 ? cellStr(row[remarkCol]) : "";
  return { taskId, remarkLabel };
}

export function formatTaskCompleteToast(parsed: ParsedTaskRow, remaining?: number): string {
  const base = parsed.remarkLabel.trim()
    ? `已完成${parsed.remarkLabel.trim()}`
    : `已完成任务 ${parsed.taskId}`;
  if (remaining != null && remaining > 0) {
    return `${base}（剩余 ${remaining} 个）`;
  }
  return base;
}

/** First dataIdx in check order that is still selected (not used for GMT completion order). */
export function headSelectedDataIdx(order: number[], selected: Set<number>): number | null {
  for (const di of order) {
    if (selected.has(di)) return di;
  }
  return null;
}

/** Pick the selected row with the smallest 任务ID (numeric ascending). */
export function pickNextTaskRowByIdAsc(aoa: SheetMatrix, selectedRows: Set<number>): number | null {
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveTaskIdColumnIndex(headersRow);
  if (idCol < 0) return null;

  let best: { di: number; key: TaskIdSortKey } | null = null;
  for (const di of selectedRows) {
    const row = aoa[di + 1];
    if (!row) continue;
    const key = taskIdSortKeyFromCell(row[idCol]);
    if (key.num == null && !key.str) continue;
    if (!best || compareTaskIdSortKeys(key, best.key) < 0) {
      best = { di, key };
    }
  }
  return best?.di ?? null;
}

export type TaskChainValidationResult = { ok: true } | { ok: false; message: string };

function chainKeyFromCell(v: unknown): string {
  const q = parseCellAsInteger(v);
  if (q != null) return String(q);
  return cellStr(v).trim();
}

function isTaskIdBetweenInclusive(id: TaskIdSortKey, min: TaskIdSortKey, max: TaskIdSortKey): boolean {
  return compareTaskIdSortKeys(id, min) >= 0 && compareTaskIdSortKeys(id, max) <= 0;
}

/** Same-chain selected task IDs must fill the min–max interval with no gaps. */
export function validateTaskChainSelection(
  aoa: SheetMatrix,
  selectedRows: Set<number>,
): TaskChainValidationResult {
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const chainCol = resolveTaskChainColumnIndex(headersRow);
  const idCol = resolveTaskIdColumnIndex(headersRow);
  if (chainCol < 0 || idCol < 0) return { ok: true };

  const selectedByChain = new Map<string, { dataIdx: number; idKey: TaskIdSortKey }[]>();
  for (const di of selectedRows) {
    const row = aoa[di + 1];
    if (!row) continue;
    const chainKey = chainKeyFromCell(row[chainCol]);
    if (!chainKey) continue;
    const idKey = taskIdSortKeyFromCell(row[idCol]);
    if (idKey.num == null && !idKey.str) continue;
    const list = selectedByChain.get(chainKey) ?? [];
    list.push({ dataIdx: di, idKey });
    selectedByChain.set(chainKey, list);
  }

  const messages: string[] = [];
  for (const [chainKey, selectedInChain] of selectedByChain) {
    let min = selectedInChain[0]!.idKey;
    let max = selectedInChain[0]!.idKey;
    for (const entry of selectedInChain) {
      if (compareTaskIdSortKeys(entry.idKey, min) < 0) min = entry.idKey;
      if (compareTaskIdSortKeys(entry.idKey, max) > 0) max = entry.idKey;
    }

    const missing: string[] = [];
    for (let di = 0; di < aoa.length - 1; di++) {
      const row = aoa[di + 1];
      if (!row) continue;
      if (chainKeyFromCell(row[chainCol]) !== chainKey) continue;
      const idKey = taskIdSortKeyFromCell(row[idCol]);
      if (idKey.num == null && !idKey.str) continue;
      if (!isTaskIdBetweenInclusive(idKey, min, max)) continue;
      if (!selectedRows.has(di)) {
        missing.push(idKey.num != null ? String(idKey.num) : idKey.str);
      }
    }

    if (missing.length > 0) {
      messages.push(`任务链 ${chainKey} 漏勾任务 ID：${missing.join("、")}`);
    }
  }

  if (messages.length === 0) return { ok: true };
  return { ok: false, message: messages.join("；") };
}
