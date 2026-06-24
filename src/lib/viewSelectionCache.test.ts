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
  it("round-trips selection state including durability", () => {
    const snap = snapshotFromSelection(
      new Set([1, 3]),
      [3, 1],
      { 1: 2, 3: 5 },
      { 1: 80 },
      new Set([1]),
      { 3: 12 },
      new Set([3]),
    );
    const restored = applySnapshot(snap);
    assert.deepEqual([...restored.selectedRows].sort(), [1, 3]);
    assert.deepEqual(restored.selectedRowOrder, [3, 1]);
    assert.deepEqual(restored.itemLineQty, { 1: 2, 3: 5 });
    assert.deepEqual(restored.itemLineWear, { 1: 80 });
    assert.deepEqual([...restored.wearRowOverride], [1]);
    assert.deepEqual(restored.itemLineDurability, { 3: 12 });
    assert.deepEqual([...restored.durabilityRowOverride], [3]);
  });
});
