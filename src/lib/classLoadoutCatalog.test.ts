import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SheetMatrix } from "./xlsxHelpers.ts";
import {
  buildClassLoadoutCatalog,
  collectQualitySendItems,
  classGroupShortNameFromRemark,
} from "./classLoadoutCatalog.ts";

function aoa(rows: (unknown[])[]): SheetMatrix {
  return rows as SheetMatrix;
}

describe("classGroupShortNameFromRemark", () => {
  it("takes segment after last dash", () => {
    assert.equal(classGroupShortNameFromRemark("罗兰 - 战士"), "战士");
    assert.equal(classGroupShortNameFromRemark("龙一 - 怒拳"), "怒拳");
  });
});

describe("classLoadoutCatalog", () => {
  it("groups weapons/armors/cooks by mastery and quality bucket", () => {
    const classGroupAoa = aoa([
      ["ClassGroupID", "ClassIDs"],
      [1, "1001"],
    ]);

    const classAoa = aoa([
      ["ClassID", "ActiveMastery"],
      [1001, 1001],
    ]);

    const itemTypeAoa = aoa([
      ["SubTypeID", "SlotType", "AvailableClass"],
      [103, 2, "1001"],
    ]);

    const itemAoa = aoa([
      ["物品ID", "类型备注", "物品品质", "物品类型", "物品子类型", "组ID"],
      [101001, "武器", 5, 1, 103, "null"],
      [201001, "防具-头盔", 5, 2, 21000, "null"],
      [821005, "烹饪产物", 5, 82, 82000, 82100],
      [821006, "烹饪产物", 6, 82, 82000, 82100],
    ]);

    const cookFixedRecipeAoa = aoa([
      ["FixedRecipeId", "RecipeID", "ClassID", "CuisineID", "RecipeName"],
      [100111, 82100, 1001, 821005, "R1"],
    ]);

    const catalog = buildClassLoadoutCatalog({
      classGroupAoa,
      classAoa,
      itemTypeAoa,
      itemAoa,
      cookFixedRecipeAoa,
    });

    const classNode = catalog.classesById.get("1001");
    assert.ok(classNode, "class node exists");
    assert.equal(classNode.masteryId, "1001");

    assert.equal(classNode.weaponsByQuality["蓝"]?.map((it) => it.itemId).sort().join(","), "101001");
    // Armor is universal (not tied to AvailableClass).
    assert.equal(classNode.armorsByQuality["蓝"]?.map((it) => it.itemId).sort().join(","), "201001");
    assert.equal(classNode.cooksByQuality["蓝"]?.map((it) => it.itemId).sort().join(","), "821005");
    assert.equal(classNode.cooksByQuality["紫"]?.map((it) => it.itemId).sort().join(","), "821006");
  });

  it("builds browseEntries as 战士-剑士 from Excel remarks", () => {
    const classGroupAoa = aoa([
      ["ClassGroupID", "ClassIDs"],
      [1, "1001;1002"],
    ]);
    const classAoa = aoa([
      ["ClassID", "ActiveMastery"],
      [1001, 1001],
      [1002, 1002],
    ]);
    const classGroupExcelAoa = aoa([
      ["英雄组ID", "备注", "英雄组内包含的英雄ID"],
      ["C+B", "N/A", ""],
      ["key int", "String", ""],
      [1, "罗兰 - 战士", "1001;1002"],
    ]);
    const classExcelAoa = aoa([
      ["职业ID", "版本号", "备注", "默认职业精通", "可用职业精通"],
      ["C+B", "", "N/A", "", ""],
      ["key int", "int", "string", "int", "int"],
      [1001, 1, "剑士", 1001, 1001],
      [1002, 1, "盾卫", 1002, 1002],
    ]);
    const itemTypeAoa = aoa([
      ["SubTypeID", "SlotType", "AvailableClass"],
      [103, 2, "1001"],
    ]);
    const itemAoa = aoa([
      ["物品ID", "类型备注", "物品品质", "物品类型", "物品子类型", "组ID"],
      [101001, "武器", 5, 1, 103, "null"],
    ]);
    const cookFixedRecipeAoa = aoa([
      ["FixedRecipeId", "RecipeID", "ClassID", "CuisineID"],
      [100111, 82100, 1001, 821005],
    ]);

    const catalog = buildClassLoadoutCatalog({
      classGroupAoa,
      classAoa,
      itemTypeAoa,
      itemAoa,
      cookFixedRecipeAoa,
      classGroupExcelAoa,
      classExcelAoa,
    });

    const labels = catalog.browseEntries.map((e) => e.label);
    assert.ok(labels.includes("战士-剑士"));
    assert.ok(labels.includes("战士-盾卫"));
    const jianshi = catalog.browseEntries.find((e) => e.label === "战士-剑士");
    assert.ok(jianshi);
    assert.equal(jianshi.classGroupId, "1");
    assert.equal(jianshi.masteryId, "1001");
  });

  it("includes armors even when AvailableClass does not list their subtype", () => {
    const classGroupAoa = aoa([
      ["ClassGroupID", "ClassIDs"],
      [1, "1001"],
    ]);
    const classAoa = aoa([
      ["ClassID", "ActiveMastery"],
      [1001, 1001],
    ]);
    const itemTypeAoa = aoa([
      ["SubTypeID", "SlotType", "AvailableClass"],
      [103, 2, "1001"],
      // armor subtype 21000 has no AvailableClass
      [21000, 0, ""],
    ]);
    const itemAoa = aoa([
      ["物品ID", "类型备注", "物品品质", "物品类型", "物品子类型", "组ID"],
      [101001, "武器", 7, 1, 103, "null"],
      [210117, "防具-头盔", 7, 2, 21000, "null"],
    ]);
    const cookFixedRecipeAoa = aoa([
      ["FixedRecipeId", "RecipeID", "ClassID", "CuisineID"],
      [1, 82100, 1001, 821005],
    ]);

    const catalog = buildClassLoadoutCatalog({
      classGroupAoa,
      classAoa,
      itemTypeAoa,
      itemAoa,
      cookFixedRecipeAoa,
    });
    const node = catalog.classesById.get("1001")!;
    assert.equal(node.armorsByQuality["金"]?.map((it) => it.itemId).join(","), "210117");
  });

  it("collectQualitySendItems returns qty=1 items for one quality bucket", () => {
    const classGroupAoa = aoa([
      ["ClassGroupID", "ClassIDs"],
      [1, "1001"],
    ]);
    const classAoa = aoa([
      ["ClassID", "ActiveMastery"],
      [1001, 1001],
    ]);
    const itemTypeAoa = aoa([
      ["SubTypeID", "SlotType", "AvailableClass"],
      [103, 2, "1001"],
    ]);
    const itemAoa = aoa([
      ["物品ID", "类型备注", "物品品质", "物品类型", "物品子类型", "组ID"],
      [101001, "武器", 5, 1, 103, "null"], // 蓝
      [101007, "武器", 7, 1, 103, "null"], // 金
      [210115, "防具-头盔", 5, 2, 21000, "null"], // 蓝
      [210117, "防具-头盔", 7, 2, 21000, "null"], // 金
      [821005, "烹饪产物", 5, 82, 82000, 82100], // 蓝
      [821007, "烹饪产物", 7, 82, 82000, 82100], // 金
    ]);
    const cookFixedRecipeAoa = aoa([
      ["FixedRecipeId", "RecipeID", "ClassID", "CuisineID"],
      [100111, 82100, 1001, 821005],
    ]);

    const catalog = buildClassLoadoutCatalog({
      classGroupAoa,
      classAoa,
      itemTypeAoa,
      itemAoa,
      cookFixedRecipeAoa,
    });
    const node = catalog.classesById.get("1001")!;
    const gold = collectQualitySendItems(node, "金");
    assert.deepEqual(
      gold.map((it) => it.itemId).sort(),
      ["101007", "210117", "821007"],
    );
    assert.ok(gold.every((it) => it.qty === 1));
  });

  it("attaches recommended loadouts from PurchasePlanShow -> PurchasePlanGroup -> PurchasePlan", () => {
    const classGroupAoa = aoa([
      ["ClassGroupID", "ClassIDs"],
      [1, "1001"],
    ]);
    const classAoa = aoa([
      ["ClassID", "ActiveMastery"],
      [1001, 1001],
    ]);

    const itemTypeAoa = aoa([
      ["SubTypeID", "SlotType", "AvailableClass"],
      [103, 2, "1001"],
    ]);

    const itemAoa = aoa([
      ["物品ID", "类型备注", "物品品质", "物品类型", "物品子类型", "组ID"],
      [101001, "武器", 5, 1, 103, "null"],
      [201001, "防具-头盔", 5, 2, 21000, "null"],
      [821005, "烹饪产物", 5, 82, 82000, 82100],
    ]);

    const cookFixedRecipeAoa = aoa([
      ["FixedRecipeId", "RecipeID", "ClassID", "CuisineID", "RecipeName"],
      [100111, 82100, 1001, 821005, "R1"],
    ]);

    const purchasePlanShowAoa = aoa([
      ["PlanShowid", "Class", "AccountlevelShow", "PlanList"],
      [12, 1, 10, "111"],
    ]);
    const purchasePlanGroupAoa = aoa([
      ["Groupid", "Planid"],
      [111, "11101"],
    ]);
    const purchasePlanAoa = aoa([
      ["Planid", "PlanName", "EquipeListTrade", "ConsuListTrade"],
      [11101, "Preset-A", "101001;201001", "821005"],
    ]);

    const catalog = buildClassLoadoutCatalog({
      classGroupAoa,
      classAoa,
      itemTypeAoa,
      itemAoa,
      cookFixedRecipeAoa,
      purchasePlanShowAoa,
      purchasePlanGroupAoa,
      purchasePlanAoa,
    });

    const classNode = catalog.classesById.get("1001");
    assert.ok(classNode);
    assert.equal(classNode.recommendedLoadouts.length, 1);

    const rl = classNode.recommendedLoadouts[0]!;
    assert.equal(rl.planId, "11101");
    assert.equal(rl.planName, "Preset-A");

    // Armor is included for recommend when item exists (type armor), even without AvailableClass.
    const itemIds = rl.items.map((it) => it.itemId).sort().join(",");
    assert.equal(itemIds, "101001,201001,821005");
    assert.equal(rl.qualityBucket, "蓝");
  });
});
