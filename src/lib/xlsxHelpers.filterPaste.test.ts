import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FILTER_PASTE_DISPLAY_FAIL,
  FILTER_PASTE_DISPLAY_OK,
  analyzeFilterPasteMatches,
  formatCustomKeywordChipLabel,
  formatCustomKeywordChipTitle,
  formatFilterPasteInputDisplay,
  formatRecognizedIdLabel,
  formatRecognizedIdRatioLabel,
  formatUnmatchedFilterTokensHint,
  isBulkyFilterPaste,
  isFilterPasteDisplayPlaceholder,
  isFilterPasteSuccessDisplay,
  normalizeFilterKeywordForStorage,
  parseFilterKeywordTokens,
  MAX_FILTER_PASTE_TOKENS,
  rowHasAnyKeywordHit,
  rowMatchesKeyword,
} from "./xlsxHelpers.ts";

describe("parseFilterKeywordTokens", () => {
  it("splits Excel rows and columns", () => {
    assert.deepEqual(parseFilterKeywordTokens("101\n102"), ["101", "102"]);
    assert.deepEqual(parseFilterKeywordTokens("101\t102"), ["101", "102"]);
    assert.deepEqual(parseFilterKeywordTokens("101\r\n102\t103"), ["101", "102", "103"]);
  });

  it("strips type-label suffix from table copy", () => {
    assert.deepEqual(
      parseFilterKeywordTokens("20260015(礼包)\n11010016(武器)\n11010035（防具）"),
      ["20260015", "11010016", "11010035"],
    );
  });

  it("strips surrounding quotes", () => {
    assert.deepEqual(parseFilterKeywordTokens('"20260015"\n\'11010016\''), ["20260015", "11010016"]);
  });

  it("does not split on spaces inside a cell", () => {
    assert.deepEqual(parseFilterKeywordTokens("大红 检视"), ["大红 检视"]);
  });

  it("drops empties and dedupes in order", () => {
    assert.deepEqual(parseFilterKeywordTokens("101\n\n101\t\t102"), ["101", "102"]);
  });

  it("drops null / N/A placeholder tokens from paste", () => {
    assert.deepEqual(parseFilterKeywordTokens("40017\nnull\nnull"), ["40017"]);
    assert.deepEqual(parseFilterKeywordTokens("40017\nNULL\nN/A\nna"), ["40017"]);
    assert.deepEqual(parseFilterKeywordTokens("null\nNULL"), []);
  });

  it("caps token count", () => {
    const raw = Array.from({ length: MAX_FILTER_PASTE_TOKENS + 50 }, (_, i) => String(i)).join("\n");
    assert.equal(parseFilterKeywordTokens(raw).length, MAX_FILTER_PASTE_TOKENS);
  });
});

describe("rowMatchesKeyword paste modes", () => {
  it("matches after stripping type-label from pasted multi-id text", () => {
    const rows = [
      [20260015, "礼包"],
      [11010016, "武器A"],
      [11010035, "武器B"],
    ];
    const pasted = "20260015(礼包)\n11010016(武器)\n11010035(武器)";
    assert.equal(rowHasAnyKeywordHit(rows, pasted, 0), true);
    assert.equal(rowMatchesKeyword(rows[1]!, pasted, 0), true);
    assert.equal(formatFilterPasteInputDisplay(pasted, 3, 3), formatRecognizedIdRatioLabel(3, 3));
  });

  it("keeps includes for a single non-numeric keyword", () => {
    assert.equal(rowMatchesKeyword(["试炼之剑"], "试"), true);
    assert.equal(rowMatchesKeyword(["猎人"], "试"), false);
  });

  it("exact-matches numeric ID on idCol only", () => {
    const chestRow = [1180036, "宝箱", "掉落含20200036"];
    assert.equal(rowMatchesKeyword(chestRow, "20200036", 0), false);
    assert.equal(rowMatchesKeyword([20200036, "道具", ""], "20200036", 0), true);
    assert.equal(rowMatchesKeyword(["20200036", "道具", ""], "20200036", 0), true);
  });

  it("multi numeric paste ORs on idCol only", () => {
    assert.equal(rowMatchesKeyword([101, "a"], "101\n102", 0), true);
    assert.equal(rowMatchesKeyword([102, "a"], "101\n102", 0), true);
    assert.equal(rowMatchesKeyword([999, "含101"], "101\n102", 0), false);
    assert.equal(rowMatchesKeyword([1010, "a"], "101\n102", 0), false);
  });

  it("without idCol falls back for multi numeric", () => {
    assert.equal(rowMatchesKeyword(["101"], "101\n102"), true);
    assert.equal(rowMatchesKeyword(["102"], "101\n102"), true);
    assert.equal(rowMatchesKeyword(["1010"], "101\n102"), false);
  });

  it("rowHasAnyKeywordHit early-exits on first hit", () => {
    const rows = [["999"], ["101"], ["888"]];
    assert.equal(rowHasAnyKeywordHit(rows, "101\n102", 0), true);
    assert.equal(rowHasAnyKeywordHit(rows, "777\n888", 0), true);
    assert.equal(rowHasAnyKeywordHit(rows, "1\n2", 0), false);
  });
});

