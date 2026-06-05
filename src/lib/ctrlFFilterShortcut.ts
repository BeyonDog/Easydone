export const ITEM_FILTER_QUICK_INPUT_ID = "item-filter-quick";
export const TASK_FILTER_QUICK_INPUT_ID = "task-filter-quick";

export type CtrlFFilterShortcutContext = {
  wizardOpen: boolean;
  settingsOpen: boolean;
  hasConfig: boolean;
  hasCurrentAoa: boolean;
  isItemTableView: boolean;
  isTaskTableView: boolean;
  itemFilterModalOpen: boolean;
  taskFilterModalOpen: boolean;
  eventTarget: EventTarget | null;
};

export function isCtrlOrCmdF(e: { ctrlKey?: boolean; metaKey?: boolean; key?: string }): boolean {
  return Boolean((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "f");
}

/** 主窗口内 Ctrl/Cmd+F 一律拦截，避免 WebView 页面内查找 */
export function shouldPreventNativeFind(): boolean {
  return true;
}

function targetElementId(target: EventTarget | null): string | null {
  if (!target || typeof target !== "object" || !("id" in target)) return null;
  const id = (target as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}

export function isFilterQuickSearchTarget(
  target: EventTarget | null,
  opts: { itemFilterModalOpen: boolean; taskFilterModalOpen: boolean },
): boolean {
  const id = targetElementId(target);
  if (!id) return false;
  if (opts.itemFilterModalOpen && id === ITEM_FILTER_QUICK_INPUT_ID) return true;
  if (opts.taskFilterModalOpen && id === TASK_FILTER_QUICK_INPUT_ID) return true;
  return false;
}

export function shouldOpenAppFilterModal(ctx: CtrlFFilterShortcutContext): boolean {
  if (ctx.wizardOpen || ctx.settingsOpen || !ctx.hasConfig || !ctx.hasCurrentAoa) return false;
  if (!ctx.isItemTableView && !ctx.isTaskTableView) return false;
  if (ctx.isItemTableView && ctx.itemFilterModalOpen) return false;
  if (ctx.isTaskTableView && ctx.taskFilterModalOpen) return false;
  if (
    isFilterQuickSearchTarget(ctx.eventTarget, {
      itemFilterModalOpen: ctx.itemFilterModalOpen,
      taskFilterModalOpen: ctx.taskFilterModalOpen,
    })
  ) {
    return false;
  }
  return true;
}

export function shouldRefocusFilterQuickSearch(ctx: CtrlFFilterShortcutContext): boolean {
  if (!shouldPreventNativeFind()) return false;
  if (shouldOpenAppFilterModal(ctx)) return false;
  if (ctx.isItemTableView && ctx.itemFilterModalOpen) return true;
  if (ctx.isTaskTableView && ctx.taskFilterModalOpen) return true;
  return false;
}
