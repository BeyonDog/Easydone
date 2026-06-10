import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampScrollLeft,
  computeMaxScrollLeft,
  isHorizontalDominantWheel,
  resolveHorizontalWheelDelta,
} from "./tableAxisScroll.ts";

describe("clampScrollLeft", () => {
  it("clamps to zero and max", () => {
    assert.equal(clampScrollLeft(-5, 100), 0);
    assert.equal(clampScrollLeft(50, 100), 50);
    assert.equal(clampScrollLeft(200, 100), 100);
    assert.equal(clampScrollLeft(10, 0), 0);
  });
});

describe("computeMaxScrollLeft", () => {
  it("returns content minus viewport", () => {
    assert.equal(computeMaxScrollLeft(500, 300), 200);
    assert.equal(computeMaxScrollLeft(200, 300), 0);
  });
});

describe("isHorizontalDominantWheel", () => {
  it("detects horizontal-dominant delta", () => {
    assert.equal(isHorizontalDominantWheel(10, 2), true);
    assert.equal(isHorizontalDominantWheel(2, 10), false);
  });

  it("treats shift+vertical as horizontal", () => {
    assert.equal(isHorizontalDominantWheel(0, 12, true), true);
  });
});

describe("resolveHorizontalWheelDelta", () => {
  it("uses deltaY when shift held", () => {
    assert.equal(resolveHorizontalWheelDelta(0, 15, true), 15);
  });

  it("uses deltaX otherwise", () => {
    assert.equal(resolveHorizontalWheelDelta(8, 0, false), 8);
  });
});
