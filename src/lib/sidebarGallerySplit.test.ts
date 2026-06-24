import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampSidebarGallerySplitWidth,
  DEFAULT_SIDEBAR_GALLERY_SPLIT_PX,
  MIN_GALLERY_SPLIT_PX,
  MIN_MAIN_SPLIT_PX,
  resolveSidebarGallerySplitWidth,
} from "./sidebarGallerySplit.ts";

describe("clampSidebarGallerySplitWidth", () => {
  it("clamps to minimum gallery width", () => {
    assert.equal(clampSidebarGallerySplitWidth(100, 1200), MIN_GALLERY_SPLIT_PX);
  });

  it("clamps to maximum leaving room for main panel", () => {
    const bodyWidth = 1000;
    const max = bodyWidth - MIN_MAIN_SPLIT_PX;
    assert.equal(clampSidebarGallerySplitWidth(900, bodyWidth), max);
  });

  it("keeps value within range", () => {
    assert.equal(clampSidebarGallerySplitWidth(400, 1200), 400);
  });

  it("handles very narrow body", () => {
    assert.equal(clampSidebarGallerySplitWidth(500, 500), MIN_GALLERY_SPLIT_PX);
  });
});

describe("resolveSidebarGallerySplitWidth", () => {
  it("uses default when saved is invalid", () => {
    assert.equal(
      resolveSidebarGallerySplitWidth(null, 1200),
      clampSidebarGallerySplitWidth(DEFAULT_SIDEBAR_GALLERY_SPLIT_PX, 1200),
    );
  });

  it("uses saved value when valid", () => {
    assert.equal(resolveSidebarGallerySplitWidth(450, 1200), 450);
  });
});
