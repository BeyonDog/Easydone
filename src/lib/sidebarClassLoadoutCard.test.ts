import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultSidebarCardOrder } from "./sidebarCardLayout.ts";
import { SIDEBAR_PINNED_ADD_EXP, SIDEBAR_PINNED_UPLOAD_CONFIG } from "./sidebarCardRegistry.ts";

describe("sidebar pinned card: 职业出装", () => {
  it("appears in default order between addExp and uploadConfig", () => {
    const pinnedId = "pinned:classLoadout";
    const config = {
      savedTemplates: [],
      sidebarTemplateOrder: null,
      sidebarCardOrder: null,
    } as any;
    const order = defaultSidebarCardOrder(config);

    assert.ok(order.includes(pinnedId), "pinned card id included");
    assert.ok(order.indexOf(SIDEBAR_PINNED_ADD_EXP) < order.indexOf(pinnedId), "after addExp");
    assert.ok(order.indexOf(pinnedId) < order.indexOf(SIDEBAR_PINNED_UPLOAD_CONFIG), "before uploadConfig");
  });
});

