import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyBoxSelectToggle,
  boxSelectOverlayStyleFixed,
  computeBoxSelectHitsFromPointer,
  computeRowBandHits,
  isNativeScrollbarHitRect,
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

describe("isNativeScrollbarHitRect", () => {
  const rect = { left: 0, top: 0, right: 200, bottom: 100 };

  it("detects vertical scrollbar gutter", () => {
    assert.equal(
      isNativeScrollbarHitRect(rect, 300, 100, 200, 200, 195, 50, 8),
      true,
    );
  });

  it("detects horizontal scrollbar gutter", () => {
    assert.equal(
      isNativeScrollbarHitRect(rect, 100, 100, 300, 200, 50, 95, 8),
      true,
    );
  });

  it("ignores content area", () => {
    assert.equal(
      isNativeScrollbarHitRect(rect, 300, 100, 300, 200, 100, 50, 8),
      false,
    );
  });
});

describe("boxSelectOverlayStyleFixed", () => {
  it("uses client coordinates", () => {
    const style = boxSelectOverlayStyleFixed({
      startClientX: 10,
      startClientY: 20,
      curClientX: 30,
      curClientY: 50,
      originScrollTop: 0,
      originScrollLeft: 0,
    });
    assert.equal(style.position, "fixed");
    assert.equal(style.left, 10);
    assert.equal(style.top, 20);
    assert.equal(style.width, 20);
    assert.equal(style.height, 30);
  });
});

describe("computeBoxSelectHitsFromPointer", () => {
  it("accounts for scroll delta while dragging", () => {
    const hit = computeBoxSelectHitsFromPointer({
      sel: {
        startClientX: 0,
        startClientY: 160,
        curClientX: 0,
        curClientY: 160,
        originScrollTop: 0,
        originScrollLeft: 0,
      },
      wrapRectTop: 100,
      wrapScrollTop: 30,
      rowCount: 10,
      rowHeight: 30,
      bodyOffsetY: 0,
      dataIdxForVisualIndex: (i) => i,
    });
    assert.ok(hit);
    assert.equal(hit.firstVis, 2);
    assert.equal(hit.lastVis, 3);
  });
});
