import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyBoxSelectToggle,
  computeRowBandHits,
  pointerDragDistancePx,
} from "./tableBoxSelect.ts";

describe("applyBoxSelectToggle", () => {
  it("selects all hit rows when none in box are selected", () => {
    const result = applyBoxSelectToggle(new Set([99]), [99], [1, 2, 3]);
    assert.deepEqual([...result.selectedRows].sort(), [1, 2, 3, 99]);
    assert.deepEqual(result.selectedRowOrder, [99, 1, 2, 3]);
  });

  it("deselects only selected rows in box when any hit row is selected", () => {
    const result = applyBoxSelectToggle(new Set([1, 5]), [1, 5], [1, 2, 3]);
    assert.deepEqual([...result.selectedRows], [5]);
    assert.deepEqual(result.selectedRowOrder, [5]);
  });

  it("deselects all hit rows when all in box were selected", () => {
    const result = applyBoxSelectToggle(new Set([1, 2, 3]), [1, 2, 3], [1, 2, 3]);
    assert.equal(result.selectedRows.size, 0);
    assert.deepEqual(result.selectedRowOrder, []);
  });
});

describe("computeRowBandHits", () => {
  it("maps visual row band to dataIdxs", () => {
    const hit = computeRowBandHits({
      y1: 60,
      y2: 89,
      rowCount: 5,
      rowHeight: 30,
      bodyOffsetY: 0,
      dataIdxForVisualIndex: (i) => i + 10,
    });
    assert.ok(hit);
    assert.equal(hit.firstVis, 2);
    assert.equal(hit.lastVis, 2);
    assert.deepEqual(hit.dataIdxs, [12]);
  });
});

describe("pointerDragDistancePx", () => {
  it("computes hypot distance", () => {
    const d = pointerDragDistancePx({
      startClientX: 0,
      startClientY: 0,
      curClientX: 3,
      curClientY: 4,
      originScrollTop: 0,
      originScrollLeft: 0,
    });
    assert.equal(d, 5);
  });
});
