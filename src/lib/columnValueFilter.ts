import { typeRemarkFilterKey } from "./xlsxHelpers.ts";

export function columnFilterKey(header: string, colIndex: number): string {
  const trimmed = header.trim();
  return trimmed || `__col_${colIndex}`;
}

export function columnCellFilterKey(cell: unknown): string {
  return typeRemarkFilterKey(cell);
}

export function sortColumnFilterValues(values: readonly string[]): string[] {
  const s = new Set(values);
  const hasEmpty = s.has("空");
  if (hasEmpty) s.delete("空");
  const sorted = [...s].sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  return hasEmpty ? ["空", ...sorted] : sorted;
}

export function collectColumnUniqueValues(
  rows: readonly { row: unknown[] }[],
  colIndex: number,
): string[] {
  if (colIndex < 0) return [];
  const set = new Set<string>();
  for (const { row } of rows) {
    set.add(columnCellFilterKey(row[colIndex]));
  }
  return sortColumnFilterValues([...set]);
}

export function resolveColumnIndexFromFilterKey(headers: readonly string[], key: string): number {
  const m = /^__col_(\d+)$/.exec(key);
  if (m) {
    const idx = Number(m[1]);
    return Number.isFinite(idx) && idx >= 0 && idx < headers.length ? idx : -1;
  }
  for (let i = 0; i < headers.length; i++) {
    if (columnFilterKey(headers[i] ?? "", i) === key) return i;
  }
  return -1;
}

export function columnValueFiltersActive(filters: Record<string, string[]> | undefined | null): boolean {
  if (!filters) return false;
  return Object.values(filters).some((selected) => selected.length > 0);
}

export function rowPassesColumnValueFilters(
  row: unknown[],
  filters: Record<string, string[]> | undefined | null,
  headers: readonly string[],
): boolean {
  if (!filters || !columnValueFiltersActive(filters)) return true;
  for (const [key, selected] of Object.entries(filters)) {
    if (!selected.length) continue;
    const colIdx = resolveColumnIndexFromFilterKey(headers, key);
    if (colIdx < 0) continue;
    const cellKey = columnCellFilterKey(row[colIdx]);
    if (!selected.includes(cellKey)) return false;
  }
  return true;
}

export function cloneColumnValueFilters(
  filters: Record<string, string[]> | undefined | null,
): Record<string, string[]> {
  if (!filters) return {};
  return Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, [...v]]));
}

export function normalizeColumnValueFiltersFromDisk(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== "string") continue;
    const arr = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    if (arr.length) out[k] = arr;
  }
  return out;
}

export function isColumnValueFilterActiveForColumn(
  filters: Record<string, string[]> | undefined | null,
  header: string,
  colIndex: number,
): boolean {
  if (!filters) return false;
  const key = columnFilterKey(header, colIndex);
  return (filters[key]?.length ?? 0) > 0;
}
