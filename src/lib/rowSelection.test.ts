import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toggleVisibleRowSelection } from "./rowSelection.ts";

describe("toggleVisibleRowSelection", () => {
  const visible = [1, 2, 3];

  it("selects all visible when none selected", () => {
    const result = toggleVisibleRowSelection(new Set(), [], visible);
    assert.deepEqual([...result.selectedRows].sort(), [1, 2, 3]);
    assert.deepEqual(result.selectedRowOrder, [1, 2, 3]);
  });

  it("clears visible selection when partially selected", () => {
    const result = toggleVisibleRowSelection(new Set([1, 2]), [1, 2], visible);
    assert.equal(result.selectedRows.size, 0);
    assert.deepEqual(result.selectedRowOrder, []);
  });

  it("clears visible selection when all visible selected", () => {
    const result = toggleVisibleRowSelection(new Set([1, 2, 3]), [1, 2, 3], visible);
    assert.equal(result.selectedRows.size, 0);
    assert.deepEqual(result.selectedRowOrder, []);
  });

  it("keeps hidden selections when clearing visible", () => {
    const result = toggleVisibleRowSelection(new Set([1, 99]), [1, 99], visible);
    assert.deepEqual([...result.selectedRows], [99]);
    assert.deepEqual(result.selectedRowOrder, [99]);
  });
});
