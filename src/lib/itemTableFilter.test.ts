import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rowPassesItemTableFilter, rowPassesTypeRemarkFilterKeys } from "./itemTableFilter.ts";
import type { ItemTableFilter } from "../types.ts";

const emptyFilter: ItemTableFilter = {
  typeRemarkKeys: [],
  qualityKeys: [],
  defenseNone: false,
  defenseRange: false,
  defenseMin: null,
  defenseMax: null,
  customKeywordKeys: [],
};

describe("rowPassesTypeRemarkFilterKeys", () => {
  const trCol = 0;
  const remarkCol = 1;

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
});

describe("rowPassesItemTableFilter", () => {
  const col = { tr: 0, def: -1, qual: -1, remark: -1 };

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
});
