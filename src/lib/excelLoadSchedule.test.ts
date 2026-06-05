import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isStaleExcelLoadSeq, shouldSkipSilentExcelLoad } from "./excelLoadSchedule.ts";

describe("shouldSkipSilentExcelLoad", () => {
  it("skips when any load is in flight", () => {
    assert.equal(shouldSkipSilentExcelLoad(0), false);
    assert.equal(shouldSkipSilentExcelLoad(1), true);
    assert.equal(shouldSkipSilentExcelLoad(2), true);
  });
});

describe("isStaleExcelLoadSeq", () => {
  it("detects superseded requests", () => {
    assert.equal(isStaleExcelLoadSeq(1, 2), true);
    assert.equal(isStaleExcelLoadSeq(2, 2), false);
  });
});
