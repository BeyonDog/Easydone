import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SavedTemplate } from "../types.ts";
import {
  collectTemplateRowIds,
  dedupeAllSavedTemplates,
  dedupeTemplateAoa,
  parseTemplateRowIdFromDataRow,
  partitionRowsForTemplateAppend,
} from "./templateAppend.ts";

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

describe("parseTemplateRowIdFromDataRow", () => {
  const itemHeader = ["物品ID", "备注"];
  const taskHeader = ["任务ID", "名称"];

  it("parses numeric item id", () => {
    assert.equal(parseTemplateRowIdFromDataRow(itemHeader, ["100", "a"], "item"), "100");
  });

  it("parses task id", () => {
    assert.equal(parseTemplateRowIdFromDataRow(taskHeader, ["42", "t"], "task"), "42");
  });

  it("returns null for empty id", () => {
    assert.equal(parseTemplateRowIdFromDataRow(itemHeader, ["", "a"], "item"), null);
  });
});

describe("collectTemplateRowIds", () => {
  it("collects unique ids from template aoa", () => {
    const aoa = [
      ["物品ID", "备注"],
      ["1", "a"],
      ["2", "b"],
    ];
    const ids = collectTemplateRowIds(aoa, "item");
    assert.deepEqual([...ids].sort(), ["1", "2"]);
  });
});

describe("partitionRowsForTemplateAppend", () => {
  const templateAoa = [
    ["物品ID", "备注"],
    ["1", "existing"],
  ];

  it("partitions new vs duplicate rows", () => {
    const r = partitionRowsForTemplateAppend({
      templateAoa,
      source: "item",
      candidateIdxs: [0, 1, 2],
      candidateDataRows: [
        ["1", "dup"],
        ["2", "new"],
        ["3", "also-new"],
      ],
    });
    assert.deepEqual(r.appendIdxs, [1, 2]);
    assert.deepEqual(r.appendDataRows, [
      ["2", "new"],
      ["3", "also-new"],
    ]);
    assert.deepEqual(r.skippedIdxs, [0]);
    assert.equal(r.skippedCount, 1);
  });

  it("skips duplicates within candidate selection", () => {
    const r = partitionRowsForTemplateAppend({
      templateAoa,
      source: "item",
      candidateIdxs: [0, 1],
      candidateDataRows: [
        ["5", "first"],
        ["5", "second"],
      ],
    });
    assert.deepEqual(r.appendIdxs, [0]);
    assert.equal(r.skippedCount, 1);
  });

  it("returns all skipped when every row already exists", () => {
    const r = partitionRowsForTemplateAppend({
      templateAoa,
      source: "item",
      candidateIdxs: [0],
      candidateDataRows: [["1", "dup"]],
    });
    assert.deepEqual(r.appendIdxs, []);
    assert.equal(r.skippedCount, 1);
  });
});

describe("dedupeTemplateAoa", () => {
  it("keeps first row per item id and rebuilds items", () => {
    const tpl = itemTpl(
      [
        ["物品ID", "物品备注"],
        ["100", "first"],
        ["200", "b"],
        ["100", "dup"],
      ],
      [{ itemId: "100", qty: 1 }, { itemId: "200", qty: 1 }, { itemId: "100", qty: 1 }],
    );
    const { tpl: next, removedCount } = dedupeTemplateAoa(tpl, "物品备注");
    assert.equal(removedCount, 1);
    assert.deepEqual(next.aoa, [
      ["物品ID", "物品备注"],
      ["100", "first"],
      ["200", "b"],
    ]);
    assert.deepEqual(next.items, [
      { itemId: "100", qty: 1, label: "first" },
      { itemId: "200", qty: 1, label: "b" },
    ]);
  });

  it("dedupes task templates by task id", () => {
    const tpl = taskTpl([
      ["任务ID", "名称"],
      ["9", "a"],
      ["9", "dup"],
      ["10", "b"],
    ]);
    const { tpl: next, removedCount } = dedupeTemplateAoa(tpl, null);
    assert.equal(removedCount, 1);
    assert.deepEqual(next.aoa, [
      ["任务ID", "名称"],
      ["9", "a"],
      ["10", "b"],
    ]);
  });

  it("returns unchanged when no duplicates", () => {
    const tpl = itemTpl([
      ["物品ID", "备注"],
      ["1", "a"],
      ["2", "b"],
    ]);
    const { tpl: next, removedCount } = dedupeTemplateAoa(tpl, null);
    assert.equal(removedCount, 0);
    assert.deepEqual(next.aoa, tpl.aoa);
  });
});

describe("dedupeAllSavedTemplates", () => {
  it("returns changedIds for templates that had duplicates removed", () => {
    const templates = [
      itemTpl([
        ["物品ID", "备注"],
        ["1", "a"],
        ["1", "dup"],
      ]),
      taskTpl([
        ["任务ID", "名称"],
        ["5", "x"],
      ]),
    ];
    const r = dedupeAllSavedTemplates(templates, null);
    assert.deepEqual(r.changedIds, ["t1"]);
    assert.equal(r.templates[0]!.aoa.length, 2);
    assert.equal(r.templates[1]!.aoa.length, 2);
  });
});