describe("filter paste display", () => {
  it("detects bulky paste", () => {
    assert.equal(isBulkyFilterPaste("101"), false);
    assert.equal(isBulkyFilterPaste("101\n102"), true);
    assert.equal(isBulkyFilterPaste("101\t102"), true);
  });

  it("formats compact input display with hit ratio", () => {
    assert.equal(formatFilterPasteInputDisplay("101", 1, 1), null);
    assert.equal(formatFilterPasteInputDisplay("101\n102", 2, 2), formatRecognizedIdRatioLabel(2, 2));
    assert.equal(formatFilterPasteInputDisplay("101\n102", 0, 2), FILTER_PASTE_DISPLAY_FAIL);
    assert.equal(formatFilterPasteInputDisplay("\n\t", 0, 0), FILTER_PASTE_DISPLAY_FAIL);
  });

  it("analyzeFilterPasteMatches reports unmatched ids", () => {
    const rows = [
      [20260015],
      [11010016],
      [11010035],
      [11010045],
    ];
    const pasted = "20200075\n20260015\n11010016\n11010035\n11010045";
    const stats = analyzeFilterPasteMatches(rows, pasted, 0);
    assert.equal(stats.matched.length, 4);
    assert.equal(stats.tokens.length, 5);
    assert.deepEqual(stats.unmatched, ["20200075"]);
    assert.equal(
      formatFilterPasteInputDisplay(pasted, stats.matched.length, stats.tokens.length),
      "已识别id · 4/5",
    );
    assert.match(formatUnmatchedFilterTokensHint(stats.unmatched), /20200075/);
  });

  it("paste with null placeholders still matches numeric id", () => {
    const rows = [[40017, "道具"]];
    const pasted = "40017\nnull\nnull";
    const stats = analyzeFilterPasteMatches(rows, pasted, 0);
    assert.deepEqual(stats.tokens, ["40017"]);
    assert.deepEqual(stats.matched, ["40017"]);
    assert.deepEqual(stats.unmatched, []);
    assert.equal(rowHasAnyKeywordHit(rows, pasted, 0), true);
    assert.equal(
      formatFilterPasteInputDisplay(pasted, stats.matched.length, stats.tokens.length),
      formatRecognizedIdRatioLabel(1, 1),
    );
  });

  it("recognizes placeholder strings", () => {
    assert.equal(isFilterPasteSuccessDisplay(formatRecognizedIdRatioLabel(4, 5)), true);
    assert.equal(isFilterPasteSuccessDisplay(formatRecognizedIdLabel(12)), true);
    assert.equal(isFilterPasteSuccessDisplay(FILTER_PASTE_DISPLAY_OK), true);
    assert.equal(isFilterPasteDisplayPlaceholder(FILTER_PASTE_DISPLAY_FAIL), true);
    assert.equal(isFilterPasteDisplayPlaceholder("101"), false);
  });

  it("normalizes storage and chip labels", () => {
    assert.equal(normalizeFilterKeywordForStorage("101\t102\n101"), "101\n102");
    assert.equal(formatCustomKeywordChipLabel("101\n102"), formatRecognizedIdLabel(2));
    assert.equal(formatCustomKeywordChipLabel("101"), "101");
    assert.match(formatCustomKeywordChipTitle("101\n102\n103"), /共 3 项/);
  });
});
