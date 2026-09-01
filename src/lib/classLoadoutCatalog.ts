import type { SheetMatrix } from "./xlsxHelpers.ts";
import { cellStr, itemQualityFilterBucket, parseCellAsInteger } from "./xlsxHelpers.ts";
import type { SendTemplateItem } from "../types.ts";

export type ClassLoadoutQualityBucket = string;

export type ClassLoadoutEquipItem = {
  itemId: string;
  qualityBucket: ClassLoadoutQualityBucket;
};

export type ClassLoadoutRecommendedLoadout = {
  planId: string;
  planName: string;
  items: ClassLoadoutEquipItem[];
  qualityBucket: ClassLoadoutQualityBucket | null;
};

export type ClassLoadoutClassNode = {
  masteryId: string;
  weaponsByQuality: Record<ClassLoadoutQualityBucket, ClassLoadoutEquipItem[]>;
  armorsByQuality: Record<ClassLoadoutQualityBucket, ClassLoadoutEquipItem[]>;
  cooksByQuality: Record<ClassLoadoutQualityBucket, ClassLoadoutEquipItem[]>;
  recommendedLoadouts: ClassLoadoutRecommendedLoadout[];
};

export type ClassLoadoutBrowseEntry = {
  key: string;
  classGroupId: string;
  masteryId: string;
  label: string;
};

export type ClassLoadoutCatalog = {
  classesById: Map<string, ClassLoadoutClassNode>;
  classGroups: Array<{ classGroupId: string; masteries: string[] }>;
  browseEntries: ClassLoadoutBrowseEntry[];
};

export type BuildClassLoadoutCatalogInput = {
  classGroupAoa: SheetMatrix;
  classAoa: SheetMatrix;
  itemTypeAoa: SheetMatrix;
  itemAoa: SheetMatrix;
  cookFixedRecipeAoa: SheetMatrix;
  /** Excel/Class.xlsx · ClassGroup（含备注） */
  classGroupExcelAoa?: SheetMatrix | null;
  /** Excel/Class.xlsx · Class（含备注） */
  classExcelAoa?: SheetMatrix | null;
  purchasePlanShowAoa?: SheetMatrix | null;
  purchasePlanGroupAoa?: SheetMatrix | null;
  purchasePlanAoa?: SheetMatrix | null;
};

const ITEM_TYPE_WEAPON = 1;
const ITEM_TYPE_ARMOR = 2;
const ITEM_TYPE_COOK = 82;

function cellToSemicolonList(v: unknown): string[] {
  const s = cellStr(v);
  if (!s) return [];
  return s
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}

function resolveColumnIndex(headers: string[], candidates: readonly string[]): number {
  const byExact = (c: string) => headers.findIndex((h) => h === c);
  for (const c of candidates) {
    const i = byExact(c);
    if (i >= 0) return i;
  }
  const lower = headers.map((h) => h.toLowerCase());
  for (const c of candidates) {
    const lc = c.toLowerCase();
    const i = lower.findIndex((h) => h === lc);
    if (i >= 0) return i;
  }
  return -1;
}

function normalizeId(id: unknown): string | null {
  const n = parseCellAsInteger(id);
  if (n == null) return null;
  return String(n);
}

function cuisineIdToCookGroupKey(cuisineId: string): number | null {
  const n = parseCellAsInteger(cuisineId);
  if (n == null) return null;
  return Math.floor(n / 10);
}

/** 「罗兰 - 战士」→「战士」 */
export function classGroupShortNameFromRemark(remark: string): string {
  const t = remark.trim();
  if (!t) return "";
  const parts = t.split(/\s*-\s*/);
  if (parts.length >= 2) return parts[parts.length - 1]!.trim();
  return t;
}

