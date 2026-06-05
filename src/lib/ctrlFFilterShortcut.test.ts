import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isCtrlOrCmdF,
  isFilterQuickSearchTarget,
  ITEM_FILTER_QUICK_INPUT_ID,
  shouldOpenAppFilterModal,
  shouldPreventNativeFind,
  shouldRefocusFilterQuickSearch,
  TASK_FILTER_QUICK_INPUT_ID,
  type CtrlFFilterShortcutContext,
} from "./ctrlFFilterShortcut.ts";

function baseCtx(overrides: Partial<CtrlFFilterShortcutContext> = {}): CtrlFFilterShortcutContext {
  return {
    wizardOpen: false,
    settingsOpen: false,
    hasConfig: true,
    hasCurrentAoa: true,
    isItemTableView: true,
    isTaskTableView: false,
    itemFilterModalOpen: false,
    taskFilterModalOpen: false,
    eventTarget: null,
    ...overrides,
  };
}

describe("isCtrlOrCmdF", () => {
  it("matches Ctrl+F and Cmd+F", () => {
    assert.equal(isCtrlOrCmdF({ ctrlKey: true, key: "f" }), true);
    assert.equal(isCtrlOrCmdF({ metaKey: true, key: "F" }), true);
    assert.equal(isCtrlOrCmdF({ ctrlKey: true, key: "g" }), false);
    assert.equal(isCtrlOrCmdF({ key: "f" }), false);
  });
});

describe("shouldPreventNativeFind", () => {
  it("always blocks native find in main window", () => {
    assert.equal(shouldPreventNativeFind(), true);
  });
});

describe("shouldOpenAppFilterModal", () => {
  it("opens on item table when ready", () => {
    assert.equal(shouldOpenAppFilterModal(baseCtx()), true);
  });

  it("does not open during wizard or without data", () => {
    assert.equal(shouldOpenAppFilterModal(baseCtx({ wizardOpen: true })), false);
    assert.equal(shouldOpenAppFilterModal(baseCtx({ hasCurrentAoa: false })), false);
  });

  it("does not open on add-exp style view", () => {
    assert.equal(
      shouldOpenAppFilterModal(baseCtx({ isItemTableView: false, isTaskTableView: false })),
      false,
    );
  });

  it("skips reopen when focus is already on filter quick input", () => {
    assert.equal(
      shouldOpenAppFilterModal(
        baseCtx({
          itemFilterModalOpen: true,
          eventTarget: { id: ITEM_FILTER_QUICK_INPUT_ID } as EventTarget,
        }),
      ),
      false,
    );
  });

  it("still opens when focus is on another control", () => {
    assert.equal(
      shouldOpenAppFilterModal(baseCtx({ eventTarget: { id: "gmt-account-id" } as EventTarget })),
      true,
    );
  });
});

describe("isFilterQuickSearchTarget", () => {
  it("recognizes quick search ids when modal open", () => {
    assert.equal(
      isFilterQuickSearchTarget({ id: TASK_FILTER_QUICK_INPUT_ID } as EventTarget, {
        itemFilterModalOpen: false,
        taskFilterModalOpen: true,
      }),
      true,
    );
  });
});

describe("shouldRefocusFilterQuickSearch", () => {
  it("refocuses when filter modal open but target is not quick input", () => {
    assert.equal(
      shouldRefocusFilterQuickSearch(
        baseCtx({ itemFilterModalOpen: true, eventTarget: { id: "other" } as EventTarget }),
      ),
      true,
    );
  });
});
