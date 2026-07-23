import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepareRankUpgradeDelta } from "./rankUpRunner.ts";

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
