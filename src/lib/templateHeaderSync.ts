import type { SavedTemplate } from "../types.ts";
import { findItemSheetRowByItemId } from "./itemWearValue.ts";
import {
  cellStr,
  resolveItemIdColumnIndex,
  resolveRemarkColumnIndex,
  resolveTaskIdColumnIndex,
  type SheetMatrix,
} from "./xlsxHelpers.ts";

export function headersCompatibleForAppend(
  currentHeader: unknown[] | undefined,
  snapHeader: unknown[] | undefined,
): boolean {
  if (!currentHeader?.length || !snapHeader?.length || currentHeader.length !== snapHeader.length) {
    return false;
  }
  for (let i = 0; i < currentHeader.length; i++) {
    if (cellStr(currentHeader[i]) !== cellStr(snapHeader[i])) return false;
  }
  return true;
}

export function isLegacySyntheticItemHeader(headers: unknown[] | undefined): boolean {
  if (!headers?.length) return false;
  const h = headers.map((x) => cellStr(x));
  return h.length === 3 && h[0] === "物品ID" && h[1] === "名称/备注" && h[2] === "数量";
}

function headerNames(row: unknown[]): string[] {
  return row.map((h) => cellStr(h));
}

function rowAlignedToMasterColumns(masterHeaderRow: unknown[], row: unknown[]): unknown[] {
  const width = masterHeaderRow.length;
  return Array.from({ length: width }, (_, ci) => (row[ci] != null ? row[ci] : ""));
}

export function realignAoaToMasterHeader(
  oldAoa: SheetMatrix,
  masterHeaderRow: unknown[],
  source: "item" | "task",
): SheetMatrix | null {
  if (!masterHeaderRow?.length || !oldAoa?.length) return null;
  if (headersCompatibleForAppend(oldAoa[0], masterHeaderRow)) return null;

  const oldHeaders = headerNames(oldAoa[0]!);
  const newHeaders = headerNames(masterHeaderRow);
  const idResolver = source === "item" ? resolveItemIdColumnIndex : resolveTaskIdColumnIndex;

  const newIdCol = idResolver(newHeaders);
  const oldIdCol = idResolver(oldHeaders);
  if (newIdCol < 0 || oldIdCol < 0) return null;

  const newIdxByName = new Map<string, number>();
  for (let i = 0; i < newHeaders.length; i++) {
    const name = newHeaders[i]!;
    if (name) newIdxByName.set(name, i);
  }

  const colMap: number[] = oldHeaders.map((name) => newIdxByName.get(name) ?? -1);
  if (colMap[oldIdCol] !== newIdCol) return null;

  const dataRows = oldAoa.slice(1).map((oldRow) => {
    const next: unknown[] = newHeaders.map(() => "");
    for (let oi = 0; oi < oldHeaders.length; oi++) {
      const ni = colMap[oi]!;
      if (ni >= 0 && oldRow) {
        next[ni] = oldRow[oi] != null ? oldRow[oi] : "";
      }
    }
    return next;
  });

  return [masterHeaderRow.slice(), ...dataRows];
}

export function expandLegacyItemTemplateAoa(
  tpl: SavedTemplate,
  itemAoa: SheetMatrix,
  remarkColHint: string | null,
): SheetMatrix | null {
  if (!itemAoa?.length || !tpl.items.length) return null;

  const masterHeader = itemAoa[0]!;
  const masterHeaders = headerNames(masterHeader);
  const idCol = resolveItemIdColumnIndex(masterHeaders);
  if (idCol < 0) return null;

  const remarkCol = resolveRemarkColumnIndex(masterHeaders, remarkColHint);

  const dataRows = tpl.items.map((it) => {
    const fullRow = findItemSheetRowByItemId(itemAoa, it.itemId);
    if (fullRow) return rowAlignedToMasterColumns(masterHeader, fullRow);

    const sparse: unknown[] = masterHeaders.map(() => "");
    sparse[idCol] = it.itemId;
    if (remarkCol >= 0 && it.label) sparse[remarkCol] = it.label;
    return sparse;
  });

  return [masterHeader.slice(), ...dataRows];
}

export function syncSavedTemplatesToMasterSheets(args: {
  templates: SavedTemplate[];
  itemAoa: SheetMatrix | null;
  taskAoa: SheetMatrix | null;
  itemRemarkColumn: string | null;
}): { templates: SavedTemplate[]; changedIds: string[] } {
  const changedIds: string[] = [];

  const templates = args.templates.map((tpl) => {
    if (tpl.source === "item") {
      if (!args.itemAoa?.length) return tpl;

      let nextAoa: SheetMatrix | null = null;
      if (isLegacySyntheticItemHeader(tpl.aoa[0])) {
        if (tpl.items.length > 0) {
          nextAoa = expandLegacyItemTemplateAoa(tpl, args.itemAoa, args.itemRemarkColumn);
        } else if (tpl.aoa.length > 1) {
          nextAoa = realignAoaToMasterHeader(tpl.aoa, args.itemAoa[0]!, "item");
        }
      } else if (tpl.aoa?.length) {
        nextAoa = realignAoaToMasterHeader(tpl.aoa, args.itemAoa[0]!, "item");
      }

      if (!nextAoa) return tpl;
      changedIds.push(tpl.id);
      return { ...tpl, aoa: nextAoa };
    }

    if (tpl.source === "task") {
      if (!args.taskAoa?.length || !tpl.aoa?.length) return tpl;
      const nextAoa = realignAoaToMasterHeader(tpl.aoa, args.taskAoa[0]!, "task");
      if (!nextAoa) return tpl;
      changedIds.push(tpl.id);
      return { ...tpl, aoa: nextAoa };
    }

    return tpl;
  });

  return { templates, changedIds };
}
