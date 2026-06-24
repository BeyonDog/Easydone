import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampItemDurability,
  clampItemWearValue,
  displayRowDurabilityValue,
  displayRowWearValue,
  enrichSendItemsFromItemSheet,
  hydrateItemValuesFromTemplateItems,
  parseSendItemMergeKey,
  resolveRowDurabilityValue,
  resolveRowWearValue,
  rowInitDurabilityMax,
  rowSupportsDurabilityValue,
  rowSupportsWearValue,
  sendItemMergeKey,
} from "./itemWearValue.ts";

describe("rowSupportsWearValue", () => {
  it("detects Type 1 weapon and Type 2 armor", () => {
    assert.equal(rowSupportsWearValue([1], 0, -1), true);
    assert.equal(rowSupportsWearValue([2], 0, -1), true);
    assert.equal(rowSupportsWearValue([40], 0, -1), false);
  });

  it("falls back to type remark 武器/防具", () => {
    assert.equal(rowSupportsWearValue(["武器"], -1, 0), true);
    assert.equal(rowSupportsWearValue(["防具"], -1, 0), true);
    assert.equal(rowSupportsWearValue(["食材"], -1, 0), false);
  });
});

describe("rowSupportsDurabilityValue", () => {
  it("detects keys and bandages with init durability", () => {
    assert.equal(rowSupportsDurabilityValue([5, 12], 0, -1, 1), true);
    assert.equal(rowSupportsDurabilityValue(["钥匙", 12], -1, 0, 1), true);
    assert.equal(rowSupportsDurabilityValue([4, 130], 0, -1, 1), true);
    assert.equal(rowSupportsDurabilityValue([4, 0], 0, -1, 1), false);
    assert.equal(rowSupportsDurabilityValue([40], 0, -1, 1), false);
  });
});

describe("resolveRowWearValue", () => {
  const row = [1];
  const override = new Set([5]);

  it("uses default when row not overridden", () => {
    assert.equal(resolveRowWearValue(3, row, 0, -1, {}, new Set(), 50), 50);
  });

  it("uses row override when set", () => {
    assert.equal(resolveRowWearValue(5, row, 0, -1, { 5: 20 }, override, 50), 20);
  });

  it("returns undefined for non-wearable rows", () => {
    assert.equal(resolveRowWearValue(3, [40], 0, -1, {}, new Set(), 50), undefined);
  });
});

describe("resolveRowDurabilityValue", () => {
  const keyRow = [5, 12];

  it("defaults to init durability max when not overridden", () => {
    assert.equal(resolveRowDurabilityValue(0, keyRow, 0, -1, 1, {}, new Set()), 12);
  });

  it("uses row override when set", () => {
    assert.equal(
      resolveRowDurabilityValue(0, keyRow, 0, -1, 1, { 0: 5 }, new Set([0])),
      5,
    );
  });
});

describe("displayRowWearValue", () => {
  it("mirrors resolve display semantics", () => {
    assert.equal(displayRowWearValue(1, { 1: 33 }, new Set([1]), 100), 33);
    assert.equal(displayRowWearValue(2, {}, new Set(), 80), 80);
  });
});

describe("displayRowDurabilityValue", () => {
  it("shows max when not overridden", () => {
    assert.equal(displayRowDurabilityValue(0, [5, 12], 1, {}, new Set()), 12);
  });
});

describe("clampItemWearValue", () => {
  it("clamps to 0-100", () => {
    assert.equal(clampItemWearValue(-5), 0);
    assert.equal(clampItemWearValue(150), 100);
    assert.equal(clampItemWearValue(42.9), 42);
  });
});

describe("clampItemDurability", () => {
  it("clamps to 0-max", () => {
    assert.equal(clampItemDurability(-1, 12), 0);
    assert.equal(clampItemDurability(99, 12), 12);
    assert.equal(clampItemDurability(7, 12), 7);
  });
});

describe("rowInitDurabilityMax", () => {
  it("reads init durability column", () => {
    assert.equal(rowInitDurabilityMax([5, 12], 1), 12);
    assert.equal(rowInitDurabilityMax([5, ""], 1), 0);
  });
});

describe("enrichSendItemsFromItemSheet", () => {
  const aoa = [
    ["物品ID", "Type", "类型备注", "初始耐久"],
    ["101011", 1, "武器", 0],
    ["510015", 5, "钥匙", 12],
    ["821027", 40, "消耗品", 0],
  ];

  it("adds default wear for weapon items missing wearValue", () => {
    const out = enrichSendItemsFromItemSheet([{ itemId: "101011", qty: 1 }], aoa, 75);
    assert.equal(out[0]!.wearValue, 75);
  });

  it("adds init durability for keys missing durabilityValue", () => {
    const out = enrichSendItemsFromItemSheet([{ itemId: "510015", qty: 1 }], aoa, 100);
    assert.equal(out[0]!.durabilityValue, 12);
    assert.equal(out[0]!.wearValue, undefined);
  });

  it("leaves consumables and existing values unchanged", () => {
    const out = enrichSendItemsFromItemSheet(
      [
        { itemId: "821027", qty: 2 },
        { itemId: "101011", qty: 1, wearValue: 33 },
        { itemId: "510015", qty: 1, durabilityValue: 6 },
      ],
      aoa,
      100,
    );
    assert.equal(out[0]!.wearValue, undefined);
    assert.equal(out[0]!.durabilityValue, undefined);
    assert.equal(out[1]!.wearValue, 33);
    assert.equal(out[2]!.durabilityValue, 6);
  });
});

describe("hydrateItemValuesFromTemplateItems", () => {
  const aoa = [
    ["物品ID", "Type", "类型备注", "初始耐久"],
    ["101011", 1, "武器", 0],
    ["510015", 5, "钥匙", 12],
  ];

  it("hydrates saved wear and durability into row maps", () => {
    const h = hydrateItemValuesFromTemplateItems(aoa, [
      { itemId: "101011", qty: 1, wearValue: 42 },
      { itemId: "510015", qty: 1, durabilityValue: 8 },
    ]);
    assert.equal(h.itemLineWear[0], 42);
    assert.ok(h.wearRowOverride.has(0));
    assert.equal(h.itemLineDurability[1], 8);
    assert.ok(h.durabilityRowOverride.has(1));
  });
});

describe("sendItemMergeKey", () => {
  it("distinguishes wear and durability keys", () => {
    assert.equal(sendItemMergeKey("510015", undefined, 12), "510015\0d:12");
    assert.equal(sendItemMergeKey("101011", 37), "101011\0w:37");
    const parsed = parseSendItemMergeKey("510015\0d:12");
    assert.equal(parsed.itemId, "510015");
    assert.equal(parsed.durabilityValue, 12);
  });
});
