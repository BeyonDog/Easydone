import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultSidebarCardOrder } from "./sidebarCardLayout.ts";
import { SIDEBAR_PINNED_TASK, SIDEBAR_PINNED_TASK_ISSUES } from "./sidebarCardRegistry.ts";

describe("sidebar pinned card: 任务异常", () => {
  it("appears in default order immediately after 全部任务", () => {
    const config = {
      savedTemplates: [],
      sidebarTemplateOrder: null,
      sidebarCardOrder: null,
    } as any;
    const order = defaultSidebarCardOrder(config);
    assert.ok(order.includes(SIDEBAR_PINNED_TASK_ISSUES));
    assert.equal(order.indexOf(SIDEBAR_PINNED_TASK_ISSUES), order.indexOf(SIDEBAR_PINNED_TASK) + 1);
  });
});
