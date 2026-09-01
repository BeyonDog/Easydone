import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepareRankAddDelta, prepareRankUpgradeDelta } from "./rankUpRunner.ts";

describe("prepareRankUpgradeDelta", () => {
  it("accepts positive upgrade delta", () => {
    const r = prepareRankUpgradeDelta(100, 1900);
    assert.deepEqual(r, { ok: true, delta: 1800 });
  });

  it("rejects when already at or above target", () => {
    const r = prepareRankUpgradeDelta(1900, 1900);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.error.includes("已达或超过"));
  });

  it("rejects invalid current score", () => {
    const r = prepareRankUpgradeDelta(Number.NaN, 300);
    assert.equal(r.ok, false);
  });
});

describe("prepareRankAddDelta", () => {
  it("accepts positive integer add amount", () => {
    assert.deepEqual(prepareRankAddDelta(100, 50), { ok: true, delta: 50 });
  });

  it("rejects zero, negative, or non-integer add amount", () => {
    assert.equal(prepareRankAddDelta(100, 0).ok, false);
    assert.equal(prepareRankAddDelta(100, -1).ok, false);
    assert.equal(prepareRankAddDelta(100, 1.5).ok, false);
    assert.equal(prepareRankAddDelta(100, Number.NaN).ok, false);
  });

  it("rejects invalid current score", () => {
    const r = prepareRankAddDelta(Number.NaN, 10);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.ok(r.error.includes("当前段位分"));
  });
});
