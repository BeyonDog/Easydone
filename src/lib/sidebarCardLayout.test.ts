import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AppConfig, SavedTemplate } from "../types.ts";
import {
  applySidebarCardOrder,
  defaultSidebarCardOrder,
  isSidebarCardHidden,
  removeSidebarCardFromLayout,
  resolveSidebarCardOrder,
  toggleSidebarCardHidden,
} from "./sidebarCardLayout.ts";
import {
  SIDEBAR_PINNED_ITEM,
  SIDEBAR_PINNED_TASK,
  templateSidebarCardId,
} from "./sidebarCardRegistry.ts";

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    excelWorkspaceRoot: "",
    gmAssistantLocalPath: "",
    itemRemarkColumn: null,
    hiddenItemColumns: [],
    hiddenTaskColumns: [],
    freezeThroughItemHeader: null,
    freezeThroughTaskHeader: null,
    itemTableFilter: null,
    taskTableFilter: null,
    savedSnapshots: [],
    sendTemplates: [],
    savedTemplates: [],
    themeAccentHex: "#000",
    themeBackgroundHex: "#111",
    themeWallpaperRelativePath: null,
    themeWallpaperOpacity: 0.5,
    initialItemFilterSheetShown: false,
    initialTaskFilterSheetShown: false,
    gmtPlatform: "overseas",
    gmtPreliveEnabled: false,
    gmtBaseUrl: "",
    gmtCookie: "",
    gmtCnCookie: "",
    gmtEnvId: null,
    gmtEnvName: null,
    gmtOverseasEnvId: null,
    gmtOverseasEnvName: null,
    gmtCnEnvId: null,
    gmtCnEnvName: null,
    gmtAccountId: "",
    gmtTradable: false,
    gmtLockRegion: "SG",
    gmtNotiRegion: "SG",
    gtopBaseUrl: "",
    gtopCookie: "",
    gtopProject: "GNG",
    gtopEnvId: null,
    gtopEnvName: null,
    gtopRegionServerId: null,
    gtopRegionServerName: null,
    ...overrides,
  };
}

function tpl(id: string, createdAt: number): SavedTemplate {
  return {
    id,
    title: `tpl-${id}`,
    createdAt,
    source: "item",
    aoa: [["物品ID"]],
    items: [],
  };
}

describe("resolveSidebarCardOrder", () => {
  it("uses default pinned order then templates when sidebarCardOrder is empty", () => {
    const config = baseConfig({
      savedTemplates: [tpl("a", 2), tpl("b", 1)],
      sidebarTemplateOrder: ["b", "a"],
    });
    const order = resolveSidebarCardOrder(config);
    assert.ok(order[0] === SIDEBAR_PINNED_ITEM);
    assert.ok(order.includes(templateSidebarCardId("b")));
    assert.ok(order.indexOf(templateSidebarCardId("b")) < order.indexOf(templateSidebarCardId("a")));
  });

  it("appends new pinned cards missing from saved order", () => {
    const config = baseConfig({
      sidebarCardOrder: [SIDEBAR_PINNED_ITEM, SIDEBAR_PINNED_TASK],
    });
    const order = resolveSidebarCardOrder(config);
    assert.ok(order.length >= 5);
    assert.equal(order[0], SIDEBAR_PINNED_ITEM);
  });

  it("drops deleted template ids from order", () => {
    const config = baseConfig({
      savedTemplates: [tpl("keep", 1)],
      sidebarCardOrder: [SIDEBAR_PINNED_ITEM, templateSidebarCardId("gone"), templateSidebarCardId("keep")],
    });
    const order = resolveSidebarCardOrder(config);
    assert.equal(order.includes(templateSidebarCardId("gone")), false);
    assert.equal(order.includes(templateSidebarCardId("keep")), true);
  });
});

describe("toggleSidebarCardHidden", () => {
  it("toggles hidden state", () => {
    const config = baseConfig();
    const next = toggleSidebarCardHidden(config, SIDEBAR_PINNED_ITEM);
    assert.equal(isSidebarCardHidden(next, SIDEBAR_PINNED_ITEM), true);
    const back = toggleSidebarCardHidden(next, SIDEBAR_PINNED_ITEM);
    assert.equal(isSidebarCardHidden(back, SIDEBAR_PINNED_ITEM), false);
  });
});

describe("applySidebarCardOrder", () => {
  it("syncs sidebarTemplateOrder from card order", () => {
    const config = baseConfig({
      savedTemplates: [tpl("x", 1), tpl("y", 2)],
    });
    const reordered = [
      templateSidebarCardId("y"),
      SIDEBAR_PINNED_ITEM,
      templateSidebarCardId("x"),
      ...defaultSidebarCardOrder(config).filter(
        (id) => id !== SIDEBAR_PINNED_ITEM && id !== templateSidebarCardId("x") && id !== templateSidebarCardId("y"),
      ),
    ];
    const next = applySidebarCardOrder(config, reordered);
    assert.deepEqual(next.sidebarTemplateOrder, ["y", "x"]);
  });
});

describe("removeSidebarCardFromLayout", () => {
  it("removes template id from order and hidden after template deleted", () => {
    const cardId = templateSidebarCardId("t1");
    const config = baseConfig({
      savedTemplates: [],
      sidebarCardHidden: [cardId],
      sidebarCardOrder: [SIDEBAR_PINNED_ITEM, cardId],
    });
    const next = removeSidebarCardFromLayout(config, cardId);
    assert.equal(next.sidebarCardOrder?.includes(cardId), false);
    assert.equal(next.sidebarCardHidden?.includes(cardId), false);
  });
});
