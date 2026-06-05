import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseItemRowId, parseTableRowIdForCopy } from "./tableRowId.ts";

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
