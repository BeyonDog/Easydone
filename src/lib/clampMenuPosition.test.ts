import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMenuPosition } from "./clampMenuPosition.ts";

describe("clampMenuPosition", () => {
  const vw = 800;
  const vh = 600;
  const menuW = 160;
  const menuH = 200;

  it("keeps position when menu fits", () => {
    const r = clampMenuPosition(100, 100, menuW, menuH, vw, vh);
    assert.equal(r.x, 100);
    assert.equal(r.y, 100);
  });

  it("shifts left when overflowing right edge", () => {
    const r = clampMenuPosition(700, 100, menuW, menuH, vw, vh, 8);
    assert.equal(r.x, vw - menuW - 8);
    assert.equal(r.y, 100);
  });

  it("shifts up when overflowing bottom edge", () => {
    const r = clampMenuPosition(100, 500, menuW, menuH, vw, vh, 8);
    assert.equal(r.x, 100);
    assert.equal(r.y, vh - menuH - 8);
  });

  it("clamps to padding minimum", () => {
    const r = clampMenuPosition(0, 0, menuW, menuH, vw, vh, 8);
    assert.equal(r.x, 8);
    assert.equal(r.y, 8);
  });
});
