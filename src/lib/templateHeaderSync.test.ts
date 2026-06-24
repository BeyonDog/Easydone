import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SavedTemplate } from "../types.ts";
import {
  expandLegacyItemTemplateAoa,
  headersCompatibleForAppend,
  isLegacySyntheticItemHeader,
  realignAoaToMasterHeader,
  syncSavedTemplatesToMasterSheets,
} from "./templateHeaderSync.ts";

function itemTpl(aoa: unknown[][], items: SavedTemplate["items"] = []): SavedTemplate {
  return {
    id: "t1",
    title: "test",
    createdAt: 1,
    source: "item",
    aoa,
    items,
  };
}

function taskTpl(aoa: unknown[][]): SavedTemplate {
  return {
    id: "t2",
    title: "task",
    createdAt: 1,
    source: "task",
    aoa,
    items: [],
  };
}

describe("headersCompatibleForAppend", () => {
  it("matches identical headers", () => {
    assert.equal(headersCompatibleForAppend(["物品ID", "备注"], ["物品ID", "备注"]), true);
  });

  it("rejects different length", () => {
    assert.equal(headersCompatibleForAppend(["物品ID"], ["物品ID", "备注"]), false);
  });
});

describe("isLegacySyntheticItemHeader", () => {
  it("detects legacy 3-column header", () => {
    assert.equal(isLegacySyntheticItemHeader(["物品ID", "名称/备注", "数量"]), true);
    assert.equal(isLegacySyntheticItemHeader(["物品ID", "备注"]), false);
  });
});

describe("realignAoaToMasterHeader", () => {
  const master = [["物品ID", "备注", "新列"]];

  it("returns null when already compatible", () => {
    const old = [
      ["物品ID", "备注", "新列"],
      ["1", "a", "x"],
    ];
    assert.equal(realignAoaToMasterHeader(old, master[0]!, "item"), null);
  });

  it("adds new columns with empty cells", () => {
    const old = [
      ["物品ID", "备注"],
      ["1", "a"],
    ];
    const next = realignAoaToMasterHeader(old, master[0]!, "item");
    assert.deepEqual(next, [
      ["物品ID", "备注", "新列"],
      ["1", "a", ""],
    ]);
  });

  it("preserves values when column order changes", () => {
    const old = [
      ["物品ID", "备注", "新列"],
      ["1", "a", "x"],
    ];
    const reordered = ["备注", "新列", "物品ID"];
    const next = realignAoaToMasterHeader(old, reordered, "item");
    assert.deepEqual(next, [["备注", "新列", "物品ID"], ["a", "x", "1"]]);
  });

  it("returns null when master lacks item id column", () => {
    const old = [
      ["物品ID", "备注"],
      ["1", "a"],
    ];
    assert.equal(realignAoaToMasterHeader(old, ["备注"], "item"), null);
  });
});

describe("expandLegacyItemTemplateAoa", () => {
  const itemAoa = [
    ["物品ID", "物品备注", "品质"],
    ["100", "主表物品", "6"],
    ["200", "另一件", "5"],
  ];

  it("pulls full row from master when item id exists", () => {
    const tpl = itemTpl(
      [["物品ID", "名称/备注", "数量"]],
      [{ itemId: "100", qty: 2, label: "旧备注" }],
    );
    const next = expandLegacyItemTemplateAoa(tpl, itemAoa, null);
    assert.deepEqual(next, [
      ["物品ID", "物品备注", "品质"],
      ["100", "主表物品", "6"],
    ]);
  });

  it("fills sparse row when item id missing in master", () => {
    const tpl = itemTpl(
      [["物品ID", "名称/备注", "数量"]],
      [{ itemId: "999", qty: 1, label: "仅模板" }],
    );
    const next = expandLegacyItemTemplateAoa(tpl, itemAoa, null);
    assert.deepEqual(next, [
      ["物品ID", "物品备注", "品质"],
      ["999", "仅模板", ""],
    ]);
  });
});

describe("syncSavedTemplatesToMasterSheets", () => {
  it("does not change templates when headers already match", () => {
    const masterItem = [
      ["物品ID", "备注"],
      ["1", "a"],
    ];
    const templates = [
      itemTpl([
        ["物品ID", "备注"],
        ["2", "b"],
      ]),
    ];
    const r = syncSavedTemplatesToMasterSheets({
      templates,
      itemAoa: masterItem,
      taskAoa: null,
      itemRemarkColumn: null,
    });
    assert.equal(r.changedIds.length, 0);
    assert.deepEqual(r.templates[0]!.aoa, templates[0]!.aoa);
  });

  it("syncs task template when master gains a column", () => {
    const masterTask = [
      ["任务ID", "名称", "类型"],
      ["1", "t", "main"],
    ];
    const templates = [
      taskTpl([
        ["任务ID", "名称"],
        ["9", "old"],
      ]),
    ];
    const r = syncSavedTemplatesToMasterSheets({
      templates,
      itemAoa: null,
      taskAoa: masterTask,
      itemRemarkColumn: null,
    });
    assert.deepEqual(r.changedIds, ["t2"]);
    assert.deepEqual(r.templates[0]!.aoa, [
      ["任务ID", "名称", "类型"],
      ["9", "old", ""],
    ]);
  });

  it("upgrades legacy item template via master lookup", () => {
    const masterItem = [
      ["物品ID", "物品备注"],
      ["50", "from-sheet"],
    ];
    const templates = [
      itemTpl([["物品ID", "名称/备注", "数量"]], [{ itemId: "50", qty: 3, label: "x" }]),
    ];
    const r = syncSavedTemplatesToMasterSheets({
      templates,
      itemAoa: masterItem,
      taskAoa: null,
      itemRemarkColumn: null,
    });
    assert.deepEqual(r.changedIds, ["t1"]);
    assert.deepEqual(r.templates[0]!.aoa, [
      ["物品ID", "物品备注"],
      ["50", "from-sheet"],
    ]);
    assert.deepEqual(r.templates[0]!.items, [{ itemId: "50", qty: 3, label: "x" }]);
  });
});
