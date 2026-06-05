import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADD_MONEY_MAX_GOLD_QTY,
  ADD_MONEY_WAN_MULTIPLIER,
  resolveGoldSendQty,
} from "./addExpMoney.ts";

describe("resolveGoldSendQty", () => {
  it("parses plain positive integer", () => {
    const r = resolveGoldSendQty("100", false);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.qty, 100);
  });

  it("multiplies by 万 when checked", () => {
    const r = resolveGoldSendQty("100", true);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.qty, 100 * ADD_MONEY_WAN_MULTIPLIER);
  });

  it("rejects empty and non-numeric", () => {
    assert.equal(resolveGoldSendQty("", false).ok, false);
    assert.equal(resolveGoldSendQty("12a", false).ok, false);
    assert.equal(resolveGoldSendQty("0", false).ok, false);
  });

  it("rejects over max without 万", () => {
    const over = String(ADD_MONEY_MAX_GOLD_QTY + 1);
    assert.equal(resolveGoldSendQty(over, false).ok, false);
  });

  it("rejects 万 overflow", () => {
    const base = Math.floor(ADD_MONEY_MAX_GOLD_QTY / ADD_MONEY_WAN_MULTIPLIER) + 1;
    assert.equal(resolveGoldSendQty(String(base), true).ok, false);
  });
});
