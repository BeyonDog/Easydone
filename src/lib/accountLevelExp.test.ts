import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findHeaderRowIndex,
  formatExpAmountForApi,
  parseAccountLevelSheet,
  secondBatchExpAfterProbe,
} from "./accountLevelExp.ts";

describe("parseAccountLevelSheet", () => {
  it("parses level and cumulative columns (Chinese headers)", () => {
    const aoa = [
      ["等级", "升到该等级所需的累计经验值"],
      [1, 0],
      [2, 80],
      [3, 140],
    ];
    const r = parseAccountLevelSheet(aoa);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.byLevel.get(2), 80);
    assert.equal(r.byLevel.get(3), 140);
  });

  it("parses Level + TotalExp (project AccountLevel sheet)", () => {
    const aoa = [
      ["Level", "TotalExp", "RewardID", "HuterRoadPoints"],
      [1, 0, 100, 0],
      [2, 80, 101, 1],
      [3, 140, 102, 2],
    ];
    const r = parseAccountLevelSheet(aoa);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.byLevel.get(2), 80);
    assert.equal(r.byLevel.get(3), 140);
  });

  it("finds header on row 3 when rows above are title/blank", () => {
    const aoa = [
      ["AccountLevel 配置"],
      [""],
      ["Level", "TotalExp", "RewardID"],
      [1, 0, 100],
      [2, 80, 101],
      [3, 140, 102],
    ];
    assert.equal(findHeaderRowIndex(aoa), 2);
    const r = parseAccountLevelSheet(aoa);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.byLevel.get(3), 140);
  });

  it("includes header preview when no header row matches", () => {
    const aoa = [
      ["OnlyReward", "Foo"],
      [1, 2],
    ];
    const r = parseAccountLevelSheet(aoa);
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(r.error, /第1行/);
    assert.match(r.error, /OnlyReward/);
  });
});

describe("secondBatchExpAfterProbe", () => {
  const byLevel = new Map([
    [2, 80],
    [3, 140],
    [4, 220],
  ]);

  it("computes secondExp from exp_after", () => {
    const r = secondBatchExpAfterProbe(byLevel, 3, 2, 90);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.secondExp, 50);
  });

  it("rejects exp_after below table floor", () => {
    const r = secondBatchExpAfterProbe(byLevel, 3, 2, 70);
    assert.equal(r.ok, false);
  });
});

describe("formatExpAmountForApi", () => {
  it("returns string integer", () => {
    assert.equal(formatExpAmountForApi(10), "10");
  });
});
