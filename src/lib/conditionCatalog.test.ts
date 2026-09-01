import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cdtTypeLabel,
  comparisonLabel,
  gameModeLabel,
  isKnownCdtType,
  matchModeLabel,
  preCdtTypeLabel,
  preCdtValueMeaning,
} from "./conditionCatalog.ts";

describe("conditionCatalog", () => {
  it("maps CdtType 1 to 击杀", () => {
    assert.equal(cdtTypeLabel(1), "击杀");
    assert.equal(isKnownCdtType(1), true);
  });

  it("maps kill CLASS_GROUP_ID 52 to 击杀指定职业玩家", () => {
    assert.equal(preCdtTypeLabel(52, 1), "击杀指定职业玩家");
  });

  it("maps Comparison 3 to 不等于", () => {
    assert.equal(comparisonLabel(3), "不等于");
  });

  it("maps GameMode 101 to 王城 and MatchMode 3 to 地狱", () => {
    assert.equal(gameModeLabel(101), "王城");
    assert.equal(matchModeLabel(3), "地狱");
    assert.equal(preCdtValueMeaning(49, 101), "王城");
    assert.equal(preCdtValueMeaning(15, 3), "地狱");
  });

  it("falls back to 未知类型 for unknown ids", () => {
    assert.equal(cdtTypeLabel(9999), "未知类型(9999)");
    assert.equal(isKnownCdtType(9999), false);
  });
});
