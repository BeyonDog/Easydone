import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CHEST_SOURCE_SHEET_HEADER,
  CHEST_TYPE_REMARK,
  ITEM_ID_HEADER,
  TYPE_REMARK_HEADER,
  buildChestCatalogFromSheets,
  normalizeIdCell,
} from "./xlsxHelpers.ts";
import { SIDEBAR_PINNED_CHEST, SIDEBAR_PINNED_DEFS, SIDEBAR_PINNED_ITEM } from "./sidebarCardRegistry.ts";
import { defaultSidebarCardOrder } from "./sidebarCardLayout.ts";
import type { AppConfig } from "../types.ts";

describe("buildChestCatalogFromSheets", () => {
  it("skips meta rows, stamps chest, merges Chest then Bundle with dedupe", () => {
    const chest = [
      ["礼包ID", "礼包类型"],
      ["C+B", "N/A"],
      ["key int", ""],
      ["ChestID", ""],
      ["说明", ""],
      [20200075, 1],
      [1200004, 2],
    ];
    const bundle = [
      ["礼包ID", "礼包类型"],
      ["C+B", ""],
      ["key int", ""],
      ["BundleID", ""],
      ["说明", ""],
      [1200004, 9],
      [1100004, 1],
    ];
    const aoa = buildChestCatalogFromSheets([
      { name: "Chest", aoa: chest },
      { name: "Bundle", aoa: bundle },
    ]);
    assert.ok(aoa);
    assert.deepEqual(aoa![0]!.slice(0, 3), [ITEM_ID_HEADER, TYPE_REMARK_HEADER, CHEST_SOURCE_SHEET_HEADER]);
    assert.equal(aoa!.length, 4);
    assert.equal(normalizeIdCell(aoa![1]![0]), "20200075");
    assert.equal(aoa![1]![1], CHEST_TYPE_REMARK);
    assert.equal(aoa![1]![2], "Chest");
    assert.equal(normalizeIdCell(aoa![2]![0]), "1200004");
    assert.equal(aoa![2]![2], "Chest");
    assert.equal(normalizeIdCell(aoa![3]![0]), "1100004");
    assert.equal(aoa![3]![2], "Bundle");
    assert.equal(
      aoa!.some((r) => String(r[0]).includes("C+B") || String(r[0]) === "ChestID"),
      false,
    );
  });

  it("returns null when no sheets", () => {
    assert.equal(buildChestCatalogFromSheets([]), null);
  });
});

describe("sidebar pinned chest card", () => {
  it("defines pinned:chest after item", () => {
    const ids = SIDEBAR_PINNED_DEFS.map((d) => d.id);
    assert.ok(ids.includes(SIDEBAR_PINNED_CHEST));
    assert.ok(ids.indexOf(SIDEBAR_PINNED_ITEM) < ids.indexOf(SIDEBAR_PINNED_CHEST));
    const order = defaultSidebarCardOrder({
      savedTemplates: [],
      sidebarTemplateOrder: null,
      sidebarCardOrder: null,
    } as AppConfig);
    assert.equal(order[0], SIDEBAR_PINNED_ITEM);
    assert.equal(order[1], SIDEBAR_PINNED_CHEST);
  });
});
