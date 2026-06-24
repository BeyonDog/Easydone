import { resolveItemRowTypeColumnIndex } from "./itemTypeLookup.ts";
import {
  cellStr,
  parseCellAsInteger,
  resolveItemIdColumnIndex,
  resolveTypeRemarkColumnIndex,
  typeRemarkFilterKey,
  type SheetMatrix,
} from "./xlsxHelpers.ts";
import type { SendTemplateItem } from "../types";

export const ITEM_WEAR_MIN = 0;
export const ITEM_WEAR_MAX = 100;
export const DEFAULT_ITEM_WEAR_VALUE = 100;

export const ITEM_DURABILITY_MIN = 0;

export function clampItemWearValue(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_ITEM_WEAR_VALUE;
  return Math.min(ITEM_WEAR_MAX, Math.max(ITEM_WEAR_MIN, Math.trunc(n)));
}

export function clampItemDurability(n: number, max: number): number {
  const cap = Math.max(0, Math.trunc(max));
  if (!Number.isFinite(n)) return cap;
  return Math.min(cap, Math.max(ITEM_DURABILITY_MIN, Math.trunc(n)));
}

export function parseItemWearInput(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return clampItemWearValue(fallback);
  return clampItemWearValue(Number.parseInt(trimmed, 10));
}

export function parseItemDurabilityInput(raw: string, fallback: number, max: number): number {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return clampItemDurability(fallback, max);
  return clampItemDurability(Number.parseInt(trimmed, 10), max);
}

export function resolveInitDurabilityColumnIndex(headersRow: string[]): number {
  for (let i = 0; i < headersRow.length; i++) {
    if (cellStr(headersRow[i]).trim() === "初始耐久") return i;
  }
  return -1;
}

export function rowInitDurabilityMax(row: unknown[], initDurCol: number): number {
  if (initDurCol < 0) return 0;
  const n = parseCellAsInteger(row[initDurCol]);
  return n != null && n >= 0 ? n : 0;
}

export function rowSupportsWearValue(row: unknown[], typeCol: number, typeRemarkCol: number): boolean {
  if (typeCol >= 0) {
    const t = parseCellAsInteger(row[typeCol]);
    if (t === 1 || t === 2) return true;
  }
  if (typeRemarkCol >= 0) {
    const tr = typeRemarkFilterKey(row[typeRemarkCol]);
    if (tr === "武器" || tr === "防具") return true;
  }
  return false;
}

export function rowSupportsDurabilityValue(
  row: unknown[],
  typeCol: number,
  typeRemarkCol: number,
  initDurCol: number,
): boolean {
  if (typeRemarkCol >= 0) {
    const tr = typeRemarkFilterKey(row[typeRemarkCol]);
    if (tr === "钥匙") return true;
  }
  if (typeCol >= 0) {
    const t = parseCellAsInteger(row[typeCol]);
    if (t === 5) return true;
    if (t === 4 && initDurCol >= 0) {
      return rowInitDurabilityMax(row, initDurCol) > 0;
    }
  }
  return false;
}

export function rowSupportsItemValueInput(
  row: unknown[],
  typeCol: number,
  typeRemarkCol: number,
  initDurCol: number,
): boolean {
  return (
    rowSupportsWearValue(row, typeCol, typeRemarkCol) ||
    rowSupportsDurabilityValue(row, typeCol, typeRemarkCol, initDurCol)
  );
}

export function resolveRowWearValue(
  dataIdx: number,
  row: unknown[],
  typeCol: number,
  typeRemarkCol: number,
  itemLineWear: Record<number, number>,
  wearRowOverride: ReadonlySet<number>,
  defaultWearValue: number,
): number | undefined {
  if (!rowSupportsWearValue(row, typeCol, typeRemarkCol)) return undefined;
  if (wearRowOverride.has(dataIdx)) {
    return clampItemWearValue(itemLineWear[dataIdx] ?? defaultWearValue);
  }
  return clampItemWearValue(defaultWearValue);
}

