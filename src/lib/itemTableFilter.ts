import {
  defenseCellIsEmpty,
  itemQualityFilterBucket,
  ITEM_TYPE_REMARK_PRESET_EMOTE,
  parseCellAsFiniteNumber,
  rowMatchesEmotePreset,
  rowMatchesKeyword,
  typeRemarkFilterKey,
} from "./xlsxHelpers.ts";
import type { ItemTableFilter } from "../types.ts";

export type ItemFilterColIdx = { tr: number; def: number; qual: number; remark: number };

export function rowPassesTypeRemarkFilterKeys(
  row: unknown[],
  typeRemarkKeys: string[],
  trCol: number,
  remarkCol: number,
): boolean {
  if (typeRemarkKeys.length === 0) return true;
  for (const key of typeRemarkKeys) {
    if (key === ITEM_TYPE_REMARK_PRESET_EMOTE) {
      if (remarkCol < 0) continue;
      if (rowMatchesEmotePreset(row[remarkCol])) return true;
    } else {
      if (trCol < 0) continue;
      if (key === typeRemarkFilterKey(row[trCol])) return true;
    }
  }
  return false;
}

export function rowPassesItemTableFilter(
  row: unknown[],
  f: ItemTableFilter,
  col: ItemFilterColIdx,
): boolean {
  if (f.rowKeyword?.trim() && !rowMatchesKeyword(row, f.rowKeyword)) return false;
  if (f.customKeywordKeys?.length) {
    if (!f.customKeywordKeys.every((k) => rowMatchesKeyword(row, k))) return false;
  }
  if (f.typeRemarkKeys.length > 0) {
    if (!rowPassesTypeRemarkFilterKeys(row, f.typeRemarkKeys, col.tr, col.remark)) return false;
  }
  if (col.qual >= 0 && f.qualityKeys.length > 0) {
    if (!f.qualityKeys.includes(itemQualityFilterBucket(row[col.qual]))) return false;
  }
  const defenseAxis = f.defenseNone || f.defenseRange;
  if (col.def >= 0 && defenseAxis) {
    const empty = defenseCellIsEmpty(row[col.def]);
    const num = parseCellAsFiniteNumber(row[col.def]);
    let ok = false;
    if (f.defenseNone && empty) ok = true;
    if (f.defenseRange && num !== null) {
      let inRange = true;
      if (f.defenseMin !== null && num < f.defenseMin) inRange = false;
      if (f.defenseMax !== null && num > f.defenseMax) inRange = false;
      if (inRange) ok = true;
    }
    if (!ok) return false;
  }
  return true;
}
