import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  removeDataRowsFromAoa,
  resolveTemplateRowsToDelete,
} from "./removeTemplateRows.ts";

describe("resolveTemplateRowsToDelete", () => {
  it("uses all selected rows when 2+ checked", () => {
    const rows = resolveTemplateRowsToDelete(5, new Set([1, 2, 3]));
    assert.deepEqual([...rows].sort((a, b) => a - b), [1, 2, 3]);
  });

  it("uses right-clicked row when fewer than 2 selected", () => {
    assert.deepEqual([...resolveTemplateRowsToDelete(4, new Set())], [4]);
    assert.deepEqual([...resolveTemplateRowsToDelete(4, new Set([9]))], [4]);
  });

  it("falls back to single selection when dataIdx is null", () => {
    assert.deepEqual([...resolveTemplateRowsToDelete(null, new Set([7]))], [7]);
  });

  it("returns empty set when nothing to delete", () => {
    assert.equal(resolveTemplateRowsToDelete(null, new Set()).size, 0);
  });
});

describe("removeDataRowsFromAoa", () => {
  const aoa = [
    ["物品ID", "名称"],
    ["1", "a"],
    ["2", "b"],
    ["3", "c"],
  ];

  it("removes one row by dataIdx", () => {
    const next = removeDataRowsFromAoa(aoa, new Set([1]));
    assert.deepEqual(next, [
      ["物品ID", "名称"],
      ["1", "a"],
      ["3", "c"],
    ]);
  });

  it("removes multiple rows", () => {
    const next = removeDataRowsFromAoa(aoa, new Set([0, 2]));
    assert.deepEqual(next, [
      ["物品ID", "名称"],
      ["2", "b"],
    ]);
  });

  it("noop when rowsToRemove is empty", () => {
    assert.equal(removeDataRowsFromAoa(aoa, new Set()), aoa);
  });
});
