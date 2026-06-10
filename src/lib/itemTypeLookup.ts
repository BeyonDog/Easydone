import { cellStr, parseCellAsInteger, type SheetMatrix } from "./xlsxHelpers.ts";

export type ItemTypeLookupIndex = {
  typeNameById: Map<string, string>;
  subTypeNameById: Map<string, string>;
};

export const EMPTY_ITEM_TYPE_LOOKUP_INDEX: ItemTypeLookupIndex = {
  typeNameById: new Map(),
  subTypeNameById: new Map(),
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

function resolveColumnIndex(headers: string[], candidates: string[]): number {
  const norm = headers.map(normalizeHeader);
  const want = candidates.map((c) => c.toLowerCase());
  for (const w of want) {
    const i = norm.indexOf(w);
    if (i >= 0) return i;
  }
  return -1;
}

function normalizeLookupId(v: unknown): string {
  const q = parseCellAsInteger(v);
  if (q != null) return String(q);
  return cellStr(v).trim();
}

function isPlaceholderName(name: string): boolean {
  const t = name.trim();
  if (!t) return true;
  const lower = t.toLowerCase();
  return lower === "null" || lower === "n/a" || lower === "#n/a" || t === "N/A";
}

function buildNameMap(
  aoa: SheetMatrix | null,
  idCandidates: string[],
  nameCandidates: string[],
): Map<string, string> {
  const map = new Map<string, string>();
  if (!aoa?.length) return map;
  const headers = aoa[0]!.map((h) => cellStr(h));
  const idCol = resolveColumnIndex(headers, idCandidates);
  const nameCol = resolveColumnIndex(headers, nameCandidates);
  if (idCol < 0 || nameCol < 0) return map;
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const id = normalizeLookupId(row[idCol]);
    if (!id) continue;
    const name = cellStr(row[nameCol]).trim();
    if (!name || isPlaceholderName(name)) continue;
    map.set(id, name);
  }
  return map;
}

/** RCT Item.xlsx：单张 ItemType 表同时含子类型与所属类型 */
function buildUnifiedMapsFromItemTypeSheet(aoa: SheetMatrix): ItemTypeLookupIndex {
  const typeNameById = new Map<string, string>();
  const subTypeNameById = new Map<string, string>();
  const headers = aoa[0]!.map((h) => cellStr(h));
  const subIdCol = resolveColumnIndex(headers, ["子类型ID", "SubTypeID"]);
  if (subIdCol < 0) return { typeNameById, subTypeNameById };

  const subNameCol = resolveColumnIndex(headers, ["子类名称", "SubTypeName", "子类型名", "Name", "名称"]);
  const typeIdCol = resolveColumnIndex(headers, ["所属类型ID", "TypeID", "类型ID"]);
  const typeNameCol = resolveColumnIndex(headers, ["类型名称", "TypeName", "类型名"]);

  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const subId = parseCellAsInteger(row[subIdCol]);
    if (subId == null) continue;

    const subKey = String(subId);
    if (subNameCol >= 0) {
      const subName = cellStr(row[subNameCol]).trim();
      if (subName && !isPlaceholderName(subName)) {
        subTypeNameById.set(subKey, subName);
      }
    }
    if (typeIdCol >= 0 && typeNameCol >= 0) {
      const typeId = parseCellAsInteger(row[typeIdCol]);
      if (typeId == null) continue;
      const typeName = cellStr(row[typeNameCol]).trim();
      if (typeName && !isPlaceholderName(typeName)) {
        typeNameById.set(String(typeId), typeName);
      }
    }
  }
  return { typeNameById, subTypeNameById };
}

function mergeNameMaps(target: Map<string, string>, source: Map<string, string>): void {
  for (const [k, v] of source) target.set(k, v);
}

export function buildItemTypeLookupIndex(
  itemTypeAoa: SheetMatrix | null,
  itemSubTypeAoa: SheetMatrix | null,
): ItemTypeLookupIndex {
  let typeNameById = new Map<string, string>();
  let subTypeNameById = new Map<string, string>();

  if (itemTypeAoa?.length) {
    const headers = itemTypeAoa[0]!.map((h) => cellStr(h));
    const hasUnifiedSubTypeCol = resolveColumnIndex(headers, ["子类型ID", "SubTypeID"]) >= 0;
    if (hasUnifiedSubTypeCol) {
      const unified = buildUnifiedMapsFromItemTypeSheet(itemTypeAoa);
      typeNameById = unified.typeNameById;
      subTypeNameById = unified.subTypeNameById;
    } else {
      typeNameById = buildNameMap(itemTypeAoa, ["TypeID", "类型ID"], ["TypeName", "类型名", "类型名称"]);
    }
  }

  if (itemSubTypeAoa?.length) {
    mergeNameMaps(
      subTypeNameById,
      buildNameMap(
        itemSubTypeAoa,
        ["SubTypeID", "子类型ID"],
        ["SubTypeName", "子类型名", "子类名称", "Name", "名称"],
      ),
    );
  }

  return { typeNameById, subTypeNameById };
}

export function resolveItemRowTypeColumnIndex(headers: string[]): number {
  return resolveColumnIndex(headers, ["Type", "ItemType", "物品类型"]);
}

export function resolveItemRowSubTypeColumnIndex(headers: string[]): number {
  return resolveColumnIndex(headers, ["SubType", "ItemSubType", "物品子类型"]);
}

export function resolveItemTypeDisplayName(
  typeId: unknown,
  subTypeId: unknown,
  index: ItemTypeLookupIndex,
): string {
  const subKey = normalizeLookupId(subTypeId);
  if (subKey) {
    const subName = index.subTypeNameById.get(subKey);
    if (subName?.trim()) return subName.trim();
  }
  const typeKey = normalizeLookupId(typeId);
  if (!typeKey) return "";
  return index.typeNameById.get(typeKey)?.trim() ?? "";
}

export function formatItemIdWithTypeLabel(
  itemId: string,
  typeId: unknown,
  subTypeId: unknown,
  index: ItemTypeLookupIndex,
): string {
  const id = itemId.trim();
  if (!id) return "";
  const name = resolveItemTypeDisplayName(typeId, subTypeId, index);
  return name ? `${id}(${name})` : id;
}