function findHeaderRowIndex(aoa: SheetMatrix, idCandidates: readonly string[]): number {
  for (let r = 0; r < Math.min(12, aoa.length); r++) {
    const headers = (aoa[r] ?? []).map((h) => cellStr(h).replace(/\r?\n/g, " ").trim());
    if (resolveColumnIndex(headers, idCandidates) >= 0) return r;
  }
  return 0;
}

function findDataStartRow(aoa: SheetMatrix, headerRow: number, idCol: number): number {
  for (let r = headerRow + 1; r < aoa.length; r++) {
    if (normalizeId(aoa[r]?.[idCol]) != null) return r;
  }
  return headerRow + 1;
}

function parseIdRemarkMap(
  aoa: SheetMatrix | null | undefined,
  idCandidates: readonly string[],
  remarkCandidates: readonly string[],
): Map<string, string> {
  const map = new Map<string, string>();
  if (!aoa?.length) return map;
  const headerRow = findHeaderRowIndex(aoa, idCandidates);
  const headers = (aoa[headerRow] ?? []).map((h) => cellStr(h).replace(/\r?\n/g, " ").trim());
  const idCol = resolveColumnIndex(headers, idCandidates);
  const remarkCol = resolveColumnIndex(headers, remarkCandidates);
  if (idCol < 0 || remarkCol < 0) return map;
  const dataStart = findDataStartRow(aoa, headerRow, idCol);
  for (let r = dataStart; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const id = normalizeId(row[idCol]);
    if (!id) continue;
    const remark = cellStr(row[remarkCol]).trim();
    if (!remark) continue;
    map.set(id, remark);
  }
  return map;
}

export function collectQualitySendItems(
  node: ClassLoadoutClassNode,
  qualityBucket: ClassLoadoutQualityBucket,
): SendTemplateItem[] {
  const seen = new Set<string>();
  const out: SendTemplateItem[] = [];
  const pushAll = (list: ClassLoadoutEquipItem[] | undefined) => {
    for (const it of list ?? []) {
      if (seen.has(it.itemId)) continue;
      seen.add(it.itemId);
      out.push({ itemId: it.itemId, qty: 1 });
    }
  };
  pushAll(node.weaponsByQuality[qualityBucket]);
  pushAll(node.armorsByQuality[qualityBucket]);
  pushAll(node.cooksByQuality[qualityBucket]);
  return out;
}

