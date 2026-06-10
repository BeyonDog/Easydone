import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isDisplayableTableBodyRow,
  isSelectableTableDataRow,
  parseItemRowId,
  parseTableRowIdForCopy,
} from "./tableRowId.ts";

const RCT_ITEM_AOA = [
  ["物品ID", "备注"],
  ["C+B+G", "N/A"],
  ["key int", "string"],
  ["ItemID", null],
  ["物品ID", "备注"],
  [1, "战士"],
  [1500017, "头像框占位"],
];

describe("isSelectableTableDataRow", () => {
  it("excludes RCT metadata rows including duplicate 物品ID header", () => {
    assert.equal(isSelectableTableDataRow(RCT_ITEM_AOA, 0, "item"), false);
    assert.equal(isSelectableTableDataRow(RCT_ITEM_AOA, 1, "item"), false);
    assert.equal(isSelectableTableDataRow(RCT_ITEM_AOA, 2, "item"), false);
    assert.equal(isSelectableTableDataRow(RCT_ITEM_AOA, 3, "item"), false);
    assert.equal(isSelectableTableDataRow(RCT_ITEM_AOA, 4, "item"), true);
    assert.equal(isSelectableTableDataRow(RCT_ITEM_AOA, 5, "item"), true);
  });

  it("excludes duplicate 任务ID metadata on task sheet", () => {
    const taskAoa = [
      ["任务ID", "备注"],
      ["C+B", "N/A"],
      ["key int", "string"],
      ["TaskID", null],
      ["任务ID", "备注"],
      [10000, "首次胜利"],
    ];
    assert.equal(isSelectableTableDataRow(taskAoa, 3, "task"), false);
    assert.equal(isSelectableTableDataRow(taskAoa, 4, "task"), true);
  });
});

describe("isDisplayableTableBodyRow", () => {
  it("filters RCT item sheet to displayable rows only", () => {
    const displayable = [0, 1, 2, 3, 4, 5].filter((di) =>
      isDisplayableTableBodyRow(RCT_ITEM_AOA, di, "item"),
    );
    assert.deepEqual(displayable, [4, 5]);
  });
});

describe("parseTableRowIdForCopy", () => {
  it("parses item and task ids from sheet rows", () => {
    const itemAoa = [["物品ID", "备注"], [1001, "剑"]];
    assert.equal(parseTableRowIdForCopy(itemAoa, 0, "item"), "1001");

    const taskAoa = [["任务ID", "备注"], [42, "主线"]];
    assert.equal(parseTableRowIdForCopy(taskAoa, 0, "task"), "42");
  });

  it("returns null when id column missing", () => {
    const aoa = [["备注"], ["x"]];
    assert.equal(parseItemRowId(aoa, 0), null);
  });
});
