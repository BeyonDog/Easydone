import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseItemPriceCell, patchItemCsvPrices } from "./gtopItemCsvPatch.ts";

const SAMPLE = `ItemID,BaseValue,StdPrice
1001,10,20
1002,30,40`;

describe("patchItemCsvPrices", () => {
  it("patches BaseValue only", () => {
    const result = patchItemCsvPrices(SAMPLE, "1001", { baseValue: 99 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.oldBaseValue, "10");
    assert.equal(result.newBaseValue, "99");
    assert.match(result.text, /1001,99,20/);
    assert.match(result.text, /1002,30,40/);
  });

  it("patches StdPrice only", () => {
    const result = patchItemCsvPrices(SAMPLE, "1002", { stdPrice: 55 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.oldStdPrice, "40");
    assert.equal(result.newStdPrice, "55");
    assert.match(result.text, /1002,30,55/);
  });

  it("patches both columns", () => {
    const result = patchItemCsvPrices(SAMPLE, "1001", { baseValue: 1, stdPrice: 2 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.text, /1001,1,2/);
  });

  it("fails when item id missing", () => {
    const result = patchItemCsvPrices(SAMPLE, "9999", { baseValue: 1 });
    assert.equal(result.ok, false);
  });
});

describe("parseItemPriceCell", () => {
  it("treats empty as 0", () => {
    const result = parseItemPriceCell("", "BaseValue");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, 0);
  });

  it("parses non-negative integer", () => {
    const result = parseItemPriceCell("42", "StdPrice");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, 42);
  });

  it("rejects invalid value", () => {
    const result = parseItemPriceCell("abc", "BaseValue");
    assert.equal(result.ok, false);
  });
});