export function resolveRowDurabilityValue(
  dataIdx: number,
  row: unknown[],
  typeCol: number,
  typeRemarkCol: number,
  initDurCol: number,
  itemLineDurability: Record<number, number>,
  durabilityRowOverride: ReadonlySet<number>,
): number | undefined {
  if (!rowSupportsDurabilityValue(row, typeCol, typeRemarkCol, initDurCol)) return undefined;
  const max = rowInitDurabilityMax(row, initDurCol);
  if (durabilityRowOverride.has(dataIdx)) {
    return clampItemDurability(itemLineDurability[dataIdx] ?? max, max);
  }
  return clampItemDurability(max, max);
}

export function displayRowWearValue(
  dataIdx: number,
  itemLineWear: Record<number, number>,
  wearRowOverride: ReadonlySet<number>,
  defaultWearValue: number,
): number {
  if (wearRowOverride.has(dataIdx)) {
    return clampItemWearValue(itemLineWear[dataIdx] ?? defaultWearValue);
  }
  return clampItemWearValue(defaultWearValue);
}

export function displayRowDurabilityValue(
  dataIdx: number,
  row: unknown[],
  initDurCol: number,
  itemLineDurability: Record<number, number>,
  durabilityRowOverride: ReadonlySet<number>,
): number {
  const max = rowInitDurabilityMax(row, initDurCol);
  if (durabilityRowOverride.has(dataIdx)) {
    return clampItemDurability(itemLineDurability[dataIdx] ?? max, max);
  }
  return clampItemDurability(max, max);
}

export type SendItemsWearOptions = {
  defaultWearValue: number;
  itemLineWear: Record<number, number>;
  wearRowOverride: ReadonlySet<number>;
  typeCol: number;
  typeRemarkCol: number;
  initDurCol: number;
  itemLineDurability: Record<number, number>;
  durabilityRowOverride: ReadonlySet<number>;
};

function itemIdKeyFromCell(raw: unknown): string {
  const q = parseCellAsInteger(raw);
  return q != null ? String(q) : cellStr(raw).trim();
}

export function findItemSheetRowByItemId(aoa: SheetMatrix, itemId: string): unknown[] | null {
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveItemIdColumnIndex(headersRow);
  if (idCol < 0) return null;
  const target = itemId.trim();
  if (!target) return null;
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row) continue;
    if (itemIdKeyFromCell(row[idCol]) === target) return row;
  }
  return null;
}

export type TemplateItemValueHydration = {
  itemLineWear: Record<number, number>;
  wearRowOverride: Set<number>;
  itemLineDurability: Record<number, number>;
  durabilityRowOverride: Set<number>;
};

/** 打开道具模板时，将 tpl.items 中保存的 wear/durability 写入行级状态 */
export function hydrateItemValuesFromTemplateItems(
  aoa: SheetMatrix,
  items: SendTemplateItem[],
): TemplateItemValueHydration {
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveItemIdColumnIndex(headersRow);
  const typeCol = resolveItemRowTypeColumnIndex(headersRow);
  const typeRemarkCol = resolveTypeRemarkColumnIndex(headersRow);
  const initDurCol = resolveInitDurabilityColumnIndex(headersRow);

  const wearById = new Map<string, number>();
  const durById = new Map<string, number>();
  for (const it of items) {
    if (it.wearValue != null) wearById.set(it.itemId.trim(), it.wearValue);
    if (it.durabilityValue != null) durById.set(it.itemId.trim(), it.durabilityValue);
  }

  const itemLineWear: Record<number, number> = {};
  const wearRowOverride = new Set<number>();
  const itemLineDurability: Record<number, number> = {};
  const durabilityRowOverride = new Set<number>();

  if (idCol < 0) {
    return { itemLineWear, wearRowOverride, itemLineDurability, durabilityRowOverride };
  }

  for (let di = 0; di < aoa.length - 1; di++) {
    const row = aoa[di + 1];
    if (!row) continue;
    const id = itemIdKeyFromCell(row[idCol]);
    if (!id) continue;

    const savedWear = wearById.get(id);
    if (savedWear != null && rowSupportsWearValue(row, typeCol, typeRemarkCol)) {
      itemLineWear[di] = clampItemWearValue(savedWear);
      wearRowOverride.add(di);
    }

    const savedDur = durById.get(id);
    if (savedDur != null && rowSupportsDurabilityValue(row, typeCol, typeRemarkCol, initDurCol)) {
      const max = rowInitDurabilityMax(row, initDurCol);
      itemLineDurability[di] = clampItemDurability(savedDur, max);
      durabilityRowOverride.add(di);
    }
  }

  return { itemLineWear, wearRowOverride, itemLineDurability, durabilityRowOverride };
}

