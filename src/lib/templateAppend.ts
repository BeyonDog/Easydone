import type { SavedTemplate } from "../types.ts";
import { itemsFromItemAoa } from "./templateMigrate.ts";
import {
  cellStr,
  parseCellAsInteger,
  resolveItemIdColumnIndex,
  resolveTaskIdColumnIndex,
  type SheetMatrix,
} from "./xlsxHelpers.ts";

export function parseTemplateRowIdFromDataRow(
  headerRow: unknown[],
  dataRow: unknown[],
  source: "item" | "task",
): string | null {
  const headers = headerRow.map((h) => cellStr(h));
  const idCol = source === "item" ? resolveItemIdColumnIndex(headers) : resolveTaskIdColumnIndex(headers);
  if (idCol < 0) return null;
  const rawId = dataRow[idCol];
  const q = parseCellAsInteger(rawId);
  const idKey = q != null ? String(q) : cellStr(rawId).trim();
  return idKey || null;
}

export function collectTemplateRowIds(aoa: SheetMatrix, source: "item" | "task"): Set<string> {
  const ids = new Set<string>();
  if (!aoa?.length) return ids;
  const headerRow = aoa[0]!;
  for (let i = 1; i < aoa.length; i++) {
    const id = parseTemplateRowIdFromDataRow(headerRow, aoa[i] ?? [], source);
    if (id) ids.add(id);
  }
  return ids;
}

export function partitionRowsForTemplateAppend(args: {
  templateAoa: SheetMatrix;
  source: "item" | "task";
  candidateIdxs: number[];
  candidateDataRows: unknown[][];
}): {
  appendIdxs: number[];
  appendDataRows: unknown[][];
  skippedIdxs: number[];
  skippedCount: number;
} {
  const existingIds = collectTemplateRowIds(args.templateAoa, args.source);
  const headerRow = args.templateAoa[0]!;
  const appendIdxs: number[] = [];
  const appendDataRows: unknown[][] = [];
  const skippedIdxs: number[] = [];

  for (let i = 0; i < args.candidateIdxs.length; i++) {
    const idx = args.candidateIdxs[i]!;
    const row = args.candidateDataRows[i]!;
    const id = parseTemplateRowIdFromDataRow(headerRow, row, args.source);
    if (id && existingIds.has(id)) {
      skippedIdxs.push(idx);
      continue;
    }
    appendIdxs.push(idx);
    appendDataRows.push(row);
    if (id) existingIds.add(id);
  }

  return { appendIdxs, appendDataRows, skippedIdxs, skippedCount: skippedIdxs.length };
}

export function dedupeTemplateAoa(
  tpl: SavedTemplate,
  itemRemarkColumn: string | null,
): { tpl: SavedTemplate; removedCount: number } {
  if (!tpl.aoa?.length || tpl.aoa.length <= 1) {
    return { tpl, removedCount: 0 };
  }

  const headerRow = tpl.aoa[0]!;
  const seen = new Set<string>();
  const keptRows: unknown[][] = [];
  let removedCount = 0;

  for (let i = 1; i < tpl.aoa.length; i++) {
    const row = tpl.aoa[i] ?? [];
    const id = parseTemplateRowIdFromDataRow(headerRow, row, tpl.source);
    if (id && seen.has(id)) {
      removedCount++;
      continue;
    }
    keptRows.push(row);
    if (id) seen.add(id);
  }

  if (removedCount === 0) {
    return { tpl, removedCount: 0 };
  }

  const nextAoa: SheetMatrix = [tpl.aoa[0]!, ...keptRows];
  if (tpl.source === "item") {
    const items = itemsFromItemAoa(nextAoa, itemRemarkColumn);
    return { tpl: { ...tpl, aoa: nextAoa, items }, removedCount };
  }
  return { tpl: { ...tpl, aoa: nextAoa }, removedCount };
}

export function dedupeAllSavedTemplates(
  templates: SavedTemplate[],
  itemRemarkColumn: string | null,
): { templates: SavedTemplate[]; changedIds: string[] } {
  const changedIds: string[] = [];
  const result = templates.map((tpl) => {
    const { tpl: next, removedCount } = dedupeTemplateAoa(tpl, itemRemarkColumn);
    if (removedCount > 0) changedIds.push(tpl.id);
    return next;
  });
  return { templates: result, changedIds };
}