export function buildClassLoadoutCatalog(input: BuildClassLoadoutCatalogInput): ClassLoadoutCatalog {
  const {
    classGroupAoa,
    classAoa,
    itemTypeAoa,
    itemAoa,
    cookFixedRecipeAoa,
    classGroupExcelAoa,
    classExcelAoa,
    purchasePlanShowAoa,
    purchasePlanGroupAoa,
    purchasePlanAoa,
  } = input;

  // 1) Parse ClassGroup -> ClassIDs.
  const cgHeaderRow = findHeaderRowIndex(classGroupAoa, [
    "ClassGroupID",
    "ClassGroupId",
    "GroupID",
    "GroupId",
    "英雄组ID",
  ]);
  const classGroupHeaders = (classGroupAoa[cgHeaderRow] ?? []).map((h) =>
    cellStr(h).replace(/\r?\n/g, " ").trim(),
  );
  const cgIdCol = resolveColumnIndex(classGroupHeaders, [
    "ClassGroupID",
    "ClassGroupId",
    "GroupID",
    "GroupId",
    "英雄组ID",
  ]);
  const cgClassIdsCol = resolveColumnIndex(classGroupHeaders, [
    "ClassIDs",
    "ClassIds",
    "ClassIDList",
    "ClassIdList",
    "英雄组内包含的英雄ID",
  ]);
  if (cgIdCol < 0 || cgClassIdsCol < 0) {
    throw new Error("ClassGroup.csv: missing ClassGroupID / ClassIDs columns");
  }
  const cgDataStart = findDataStartRow(classGroupAoa, cgHeaderRow, cgIdCol);

  // 2) Parse Class -> ActiveMastery.
  const cHeaderRow = findHeaderRowIndex(classAoa, ["ClassID", "ClassId", "职业ID"]);
  const classHeaders = (classAoa[cHeaderRow] ?? []).map((h) => cellStr(h).replace(/\r?\n/g, " ").trim());
  const cIdCol = resolveColumnIndex(classHeaders, ["ClassID", "ClassId", "职业ID"]);
  const activeMasteryCol = resolveColumnIndex(classHeaders, [
    "ActiveMastery",
    "ActiveMasteryID",
    "ActiveMasteryId",
    "可用职业精通",
  ]);
  const defMasteryCol = resolveColumnIndex(classHeaders, [
    "DefMastery",
    "DefMasteryID",
    "DefMasteryId",
    "默认职业精通",
  ]);
  if (cIdCol < 0) throw new Error("Class.csv: missing ClassID column");
  const cDataStart = findDataStartRow(classAoa, cHeaderRow, cIdCol);

  const classIdToMasteryId = new Map<string, string>();
  for (let r = cDataStart; r < classAoa.length; r++) {
    const row = classAoa[r] ?? [];
    const classId = normalizeId(row[cIdCol]);
    if (!classId) continue;
    const activeRaw = activeMasteryCol >= 0 ? row[activeMasteryCol] : "";
    // Available mastery may be "1001" or "1001;1002"; take first for ActiveMastery-like.
    const activeList = cellToSemicolonList(activeRaw);
    const active = activeList.length ? normalizeId(activeList[0]) : normalizeId(activeRaw);
    const def = defMasteryCol >= 0 ? normalizeId(row[defMasteryCol]) : null;
    classIdToMasteryId.set(classId, active ?? def ?? classId);
  }

  // 3) Create masteries (browse tree leaves).
  const classGroups: Array<{ classGroupId: string; classIds: string[]; masteries: string[] }> = [];
  const allMasteries = new Set<string>();

  for (let r = cgDataStart; r < classGroupAoa.length; r++) {
    const row = classGroupAoa[r] ?? [];
    const groupId = normalizeId(row[cgIdCol]);
    if (!groupId) continue;
    const rawList = cellStr(row[cgClassIdsCol]);
    const classIds = cellToSemicolonList(rawList)
      .map((x) => normalizeId(x))
      .filter((x): x is string => x != null);
    // Excel may store a single int without semicolon.
    if (!classIds.length) {
      const single = normalizeId(row[cgClassIdsCol]);
      if (single) classIds.push(single);
    }
    if (!classIds.length) continue;
    const masteries = classIds.map((cid) => classIdToMasteryId.get(cid) ?? cid);
    for (const mid of masteries) allMasteries.add(mid);
    classGroups.push({ classGroupId: groupId, classIds, masteries });
  }

  const classesById = new Map<string, ClassLoadoutClassNode>();
  for (const masteryId of allMasteries) {
    classesById.set(masteryId, {
      masteryId,
      weaponsByQuality: {},
      armorsByQuality: {},
      cooksByQuality: {},
      recommendedLoadouts: [],
    });
  }

  // Display names from Excel Class.xlsx remarks.
  const groupRemarkById = parseIdRemarkMap(
    classGroupExcelAoa,
    ["ClassGroupID", "ClassGroupId", "英雄组ID"],
    ["备注", "Remark"],
  );
  const classRemarkById = parseIdRemarkMap(
    classExcelAoa,
    ["ClassID", "ClassId", "职业ID"],
    ["备注", "Remark"],
  );

  const browseEntries: ClassLoadoutBrowseEntry[] = [];
  for (const group of classGroups) {
    const groupRemark = groupRemarkById.get(group.classGroupId) ?? "";
    const groupShort = classGroupShortNameFromRemark(groupRemark) || group.classGroupId;
    for (let i = 0; i < group.masteries.length; i++) {
      const masteryId = group.masteries[i]!;
      const classId = group.classIds[i] ?? masteryId;
      const masteryRemark = classRemarkById.get(classId) ?? classRemarkById.get(masteryId) ?? masteryId;
      browseEntries.push({
        key: `${group.classGroupId}:${masteryId}`,
        classGroupId: group.classGroupId,
        masteryId,
        label: `${groupShort}-${masteryRemark}`,
      });
    }
  }

  // 4) Parse ItemType.csv: SubTypeID -> Set<AvailableClass>.
  const itemTypeHeaders = (itemTypeAoa[0] ?? []).map((h) => cellStr(h));
  const subTypeCol = resolveColumnIndex(itemTypeHeaders, ["SubTypeID", "SubTypeId", "子类型ID", "子类型id"]);
  const availableClassCol = resolveColumnIndex(itemTypeHeaders, ["AvailableClass", "可用职业"]);
  if (subTypeCol < 0 || availableClassCol < 0) {
    throw new Error("ItemType.csv: missing SubTypeID / AvailableClass columns");
  }

  const masteryToAllowedSubTypes = new Map<string, Set<string>>();
  for (let r = 1; r < itemTypeAoa.length; r++) {
    const row = itemTypeAoa[r] ?? [];
    const subType = normalizeId(row[subTypeCol]);
    if (!subType) continue;
    const avail = cellToSemicolonList(row[availableClassCol]);
    if (!avail.length) continue;
    for (const part of avail) {
      const masteryId = normalizeId(part);
      if (!masteryId) continue;
      const set = masteryToAllowedSubTypes.get(masteryId) ?? new Set<string>();
      set.add(subType);
      masteryToAllowedSubTypes.set(masteryId, set);
    }
  }

  // 5) Parse Item.xlsx (Item sheet): build indices for lookup.
  const itemHeaders = (itemAoa[0] ?? []).map((h) => cellStr(h));
  const itemIdCol = resolveColumnIndex(itemHeaders, ["物品ID", "ItemID", "ItemId", "ID"]);
  const typeCol = resolveColumnIndex(itemHeaders, ["物品类型", "Type", "ItemType"]);
  const subTypeCol2 = resolveColumnIndex(itemHeaders, ["物品子类型", "SubType", "ItemSubType"]);
  const qualityCol = resolveColumnIndex(itemHeaders, ["物品品质", "Quality", "品质"]);
  const groupIdCol = resolveColumnIndex(itemHeaders, ["组ID", "组Id", "GroupID"]);
  const typeRemarkCol = resolveColumnIndex(itemHeaders, ["类型备注"]);
  if (itemIdCol < 0 || typeCol < 0 || subTypeCol2 < 0 || qualityCol < 0 || groupIdCol < 0) {
    throw new Error("Item.xlsx: missing required columns for class loadout catalog");
  }

  const itemsById = new Map<
    string,
    ClassLoadoutEquipItem & { itemType: number; subType: string; groupKey: number | null }
  >();
  const weaponsBySubType = new Map<
    string,
    Array<ClassLoadoutEquipItem & { itemType: number; groupKey: number | null }>
  >();
  const allArmors: ClassLoadoutEquipItem[] = [];
  const cooksByGroupKey = new Map<number, Array<ClassLoadoutEquipItem & { itemType: number; subType: string }>>();

  for (let r = 1; r < itemAoa.length; r++) {
    const row = itemAoa[r] ?? [];
    const itemId = normalizeId(row[itemIdCol]);
    if (!itemId) continue;

    const itemType = parseCellAsInteger(row[typeCol]);
    if (itemType == null) continue;

    const subType = normalizeId(row[subTypeCol2]) ?? cellStr(row[subTypeCol2]);
    if (!subType.trim()) continue;

    const q = parseCellAsInteger(row[qualityCol]);
    if (q == null) continue;
    const qualityBucket = itemQualityFilterBucket(q);

    const groupIdNum = parseCellAsInteger(row[groupIdCol]);
    const groupKey = groupIdNum == null ? null : groupIdNum;

    const item = { itemId, qualityBucket, itemType, subType, groupKey };
    itemsById.set(itemId, item);

    if (itemType === ITEM_TYPE_WEAPON) {
      const list = weaponsBySubType.get(subType) ?? [];
      list.push(item);
      weaponsBySubType.set(subType, list);
    } else if (
      itemType === ITEM_TYPE_ARMOR ||
      (typeRemarkCol >= 0 && cellStr(row[typeRemarkCol]).startsWith("防具-"))
    ) {
      allArmors.push(item);
    } else if (itemType === ITEM_TYPE_COOK) {
      if (groupKey == null) continue;
      const list = cooksByGroupKey.get(groupKey) ?? [];
      list.push(item);
      cooksByGroupKey.set(groupKey, list);
    }
  }

  const cookHeaders = (cookFixedRecipeAoa[0] ?? []).map((h) => cellStr(h));
  const cookClassIdCol = resolveColumnIndex(cookHeaders, ["ClassID", "ClassId", "精通ID"]);
  const cuisineIdCol = resolveColumnIndex(cookHeaders, ["CuisineID", "CuisineId", "定食ID", "食物ID"]);
  if (cookClassIdCol < 0 || cuisineIdCol < 0) {
    throw new Error("CookFixedRecipe.csv: missing ClassID / CuisineID columns");
  }

  // 6) Build weapons/armors/cooks per mastery.
  for (const [masteryId, node] of classesById) {
    const allowedSubTypes = masteryToAllowedSubTypes.get(masteryId);
    if (allowedSubTypes?.size) {
      for (const st of allowedSubTypes) {
        for (const it of weaponsBySubType.get(st) ?? []) {
          (node.weaponsByQuality[it.qualityBucket] ??= []).push(it);
        }
      }
    }

    // Armor is largely universal — attach all armors to every mastery.
    for (const it of allArmors) {
      (node.armorsByQuality[it.qualityBucket] ??= []).push(it);
    }

    const cookGroupKeys = new Set<number>();
    const cookClassIdCandidates = new Set<string>();
    for (const [cid, mid] of classIdToMasteryId) {
      if (mid === masteryId) cookClassIdCandidates.add(cid);
    }
    // ClassID on CookFixedRecipe is often the mastery/class id itself.
    cookClassIdCandidates.add(masteryId);

    for (let r = 1; r < cookFixedRecipeAoa.length; r++) {
      const row = cookFixedRecipeAoa[r] ?? [];
      const cookClassId = normalizeId(row[cookClassIdCol]);
      if (!cookClassId || !cookClassIdCandidates.has(cookClassId)) continue;
      const cuisineId = normalizeId(row[cuisineIdCol]);
      if (!cuisineId) continue;
      const groupKey = cuisineIdToCookGroupKey(cuisineId);
      if (groupKey == null) continue;
      cookGroupKeys.add(groupKey);
    }

    for (const groupKey of cookGroupKeys) {
      for (const it of cooksByGroupKey.get(groupKey) ?? []) {
        (node.cooksByQuality[it.qualityBucket] ??= []).push(it);
      }
    }
  }

  // 7) Recommended loadouts (optional).
  if (purchasePlanShowAoa && purchasePlanGroupAoa && purchasePlanAoa) {
    const planShowHeaders = (purchasePlanShowAoa[0] ?? []).map((h) => cellStr(h));
    const planShowClassCol = resolveColumnIndex(planShowHeaders, ["Class", "class"]);
    const planShowPlanListCol = resolveColumnIndex(planShowHeaders, [
      "PlanList",
      "PlanLists",
      "计划list",
      "方案list",
    ]);
    const planShowIdCol = resolveColumnIndex(planShowHeaders, ["PlanShowid", "PlanShowId", "PlanShowID"]);
    const accountLevelShowCol = resolveColumnIndex(planShowHeaders, [
      "AccountlevelShow",
      "AccountLevelShow",
      "AccountLevel",
    ]);

    const groupHeaders = (purchasePlanGroupAoa[0] ?? []).map((h) => cellStr(h));
    const planGroupIdCol = resolveColumnIndex(groupHeaders, ["Groupid", "GroupId", "方案组id", "PlanGroupId"]);
    const planGroupPlanListCol = resolveColumnIndex(groupHeaders, ["Planid", "PlanIds", "PlanId", "方案id"]);

    const planHeaders = (purchasePlanAoa[0] ?? []).map((h) => cellStr(h));
    const planIdCol = resolveColumnIndex(planHeaders, ["Planid", "PlanId", "方案id"]);
    const planNameCol = resolveColumnIndex(planHeaders, ["PlanName", "方案名"]);
    const equipTradeCol = resolveColumnIndex(planHeaders, [
      "EquipeListTrade",
      "EquipListTrade",
      "装备list交易行推荐-装备list",
    ]);
    const consuTradeCol = resolveColumnIndex(planHeaders, [
      "ConsuListTrade",
      "ConsumableListTrade",
      "消耗品list交易行推荐-消耗品list",
    ]);

    if (planShowClassCol < 0 || planShowPlanListCol < 0 || planShowIdCol < 0) {
      throw new Error("PurchasePlanShow.csv: missing required columns");
    }
    if (planGroupIdCol < 0 || planGroupPlanListCol < 0) {
      throw new Error("PurchasePlanGroup.csv: missing required columns");
    }
    if (planIdCol < 0 || equipTradeCol < 0 || consuTradeCol < 0) {
      throw new Error("PurchasePlan.csv: missing required columns (Planid/EquipeListTrade/ConsuListTrade)");
    }

    const classGroupIdToPlanShows = new Map<
      string,
      Array<{ planShowId: string; accountLevelShow: string | null; planGroupIds: string[] }>
    >();
    for (let r = 1; r < purchasePlanShowAoa.length; r++) {
      const row = purchasePlanShowAoa[r] ?? [];
      const classGroupId = normalizeId(row[planShowClassCol]);
      if (!classGroupId) continue;
      const planShowId = normalizeId(row[planShowIdCol]) ?? cellStr(row[planShowIdCol]);
      if (!planShowId) continue;
      const planGroupIds = cellToSemicolonList(row[planShowPlanListCol])
        .map((x) => normalizeId(x))
        .filter((x): x is string => x != null);
      if (!planGroupIds.length) continue;
      const acc = accountLevelShowCol >= 0 ? normalizeId(row[accountLevelShowCol]) ?? null : null;
      const list = classGroupIdToPlanShows.get(classGroupId) ?? [];
      list.push({ planShowId, accountLevelShow: acc, planGroupIds });
      classGroupIdToPlanShows.set(classGroupId, list);
    }

    const planGroupIdToPlanIds = new Map<string, string[]>();
    for (let r = 1; r < purchasePlanGroupAoa.length; r++) {
      const row = purchasePlanGroupAoa[r] ?? [];
      const groupId = normalizeId(row[planGroupIdCol]);
      if (!groupId) continue;
      const planIds = cellToSemicolonList(row[planGroupPlanListCol])
        .map((x) => normalizeId(x))
        .filter((x): x is string => x != null);
      if (!planIds.length) continue;
      planGroupIdToPlanIds.set(groupId, planIds);
    }

    const planIdToPlan = new Map<
      string,
      {
        planId: string;
        planName: string;
        equipTradeItemIds: string[];
        consuTradeItemIds: string[];
      }
    >();
    for (let r = 1; r < purchasePlanAoa.length; r++) {
      const row = purchasePlanAoa[r] ?? [];
      const planId = normalizeId(row[planIdCol]);
      if (!planId) continue;
      const planName = planNameCol >= 0 ? cellStr(row[planNameCol]).trim() : "";
      const equipTradeItemIds = cellToSemicolonList(row[equipTradeCol])
        .map((x) => normalizeId(x))
        .filter((x): x is string => x != null);
      const consuTradeItemIds = cellToSemicolonList(row[consuTradeCol])
        .map((x) => normalizeId(x))
        .filter((x): x is string => x != null);
      planIdToPlan.set(planId, { planId, planName, equipTradeItemIds, consuTradeItemIds });
    }

    for (const group of classGroups) {
      const planShows = classGroupIdToPlanShows.get(group.classGroupId) ?? [];
      if (!planShows.length) continue;

      const planTemplates: Array<{ planId: string; planName: string; itemIds: string[] }> = [];
      const seenPlanIds = new Set<string>();
      for (const ps of planShows) {
        for (const pgid of ps.planGroupIds) {
          const planIds = planGroupIdToPlanIds.get(String(pgid)) ?? [];
          for (const planId of planIds) {
            if (seenPlanIds.has(planId)) continue;
            seenPlanIds.add(planId);
            const plan = planIdToPlan.get(planId);
            if (!plan) continue;
            const itemIds = [...plan.equipTradeItemIds, ...plan.consuTradeItemIds];
            planTemplates.push({ planId, planName: plan.planName, itemIds });
          }
        }
      }

      for (const masteryId of group.masteries) {
        const node = classesById.get(masteryId);
        if (!node) continue;
        const allowedSubTypes = masteryToAllowedSubTypes.get(masteryId);

        const cookedGroupKeys = new Set<number>();
        const cookClassIdCandidates = new Set<string>();
        for (const [cid, mid] of classIdToMasteryId) {
          if (mid === masteryId) cookClassIdCandidates.add(cid);
        }
        cookClassIdCandidates.add(masteryId);

        for (let r = 1; r < cookFixedRecipeAoa.length; r++) {
          const row = cookFixedRecipeAoa[r] ?? [];
          const cookClassId = normalizeId(row[cookClassIdCol]);
          if (!cookClassId || !cookClassIdCandidates.has(cookClassId)) continue;
          const cuisineId = normalizeId(row[cuisineIdCol]);
          if (!cuisineId) continue;
          const groupKey = cuisineIdToCookGroupKey(cuisineId);
          if (groupKey != null) cookedGroupKeys.add(groupKey);
        }

        for (const tmpl of planTemplates) {
          const dedup = new Set<string>();
          const filtered: ClassLoadoutEquipItem[] = [];
          for (const itemId of tmpl.itemIds) {
            const it = itemsById.get(itemId);
            if (!it) continue;
            let ok = false;
            if (it.itemType === ITEM_TYPE_WEAPON) {
              ok = !!allowedSubTypes?.has(it.subType);
            } else if (it.itemType === ITEM_TYPE_ARMOR) {
              ok = true;
            } else if (it.itemType === ITEM_TYPE_COOK) {
              ok = it.groupKey != null && cookedGroupKeys.has(it.groupKey);
            }
            if (!ok) continue;
            if (dedup.has(it.itemId)) continue;
            dedup.add(it.itemId);
            filtered.push({ itemId: it.itemId, qualityBucket: it.qualityBucket });
          }

          if (!filtered.length) continue;

          const buckets = [...new Set(filtered.map((x) => x.qualityBucket).filter((b) => b))];
          const qualityBucket = buckets.length === 1 ? buckets[0]! : null;
          node.recommendedLoadouts.push({
            planId: tmpl.planId,
            planName: tmpl.planName,
            items: filtered,
            qualityBucket,
          });
        }
      }
    }
  }

  return {
    classesById,
    classGroups: classGroups.map((g) => ({ classGroupId: g.classGroupId, masteries: g.masteries })),
    browseEntries,
  };
}
