import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeItemTypeRemarkOptionKeys,
  rowPassesItemTableFilter,
  rowPassesTypeRemarkFilterKeys,
} from "./itemTableFilter.ts";
import { ITEM_TYPE_REMARK_PRESET_FITTING_ROOM } from "./xlsxHelpers.ts";
import type { ItemTableFilter } from "../types.ts";

const emptyFilter: ItemTableFilter = {
  typeRemarkKeys: [],
  qualityKeys: [],
  defenseNone: false,
  defenseRange: false,
  defenseMin: null,
  defenseMax: null,
  seasonItemOnly: false,
  customKeywordKeys: [],
};

describe("rowPassesTypeRemarkFilterKeys", () => {
  const trCol = 0;
  const remarkCol = 1;
  const typeCol = 2;
  const subCol = 3;

  it("matches weapon OR armor", () => {
    const keys = ["武器", "防具"];
    assert.equal(rowPassesTypeRemarkFilterKeys(["武器", ""], keys, trCol, remarkCol), true);
    assert.equal(rowPassesTypeRemarkFilterKeys(["防具", ""], keys, trCol, remarkCol), true);
    assert.equal(rowPassesTypeRemarkFilterKeys(["食材", ""], keys, trCol, remarkCol), false);
  });

  it("continues when trCol missing for non-Emote keys", () => {
    assert.equal(rowPassesTypeRemarkFilterKeys(["武器"], ["武器"], -1, remarkCol), false);
  });

  it("matches Emote on remark when trCol present", () => {
    assert.equal(rowPassesTypeRemarkFilterKeys(["x", "秀肌肉Emote"], ["Emote", "武器"], trCol, remarkCol), true);
  });

  it("matches fitting room skin preset by Type/SubType", () => {
    assert.equal(
      rowPassesTypeRemarkFilterKeys(
        ["空", "", 100, 1101000],
        [ITEM_TYPE_REMARK_PRESET_FITTING_ROOM],
        trCol,
        remarkCol,
        typeCol,
        subCol,
      ),
      true,
    );
    assert.equal(
      rowPassesTypeRemarkFilterKeys(
        ["武器", "", 1, 1101000],
        [ITEM_TYPE_REMARK_PRESET_FITTING_ROOM],
        trCol,
        remarkCol,
        typeCol,
        subCol,
      ),
      false,
    );
  });
});

describe("mergeItemTypeRemarkOptionKeys", () => {
  const base = ["武器", "防具", "Emote", "试衣间皮肤"];

  it("prepends presets when columns exist", () => {
    const keys = mergeItemTypeRemarkOptionKeys(base, { tr: 0, remark: 1, type: 2, sub: 3 });
    assert.deepEqual(keys.slice(0, 2), ["Emote", "试衣间皮肤"]);
    assert.ok(keys.includes("武器"));
    assert.equal(keys.filter((k) => k === "Emote").length, 1);
  });

  it("returns only fitting room preset when tr/remark missing", () => {
    assert.deepEqual(
      mergeItemTypeRemarkOptionKeys(base, { tr: -1, remark: -1, type: 2, sub: 3 }),
      ["试衣间皮肤"],
    );
  });
});

describe("rowPassesItemTableFilter", () => {
  const col = { tr: 0, def: -1, qual: -1, remark: -1, season: -1, type: 2, sub: 3 };

  it("OR within typeRemarkKeys", () => {
    const f: ItemTableFilter = { ...emptyFilter, typeRemarkKeys: ["武器", "防具"] };
    assert.equal(rowPassesItemTableFilter(["武器"], f, col), true);
    assert.equal(rowPassesItemTableFilter(["防具"], f, col), true);
    assert.equal(rowPassesItemTableFilter(["材料"], f, col), false);
  });

  it("AND within customKeywordKeys", () => {
    const f: ItemTableFilter = { ...emptyFilter, customKeywordKeys: ["猎人", "猎人试炼"] };
    assert.equal(rowPassesItemTableFilter(["猎人试炼任务"], f, col), true);
    assert.equal(rowPassesItemTableFilter(["猎人任务"], f, col), false);
    const f2: ItemTableFilter = { ...emptyFilter, customKeywordKeys: ["试", "战士"] };
    assert.equal(rowPassesItemTableFilter(["试炼之剑", "战士职业"], f2, col), true);
    assert.equal(rowPassesItemTableFilter(["试炼之剑"], f2, col), false);
    assert.equal(rowPassesItemTableFilter(["", "战士职业"], f2, col), false);
  });

  it("AND customKeyword with typeRemark", () => {
    const f: ItemTableFilter = { ...emptyFilter, customKeywordKeys: ["试"], typeRemarkKeys: ["武器"] };
    assert.equal(rowPassesItemTableFilter(["武器", "试炼"], f, col), true);
    assert.equal(rowPassesItemTableFilter(["防具", "试炼"], f, col), false);
  });

  it("filters season items when seasonItemOnly is set", () => {
    const seasonCol = { tr: -1, def: -1, qual: -1, remark: -1, season: 0, type: -1, sub: -1 };
    const f: ItemTableFilter = { ...emptyFilter, seasonItemOnly: true };
    assert.equal(rowPassesItemTableFilter([1], f, seasonCol), true);
    assert.equal(rowPassesItemTableFilter([0], f, seasonCol), false);
    assert.equal(rowPassesItemTableFilter([null], f, seasonCol), false);
  });

  it("AND seasonItemOnly with typeRemark", () => {
    const colBoth = { tr: 0, def: -1, qual: -1, remark: -1, season: 1, type: -1, sub: -1 };
    const f: ItemTableFilter = { ...emptyFilter, seasonItemOnly: true, typeRemarkKeys: ["武器"] };
    assert.equal(rowPassesItemTableFilter(["武器", 1], f, colBoth), true);
    assert.equal(rowPassesItemTableFilter(["武器", 0], f, colBoth), false);
    assert.equal(rowPassesItemTableFilter(["防具", 1], f, colBoth), false);
  });
});
