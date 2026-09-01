import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHEST_TYPE_REMARK,
  appendAlignedSheetRows,
  appendChestRowsToItemSheet,
  mergeChestSheetIntoItem,
  normalizeIdCell,
  rowMatchesKeyword,
} from "./xlsxHelpers.ts";

describe("normalizeIdCell", () => {
  it("formats integer numbers", () => {
    assert.equal(normalizeIdCell(20200025), "20200025");
    assert.equal(normalizeIdCell(20200025.0), "20200025");
  });
});

describe("appendAlignedSheetRows", () => {
  it("appends aligned rows and skips duplicate 物品ID", () => {
    const base = [
      ["物品ID", "物品备注", "物品品质"],
      [100, "剑", 5],
      [200, "盾", 6],
    ];
    const extra = [
      ["物品备注", "物品ID", "额外列"],
      ["宝箱A", 300, "x"],
      ["重复", 100, "y"],
      ["礼包B", 400, "z"],
    ];
    const merged = appendAlignedSheetRows(base, extra);
    assert.equal(merged.length, 5);
    assert.deepEqual(merged[0], ["物品ID", "物品备注", "物品品质"]);
    assert.deepEqual(merged[1], [100, "剑", 5]);
    assert.deepEqual(merged[2], [200, "盾", 6]);
    assert.deepEqual(merged[3], [300, "宝箱A", ""]);
    assert.deepEqual(merged[4], [400, "礼包B", ""]);
  });

  it("maps ChestId alias into 物品ID", () => {
    const item = [
      ["物品ID", "物品备注"],
      [11010015, "武器"],
    ];
    const chest = [
      ["ChestId", "物品备注"],
      [20200025, "礼包A"],
      [11010015, "重复跳过"],
      [20200036, "礼包B"],
    ];
    const merged = appendChestRowsToItemSheet(item, chest);
    assert.equal(merged.length, 4);
    assert.equal(normalizeIdCell(merged[2]![0]), "20200025");
    assert.equal(merged[2]![1], "礼包A");
    assert.equal(normalizeIdCell(merged[3]![0]), "20200036");
    assert.equal(rowMatchesKeyword(merged[2]!, "20200025", 0), true);
    assert.equal(rowMatchesKeyword(merged[1]!, "20200025", 0), false);
  });

  it("stamps 类型备注 as chest on appended rows", () => {
    const item = [
      ["物品ID", "物品备注", "类型备注"],
      [1, "a", "武器"],
    ];
    const chest = [
      ["ChestId", "物品备注", "类型备注"],
      [20200075, "礼包", "其它"],
    ];
    const merged = appendChestRowsToItemSheet(item, chest);
    assert.equal(merged.length, 3);
    assert.equal(normalizeIdCell(merged[2]![0]), "20200075");
    assert.equal(merged[2]![2], CHEST_TYPE_REMARK);
    assert.equal(rowMatchesKeyword(merged[2]!, "20200075", 0), true);
  });

  it("prefers resolved ChestId over empty 物品ID column", () => {
    const item = [
      ["物品ID", "类型备注"],
      [1, "武器"],
    ];
    const chest = [
      ["物品ID", "ChestId"],
      ["", 20200075],
      [null, 20200076],
    ];
    const merged = appendChestRowsToItemSheet(item, chest);
    assert.equal(merged.length, 4);
    assert.equal(normalizeIdCell(merged[1]![0]), "1");
    assert.equal(normalizeIdCell(merged[2]![0]), "20200075");
    assert.equal(normalizeIdCell(merged[3]![0]), "20200076");
    assert.equal(merged[2]![1], CHEST_TYPE_REMARK);
  });

  it("does not append rows when no resolvable ID column", () => {
    const item = [
      ["物品ID", "物品备注"],
      [1, "a"],
    ];
    const chest = [
      ["备注", "说明"],
      ["礼包", "无ID"],
      ["礼包2", "仍无ID"],
    ];
    const merged = appendChestRowsToItemSheet(item, chest);
    assert.equal(merged.length, 2);
    assert.equal(merged, item);
  });

  it("infers numeric first column when no ID header alias", () => {
    const item = [
      ["物品ID", "物品备注"],
      [1, "a"],
    ];
    const chestOk = [
      ["随便", "备注"],
      [20200075, "礼包"],
      [20200076, "礼包2"],
      [20200077, "礼包3"],
    ];
    const merged = appendChestRowsToItemSheet(item, chestOk);
    assert.equal(merged.length, 5);
    assert.equal(normalizeIdCell(merged[2]![0]), "20200075");
    assert.equal(rowMatchesKeyword(merged[2]!, "20200075", 0), true);
  });

  it("skips multi-row meta headers and does not append C+B", () => {
    const item = [
      ["物品ID", "物品备注", "类型备注"],
      [1, "a", "武器"],
    ];
    const chest = [
      ["礼包ID", "物品备注"],
      ["C+B", "N/A"],
      ["key int", ""],
      ["ChestID", ""],
      ["由数值规划ID段", "说明"],
      [20200075, "礼包A"],
      [20200076, "礼包B"],
    ];
    const { aoa, appended, stamped } = mergeChestSheetIntoItem(item, chest);
    assert.equal(stamped, 0);
    assert.equal(appended, 2);
    assert.equal(aoa.length, 4);
    assert.equal(normalizeIdCell(aoa[2]![0]), "20200075");
    assert.equal(aoa[2]![2], CHEST_TYPE_REMARK);
    assert.equal(
      aoa.some((r) => String(r[0]).includes("C+B") || String(r[0]).includes("ChestID")),
      false,
    );
    assert.equal(rowMatchesKeyword(aoa[2]!, "20200075", 0), true);
  });

  it("stamps chest on existing Item rows instead of duplicating", () => {
    const item = [
      ["物品ID", "物品备注", "类型备注"],
      [20200075, "已有礼包", "材料"],
      [999, "其它", "武器"],
    ];
    const chest = [
      ["礼包ID", "物品备注"],
      ["C+B", ""],
      ["key int", ""],
      ["ChestID", ""],
      ["说明", ""],
      [20200075, "礼包"],
      [20200099, "新礼包"],
    ];
    const { aoa, appended, stamped } = mergeChestSheetIntoItem(item, chest);
    assert.equal(stamped, 1);
    assert.equal(appended, 1);
    assert.equal(aoa.length, 4);
    assert.equal(aoa[1]![2], CHEST_TYPE_REMARK);
    assert.equal(normalizeIdCell(aoa[1]![0]), "20200075");
    assert.equal(normalizeIdCell(aoa[3]![0]), "20200099");
    assert.equal(aoa[3]![2], CHEST_TYPE_REMARK);
  });

  it("returns base when extra empty or missing", () => {
    const base = [["物品ID"], [1]];
    assert.equal(appendAlignedSheetRows(base, null), base);
    assert.equal(appendAlignedSheetRows(base, [["物品ID"]]), base);
  });
});
