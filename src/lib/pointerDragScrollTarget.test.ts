import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POINTER_DRAG_SCROLL_IGNORE_SELECTOR } from "./pointerDragScrollTarget.ts";

describe("POINTER_DRAG_SCROLL_IGNORE_SELECTOR", () => {
  it("includes buttons, drag handle, and delete badge", () => {
    assert.ok(POINTER_DRAG_SCROLL_IGNORE_SELECTOR.includes("button"));
    assert.ok(POINTER_DRAG_SCROLL_IGNORE_SELECTOR.includes(".sidebar-card-drag-handle"));
    assert.ok(POINTER_DRAG_SCROLL_IGNORE_SELECTOR.includes(".sidebar-card-delete-badge"));
  });
});
