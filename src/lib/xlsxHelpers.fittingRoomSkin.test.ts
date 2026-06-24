import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ITEM_SUBTYPE_ARMOR_SKIN,
  ITEM_TYPE_ARMOR_SKIN,
  ITEM_TYPE_WEAPON_SKIN,
  rowMatchesFittingRoomSkinPreset,
} from "./xlsxHelpers.ts";

describe("rowMatchesFittingRoomSkinPreset", () => {
  const typeCol = 0;
  const subCol = 1;

  it("matches weapon skin Type 100", () => {
    assert.equal(rowMatchesFittingRoomSkinPreset([ITEM_TYPE_WEAPON_SKIN, 1101000], typeCol, subCol), true);
  });

  it("matches armor skin Type 200", () => {
    assert.equal(rowMatchesFittingRoomSkinPreset([ITEM_TYPE_ARMOR_SKIN, 2000000], typeCol, subCol), true);
  });

  it("matches armor SubType 2000000", () => {
    assert.equal(rowMatchesFittingRoomSkinPreset([2, ITEM_SUBTYPE_ARMOR_SKIN], typeCol, subCol), true);
  });

  it("rejects normal weapon and armor", () => {
    assert.equal(rowMatchesFittingRoomSkinPreset([1, 1101000], typeCol, subCol), false);
    assert.equal(rowMatchesFittingRoomSkinPreset([2, 2101000], typeCol, subCol), false);
  });

  it("works when only one column is available", () => {
    assert.equal(rowMatchesFittingRoomSkinPreset([ITEM_TYPE_WEAPON_SKIN], typeCol, -1), true);
    assert.equal(rowMatchesFittingRoomSkinPreset([40, ITEM_SUBTYPE_ARMOR_SKIN], -1, subCol), true);
  });
});
