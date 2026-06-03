import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applySnapshot, snapshotFromSelection, viewSelectionKey } from "./viewSelectionCache.ts";

describe("viewSelectionKey", () => {
  it("maps item, task, template, and addExp", () => {
    assert.equal(viewSelectionKey({ kind: "item" }), "item");
    assert.equal(viewSelectionKey({ kind: "task" }), "task");
    assert.equal(viewSelectionKey({ kind: "template", id: "abc" }), "template:abc");
    assert.equal(viewSelectionKey({ kind: "snapshot", id: "abc" }), "template:abc");
    assert.equal(viewSelectionKey({ kind: "addExp" }), null);
  });
});

describe("snapshotFromSelection / applySnapshot", () => {
  it("round-trips selection state", () => {
    const snap = snapshotFromSelection(new Set([1, 3]), [3, 1], { 1: 2, 3: 5 });
    const restored = applySnapshot(snap);
    assert.deepEqual([...restored.selectedRows].sort(), [1, 3]);
    assert.deepEqual(restored.selectedRowOrder, [3, 1]);
    assert.deepEqual(restored.itemLineQty, { 1: 2, 3: 5 });
  });
});
