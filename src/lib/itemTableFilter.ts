import {
  defenseCellIsEmpty,
  isSeasonItemCell,
  itemQualityFilterBucket,
  ITEM_TYPE_REMARK_PRESET_EMOTE,
  ITEM_TYPE_REMARK_PRESET_FITTING_ROOM,
  parseCellAsFiniteNumber,
  rowMatchesEmotePreset,
  rowMatchesFittingRoomSkinPreset,
  rowMatchesKeyword,
  typeRemarkFilterKey,
} from "./xlsxHelpers.ts";
import { rowPassesColumnValueFilters } from "./columnValueFilter.ts";
import type { ItemTableFilter } from "../types.ts";

export type ItemFilterColIdx = {
  tr: number;
  def: number;
  qual: number;
  remark: number;
  season: number;
  type: number;
  sub: number;
};

export function mergeItemTypeRemarkOptionKeys(
  merged: string[],
  col: Pick<ItemFilterColIdx, "tr" | "remark" | "type" | "sub">,
): string[] {
  if (col.remark < 0 && col.tr < 0 && col.type < 0 && col.sub < 0) return [];

  const withoutPresets = merged.filter(
    (k) => k !== ITEM_TYPE_REMARK_PRESET_EMOTE && k !== ITEM_TYPE_REMARK_PRESET_FITTING_ROOM,
  );

  if (col.remark < 0 && col.tr < 0) {
    return col.type >= 0 || col.sub >= 0 ? [ITEM_TYPE_REMARK_PRESET_FITTING_ROOM] : [];
  }

  const presets: string[] = [];
  if (col.remark >= 0) presets.push(ITEM_TYPE_REMARK_PRESET_EMOTE);
  if (col.type >= 0 || col.sub >= 0) presets.push(ITEM_TYPE_REMARK_PRESET_FITTING_ROOM);

  const rest = col.tr >= 0 ? withoutPresets : [];
  return [...presets, ...rest];
}

export function rowPassesTypeRemarkFilterKeys(
  row: unknown[],
  typeRemarkKeys: string[],
  trCol: number,
  remarkCol: number,
  typeCol = -1,
  subCol = -1,
): boolean {
  if (typeRemarkKeys.length === 0) return true;
  for (const key of typeRemarkKeys) {
    if (key === ITEM_TYPE_REMARK_PRESET_EMOTE) {
      if (remarkCol < 0) continue;
      if (rowMatchesEmotePreset(row[remarkCol])) return true;
    } else if (key === ITEM_TYPE_REMARK_PRESET_FITTING_ROOM) {
      if (rowMatchesFittingRoomSkinPreset(row, typeCol, subCol)) return true;
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
  headers: readonly string[] = [],
): boolean {
  if (f.rowKeyword?.trim() && !rowMatchesKeyword(row, f.rowKeyword)) return false;
  if (f.customKeywordKeys?.length) {
    if (!f.customKeywordKeys.every((k) => rowMatchesKeyword(row, k))) return false;
  }
  if (f.typeRemarkKeys.length > 0) {
    if (!rowPassesTypeRemarkFilterKeys(row, f.typeRemarkKeys, col.tr, col.remark, col.type, col.sub))
      return false;
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
  if (f.seasonItemOnly && col.season >= 0) {
    if (!isSeasonItemCell(row[col.season])) return false;
  }
  if (!rowPassesColumnValueFilters(row, f.columnValueFilters, headers)) return false;
  return true;
}
