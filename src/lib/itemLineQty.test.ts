import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampItemLineQty, parseItemLineQtyInput } from "./itemLineQty.ts";

describe("clampItemLineQty", () => {
  it("clamps to 1..9999", () => {
    assert.equal(clampItemLineQty(0), 1);
    assert.equal(clampItemLineQty(50), 50);
    assert.equal(clampItemLineQty(10000), 9999);
    assert.equal(clampItemLineQty(1.9), 1);
  });
});

describe("parseItemLineQtyInput", () => {
  it("parses valid integers", () => {
    assert.equal(parseItemLineQtyInput("1"), 1);
    assert.equal(parseItemLineQtyInput(" 42 "), 42);
    assert.equal(parseItemLineQtyInput("9999"), 9999);
    assert.equal(parseItemLineQtyInput("10000"), 9999);
  });

  it("returns null for empty, zero, or non-numeric", () => {
    assert.equal(parseItemLineQtyInput(""), null);
    assert.equal(parseItemLineQtyInput("0"), null);
    assert.equal(parseItemLineQtyInput("abc"), null);
    assert.equal(parseItemLineQtyInput("12a"), null);
  });
});
