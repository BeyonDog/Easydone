import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectColumnUniqueValues,
  columnCellFilterKey,
  columnFilterKey,
  columnValueFiltersActive,
  rowPassesColumnValueFilters,
  sortColumnFilterValues,
} from "./columnValueFilter.ts";

describe("columnValueFilter", () => {
  it("columnFilterKey uses header or fallback index", () => {
    assert.equal(columnFilterKey("物品品质", 3), "物品品质");
    assert.equal(columnFilterKey("  ", 3), "__col_3");
  });

  it("columnCellFilterKey maps empty to 空", () => {
    assert.equal(columnCellFilterKey(""), "空");
    assert.equal(columnCellFilterKey("武器"), "武器");
  });

  it("sortColumnFilterValues puts 空 first", () => {
    const sorted = sortColumnFilterValues(["蓝", "空", "武器"]);
    assert.equal(sorted[0], "空");
    assert.deepEqual(new Set(sorted), new Set(["空", "武器", "蓝"]));
  });

  it("collectColumnUniqueValues dedupes and sorts", () => {
    const rows = [{ row: ["武器", "a"] }, { row: ["防具", "b"] }, { row: ["武器", "c"] }];
    const values = collectColumnUniqueValues(rows, 0);
    assert.equal(values.length, 2);
    assert.deepEqual(new Set(values), new Set(["武器", "防具"]));
  });

  it("rowPassesColumnValueFilters OR within column", () => {
    const headers = ["类型"];
    const rowA = ["武器"];
    const rowB = ["防具"];
    const filters = { 类型: ["武器", "食材"] };
    assert.equal(rowPassesColumnValueFilters(rowA, filters, headers), true);
    assert.equal(rowPassesColumnValueFilters(rowB, filters, headers), false);
  });

  it("rowPassesColumnValueFilters AND across columns", () => {
    const headers = ["类型", "品质"];
    const filters = { 类型: ["武器"], 品质: ["蓝"] };
    assert.equal(rowPassesColumnValueFilters(["武器", "蓝"], filters, headers), true);
    assert.equal(rowPassesColumnValueFilters(["武器", "绿"], filters, headers), false);
    assert.equal(rowPassesColumnValueFilters(["防具", "蓝"], filters, headers), false);
  });

  it("passes when no active column filters", () => {
    assert.equal(columnValueFiltersActive({}), false);
    assert.equal(rowPassesColumnValueFilters(["x"], {}, ["类型"]), true);
    assert.equal(rowPassesColumnValueFilters(["x"], { 类型: [] }, ["类型"]), true);
  });
});
