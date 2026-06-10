import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseTemplateCardDropDataset,
  resolveTemplateDragRows,
  shouldActivateRowTemplateDrag,
} from "./tableRowTemplateDrag.ts";

const ITEM_AOA = [
  ["物品ID", "名称"],
  ["meta", "x"],
  ["1500017", "头像"],
];

describe("resolveTemplateDragRows", () => {
  it("returns selected rows when any checked", () => {
    const selected = new Set([4, 5]);
    const out = resolveTemplateDragRows(selected, 2, ITEM_AOA, "item");
    assert.deepEqual(out, selected);
  });

  it("returns anchor row when nothing checked and row is selectable", () => {
    const out = resolveTemplateDragRows(new Set(), 1, ITEM_AOA, "item");
    assert.deepEqual(out, new Set([1]));
  });

  it("returns null for non-selectable anchor when nothing checked", () => {
    const out = resolveTemplateDragRows(new Set(), 0, ITEM_AOA, "item");
    assert.equal(out, null);
  });
});

describe("shouldActivateRowTemplateDrag", () => {
  it("activates when over template card past threshold", () => {
    assert.equal(shouldActivateRowTemplateDrag(0, 5, true), true);
  });

  it("does not activate over card below threshold", () => {
    assert.equal(shouldActivateRowTemplateDrag(0, 2, true), false);
  });

  it("activates on left-dominant drag toward sidebar", () => {
    assert.equal(shouldActivateRowTemplateDrag(-8, 2, false), true);
  });

  it("does not activate on right/down drag in table", () => {
    assert.equal(shouldActivateRowTemplateDrag(8, 2, false), false);
    assert.equal(shouldActivateRowTemplateDrag(2, 8, false), false);
  });
});

describe("parseTemplateCardDropDataset", () => {
  it("reads template id and source", () => {
    assert.deepEqual(
      parseTemplateCardDropDataset({ templateId: "tpl-1", templateSource: "item" }),
      { templateId: "tpl-1", source: "item" },
    );
  });

  it("returns null for invalid source", () => {
    assert.equal(parseTemplateCardDropDataset({ templateId: "tpl-1", templateSource: "x" }), null);
  });
});
