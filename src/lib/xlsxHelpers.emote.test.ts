import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDaHongJianShiEmoteTypeRemark, rowMatchesEmotePreset } from "./xlsxHelpers.ts";

describe("rowMatchesEmotePreset", () => {
  it("includes normal Emote type remarks", () => {
    assert.equal(rowMatchesEmotePreset("秀肌肉Emote"), true);
    assert.equal(rowMatchesEmotePreset("贵族礼仪Emote"), true);
  });

  it("excludes 大红检视 Emote items", () => {
    assert.equal(rowMatchesEmotePreset("大红检视Emote秘源圣树的残枝"), false);
    assert.equal(rowMatchesEmotePreset("大红检视Emote黄金断剑"), false);
  });

  it("allows bare Emote and rejects 大红检视 without Emote", () => {
    assert.equal(rowMatchesEmotePreset("Emote"), true);
    assert.equal(rowMatchesEmotePreset("大红检视"), false);
  });
});

describe("isDaHongJianShiEmoteTypeRemark", () => {
  it("detects 大红检视 class Emote keys", () => {
    assert.equal(isDaHongJianShiEmoteTypeRemark("大红检视Emote黄金断剑"), true);
    assert.equal(isDaHongJianShiEmoteTypeRemark("秀肌肉Emote"), false);
  });
});