/** 模板发送：为缺失 wearValue / durabilityValue 的项按 Item 表补默认 */
export function enrichSendItemsFromItemSheet(
  items: SendTemplateItem[],
  itemAoa: SheetMatrix | null,
  defaultWearValue: number,
): SendTemplateItem[] {
  if (!itemAoa?.length) return items;
  const headersRow = itemAoa[0]?.map((h) => cellStr(h)) ?? [];
  const typeCol = resolveItemRowTypeColumnIndex(headersRow);
  const typeRemarkCol = resolveTypeRemarkColumnIndex(headersRow);
  const initDurCol = resolveInitDurabilityColumnIndex(headersRow);
  if (typeCol < 0 && typeRemarkCol < 0 && initDurCol < 0) return items;

  const wearDefault = clampItemWearValue(defaultWearValue);
  return items.map((it) => {
    let next = it;
    if (it.wearValue == null) {
      const row = findItemSheetRowByItemId(itemAoa, it.itemId);
      if (row && rowSupportsWearValue(row, typeCol, typeRemarkCol)) {
        next = { ...next, wearValue: wearDefault };
      }
    }
    if (it.durabilityValue == null) {
      const row = findItemSheetRowByItemId(itemAoa, it.itemId);
      if (row && rowSupportsDurabilityValue(row, typeCol, typeRemarkCol, initDurCol)) {
        const max = rowInitDurabilityMax(row, initDurCol);
        next = { ...next, durabilityValue: max };
      }
    }
    return next;
  });
}

/** @deprecated 使用 enrichSendItemsFromItemSheet */
export const enrichSendItemsWearFromItemSheet = enrichSendItemsFromItemSheet;

export function itemDurabilityMaxForSendItem(
  itemAoa: SheetMatrix | null,
  itemId: string,
): number | undefined {
  if (!itemAoa?.length) return undefined;
  const row = findItemSheetRowByItemId(itemAoa, itemId);
  if (!row) return undefined;
  const headersRow = itemAoa[0]?.map((h) => cellStr(h)) ?? [];
  const initDurCol = resolveInitDurabilityColumnIndex(headersRow);
  const typeCol = resolveItemRowTypeColumnIndex(headersRow);
  const typeRemarkCol = resolveTypeRemarkColumnIndex(headersRow);
  if (!rowSupportsDurabilityValue(row, typeCol, typeRemarkCol, initDurCol)) return undefined;
  return rowInitDurabilityMax(row, initDurCol);
}

export function sendItemMergeKey(
  itemId: string,
  wearValue?: number,
  durabilityValue?: number,
): string {
  if (wearValue != null) return `${itemId}\0w:${wearValue}`;
  if (durabilityValue != null) return `${itemId}\0d:${durabilityValue}`;
  return itemId;
}

export function parseSendItemMergeKey(mergeKey: string): {
  itemId: string;
  wearValue?: number;
  durabilityValue?: number;
} {
  const idx = mergeKey.indexOf("\0");
  if (idx < 0) return { itemId: mergeKey };
  const itemId = mergeKey.slice(0, idx);
  const suffix = mergeKey.slice(idx + 1);
  if (suffix.startsWith("w:")) {
    const wearValue = Number.parseInt(suffix.slice(2), 10);
    return Number.isFinite(wearValue) ? { itemId, wearValue } : { itemId };
  }
  if (suffix.startsWith("d:")) {
    const durabilityValue = Number.parseInt(suffix.slice(2), 10);
    return Number.isFinite(durabilityValue) ? { itemId, durabilityValue } : { itemId };
  }
  const legacyWear = Number.parseInt(suffix, 10);
  if (Number.isFinite(legacyWear)) return { itemId, wearValue: legacyWear };
  return { itemId: mergeKey };
}
