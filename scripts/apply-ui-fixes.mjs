/**
 * One-shot UTF-8 patches for App.tsx (avoid editor encoding corruption).
 * Run: node scripts/apply-ui-fixes.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/App.tsx");
let s = fs.readFileSync(appPath, "utf8");

function mustReplace(old, neu, label) {
  if (!s.includes(old)) {
    console.error(`MISSING [${label}]:`, old.slice(0, 80));
    process.exit(1);
  }
  s = s.split(old).join(neu);
}

mustReplace(
  `  rowMatchesEmotePreset,
  typeRemarkFilterKey,`,
  `  rowMatchesEmotePreset,
  rowMatchesKeyword,
  typeRemarkFilterKey,`,
  "import rowMatchesKeyword",
);

mustReplace(
  `function emptyItemTableFilter(): ItemTableFilter {
  return {
    typeRemarkKeys: [],
    qualityKeys: [],
    defenseNone: false,
    defenseRange: false,
    defenseMin: null,
    defenseMax: null,
  };
}`,
  `function emptyItemTableFilter(): ItemTableFilter {
  return {
    typeRemarkKeys: [],
    qualityKeys: [],
    defenseNone: false,
    defenseRange: false,
    defenseMin: null,
    defenseMax: null,
    rowKeyword: null,
  };
}`,
  "emptyItemTableFilter",
);

mustReplace(
  `    sectionOrder: normalizeItemSectionOrderFromDisk((o as ItemTableFilter).sectionOrder),
  };
  if (itemTableFilterIsInactive(f) && !hasCustomItemKeyOrder(f)) return null;`,
  `    sectionOrder: normalizeItemSectionOrderFromDisk((o as ItemTableFilter).sectionOrder),
    rowKeyword: typeof o.rowKeyword === "string" && o.rowKeyword.trim() ? o.rowKeyword.trim() : null,
  };
  if (itemTableFilterIsInactive(f) && !hasCustomItemKeyOrder(f)) return null;`,
  "normalizeItemTableFilter",
);

mustReplace(
  `    defenseMin: null,
    defenseMax: null,
  };
}

function cloneItemTableFilter`,
  `    defenseMin: null,
    defenseMax: null,
    rowKeyword: null,
  };
}

function cloneItemTableFilter`,
  "clearItemFilterSelections",
);

mustReplace(
  `    sectionOrder: f.sectionOrder?.length ? [...f.sectionOrder] : null,
  };
}

function itemTableFilterIsInactive(f: ItemTableFilter | null): boolean {
  if (f == null) return true;
  return (
    f.typeRemarkKeys.length === 0 &&
    f.qualityKeys.length === 0 &&
    !f.defenseNone &&
    !f.defenseRange
  );
}`,
  `    sectionOrder: f.sectionOrder?.length ? [...f.sectionOrder] : null,
    rowKeyword: f.rowKeyword?.trim() ? f.rowKeyword.trim() : null,
  };
}

function itemTableFilterIsInactive(f: ItemTableFilter | null): boolean {
  if (f == null) return true;
  return (
    f.typeRemarkKeys.length === 0 &&
    f.qualityKeys.length === 0 &&
    !f.defenseNone &&
    !f.defenseRange &&
    !(f.rowKeyword?.trim())
  );
}`,
  "itemTableFilterIsInactive",
);

mustReplace(
  `function rowPassesItemTableFilter(
  row: unknown[],
  f: ItemTableFilter,
  col: { tr: number; def: number; qual: number },
): boolean {
  if (col.tr >= 0 && f.typeRemarkKeys.length > 0) {`,
  `function rowPassesItemTableFilter(
  row: unknown[],
  f: ItemTableFilter,
  col: { tr: number; def: number; qual: number },
): boolean {
  if (f.rowKeyword?.trim() && !rowMatchesKeyword(row, f.rowKeyword)) return false;
  if (col.tr >= 0 && f.typeRemarkKeys.length > 0) {`,
  "rowPassesItemTableFilter",
);

mustReplace(
  `function emptyTaskTableFilter(): TaskTableFilter {
  return { taskTypeKeys: [], chainKeys: [] };
}`,
  `function emptyTaskTableFilter(): TaskTableFilter {
  return { taskTypeKeys: [], chainKeys: [], rowKeyword: null };
}`,
  "emptyTaskTableFilter",
);

mustReplace(
  `    sectionOrder: normalizeTaskSectionOrderFromDisk((o as TaskTableFilter).sectionOrder),
  };
  if (f.taskTypeKeys.length === 0 && f.chainKeys.length === 0 && !hasCustomTaskKeyOrder(f)) return null;`,
  `    sectionOrder: normalizeTaskSectionOrderFromDisk((o as TaskTableFilter).sectionOrder),
    rowKeyword: typeof o.rowKeyword === "string" && o.rowKeyword.trim() ? o.rowKeyword.trim() : null,
  };
  if (taskTableFilterIsInactive(f) && !hasCustomTaskKeyOrder(f)) return null;`,
  "normalizeTaskTableFilter",
);

mustReplace(
  `function clearTaskFilterSelectionsKeepOrder(d: TaskTableFilter): TaskTableFilter {
  return { ...d, taskTypeKeys: [], chainKeys: [] };
}

function taskTableFilterIsInactive(f: TaskTableFilter | null): boolean {
  if (f == null) return true;
  return f.taskTypeKeys.length === 0 && f.chainKeys.length === 0;
}

function rowPassesTaskTableFilter(row: unknown[], f: TaskTableFilter, col: { tt: number; ch: number }): boolean {
  if (col.tt >= 0 && f.taskTypeKeys.length > 0) {`,
  `function clearTaskFilterSelectionsKeepOrder(d: TaskTableFilter): TaskTableFilter {
  return { ...d, taskTypeKeys: [], chainKeys: [], rowKeyword: null };
}

function taskTableFilterIsInactive(f: TaskTableFilter | null): boolean {
  if (f == null) return true;
  return f.taskTypeKeys.length === 0 && f.chainKeys.length === 0 && !(f.rowKeyword?.trim());
}

function rowPassesTaskTableFilter(row: unknown[], f: TaskTableFilter, col: { tt: number; ch: number }): boolean {
  if (f.rowKeyword?.trim() && !rowMatchesKeyword(row, f.rowKeyword)) return false;
  if (col.tt >= 0 && f.taskTypeKeys.length > 0) {`,
  "taskTableFilter",
);

mustReplace(
  `    sectionOrder: f.sectionOrder?.length ? [...f.sectionOrder] : null,
  };
}

function clearTaskFilterSelectionsKeepOrder`,
  `    sectionOrder: f.sectionOrder?.length ? [...f.sectionOrder] : null,
    rowKeyword: f.rowKeyword?.trim() ? f.rowKeyword.trim() : null,
  };
}

function clearTaskFilterSelectionsKeepOrder`,
  "cloneTaskTableFilter rowKeyword",
);

mustReplace(
  `  const filteredBodyRows = useMemo(() => {
    if (isItemTableView) {
      if (itemTableFilterIsInactive(config?.itemTableFilter ?? null)) return baseBodyRows;
      const f = config!.itemTableFilter!;
      return baseBodyRows.filter(({ row }) => rowPassesItemTableFilter(row, f, itemFilterColIdx));
    }
    if (taskTableFilterIsInactive(config?.taskTableFilter ?? null)) return baseBodyRows;
    const tf = config!.taskTableFilter!;
    return baseBodyRows.filter(({ row }) => rowPassesTaskTableFilter(row, tf, taskFilterColIdx));
  }, [baseBodyRows, isItemTableView, config?.itemTableFilter, config?.taskTableFilter, itemFilterColIdx, taskFilterColIdx]);`,
  `  const activeItemTableFilter = useMemo(() => {
    if (!isItemTableView) return null;
    if (itemFilterModalOpen) return itemFilterDraft;
    return config?.itemTableFilter ?? null;
  }, [isItemTableView, itemFilterModalOpen, itemFilterDraft, config?.itemTableFilter]);

  const activeTaskTableFilter = useMemo(() => {
    if (!isTaskTableView) return null;
    if (taskFilterModalOpen) return taskFilterDraft;
    return config?.taskTableFilter ?? null;
  }, [isTaskTableView, taskFilterModalOpen, taskFilterDraft, config?.taskTableFilter]);

  const filteredBodyRows = useMemo(() => {
    if (isItemTableView) {
      if (itemTableFilterIsInactive(activeItemTableFilter)) return baseBodyRows;
      const f = activeItemTableFilter!;
      return baseBodyRows.filter(({ row }) => rowPassesItemTableFilter(row, f, itemFilterColIdx));
    }
    if (taskTableFilterIsInactive(activeTaskTableFilter)) return baseBodyRows;
    const tf = activeTaskTableFilter!;
    return baseBodyRows.filter(({ row }) => rowPassesTaskTableFilter(row, tf, taskFilterColIdx));
  }, [
    baseBodyRows,
    isItemTableView,
    isTaskTableView,
    activeItemTableFilter,
    activeTaskTableFilter,
    itemFilterColIdx,
    taskFilterColIdx,
  ]);`,
  "filteredBodyRows",
);

mustReplace(
  `  const openTableFilterModal = useCallback(() => {
    if (!config) return;
    if (isItemTableView) {
      setItemFilterDraft(cloneItemTableFilter(config.itemTableFilter));
      setItemFilterModalOpen(true);
    } else {
      setTaskFilterDraft(cloneTaskTableFilter(config.taskTableFilter));
      setTaskFilterModalOpen(true);
    }
  }, [config, isItemTableView]);`,
  `  const openTableFilterModal = useCallback(() => {
    if (!config) return;
    if (isItemTableView) {
      setItemFilterDraft(cloneItemTableFilter(config.itemTableFilter));
      setItemFilterQuickQuery(config.itemTableFilter?.rowKeyword?.trim() ?? "");
      setItemFilterModalOpen(true);
    } else if (isTaskTableView) {
      setTaskFilterDraft(cloneTaskTableFilter(config.taskTableFilter));
      setTaskFilterQuickQuery(config.taskTableFilter?.rowKeyword?.trim() ?? "");
      setTaskFilterModalOpen(true);
    }
  }, [config, isItemTableView, isTaskTableView]);`,
  "openTableFilterModal",
);

const commitBlockOld = `  const commitItemFilterSave = useCallback(
    (draftOverride?: ItemTableFilter) => {
      if (!config) return;
      const d = draftOverride ?? itemFilterDraft;
      if (d.defenseRange) {
        if (d.defenseMin === null && d.defenseMax === null) {
          push("请填写防护值范围的最小值或最大值");
          return;
        }
        if (d.defenseMin !== null && d.defenseMax !== null && d.defenseMin > d.defenseMax) {
          push("请填写防护值范围的最小值或最大值");
          return;
        }
      }
      const nextFilter = itemTableFilterIsInactive(d) && !hasCustomItemKeyOrder(d) ? null : d;
      const visible =
        nextFilter == null
          ? new Set(baseBodyRows.map((r) => r.dataIdx))
          : new Set(
              baseBodyRows
                .filter(({ row }) => rowPassesItemTableFilter(row, nextFilter, itemFilterColIdx))
                .map((r) => r.dataIdx),
            );
      setItemFilterModalOpen(false);
      startTransition(() => {
        setConfig((c) => (c ? { ...c, itemTableFilter: nextFilter } : c));
        setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
      });
      void saveItemTableFilterToDisk(nextFilter).catch((e) => push(\`筛选保存失败: \${e}\`));
    },
    [config, itemFilterDraft, baseBodyRows, itemFilterColIdx, saveItemTableFilterToDisk, push],
  );

  const commitTaskFilterSave = useCallback(
    (draftOverride?: TaskTableFilter) => {
      if (!config) return;
      const d = draftOverride ?? taskFilterDraft;
      const nextFilter = taskTableFilterIsInactive(d) && !hasCustomTaskKeyOrder(d) ? null : d;
      const visible =
        nextFilter == null
          ? new Set(baseBodyRows.map((r) => r.dataIdx))
          : new Set(
              baseBodyRows
                .filter(({ row }) => rowPassesTaskTableFilter(row, nextFilter, taskFilterColIdx))
                .map((r) => r.dataIdx),
            );
      setTaskFilterModalOpen(false);
      startTransition(() => {
        setConfig((c) => (c ? { ...c, taskTableFilter: nextFilter } : c));
        setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
      });
      void saveTaskTableFilterToDisk(nextFilter).catch((e) => push(\`筛选保存失败: \${e}\`));
    },
    [config, taskFilterDraft, baseBodyRows, taskFilterColIdx, saveTaskTableFilterToDisk, push],
  );

  const applyItemFilterQuickSearch = useCallback(() => {
    if (itemFilterColIdx.tr < 0) {
      push("当前表无「类型备注」列");
      return;
    }
    const { key, ambiguous } = resolveQuickFilterKey(itemFilterQuickQuery, itemTypeRemarkDisplayKeys);
    if (!key) {
      push("当前表无「类型备注」列");
      return;
    }
    if (ambiguous) push(\`多个匹配，已选用「\${key}」\`);
    const nextDraft: ItemTableFilter = { ...itemFilterDraft, typeRemarkKeys: [key] };
    setItemFilterDraft(nextDraft);
    commitItemFilterSave(nextDraft);
  }, [
    itemFilterColIdx.tr,
    itemFilterQuickQuery,
    itemTypeRemarkDisplayKeys,
    itemFilterDraft,
    commitItemFilterSave,
    push,
  ]);

  const applyTaskFilterQuickSearch = useCallback(() => {
    if (taskFilterColIdx.tt < 0) {
      push("当前表无「TaskType」或「任务类型」列");
      return;
    }
    const { key, ambiguous } = resolveQuickFilterKey(taskFilterQuickQuery, taskTypeDisplayKeys);
    if (!key) {
      push("当前表无「类型备注」列");
      return;
    }
    if (ambiguous) push(\`多个匹配，已选用「\${key}」\`);
    const nextDraft: TaskTableFilter = { ...taskFilterDraft, taskTypeKeys: [key] };
    setTaskFilterDraft(nextDraft);
    commitTaskFilterSave(nextDraft);
  }, [taskFilterColIdx.tt, taskFilterQuickQuery, taskTypeDisplayKeys, taskFilterDraft, commitTaskFilterSave, push]);`;

const commitBlockNew = `  const commitItemFilterSave = useCallback(
    (draftOverride?: ItemTableFilter, opts?: { keepModalOpen?: boolean }) => {
      if (!config) return;
      const d = draftOverride ?? itemFilterDraft;
      if (d.defenseRange) {
        if (d.defenseMin === null && d.defenseMax === null) {
          push("请填写防护值范围的最小值或最大值");
          return;
        }
        if (d.defenseMin !== null && d.defenseMax !== null && d.defenseMin > d.defenseMax) {
          push("请填写防护值范围的最小值或最大值");
          return;
        }
      }
      const nextFilter = itemTableFilterIsInactive(d) && !hasCustomItemKeyOrder(d) ? null : d;
      const visible =
        nextFilter == null
          ? new Set(baseBodyRows.map((r) => r.dataIdx))
          : new Set(
              baseBodyRows
                .filter(({ row }) => rowPassesItemTableFilter(row, nextFilter, itemFilterColIdx))
                .map((r) => r.dataIdx),
            );
      if (!opts?.keepModalOpen) setItemFilterModalOpen(false);
      startTransition(() => {
        setConfig((c) => (c ? { ...c, itemTableFilter: nextFilter } : c));
        setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
      });
      void saveItemTableFilterToDisk(nextFilter).catch((e) => push(\`筛选保存失败: \${e}\`));
    },
    [config, itemFilterDraft, baseBodyRows, itemFilterColIdx, saveItemTableFilterToDisk, push],
  );

  const commitTaskFilterSave = useCallback(
    (draftOverride?: TaskTableFilter, opts?: { keepModalOpen?: boolean }) => {
      if (!config) return;
      const d = draftOverride ?? taskFilterDraft;
      const nextFilter = taskTableFilterIsInactive(d) && !hasCustomTaskKeyOrder(d) ? null : d;
      const visible =
        nextFilter == null
          ? new Set(baseBodyRows.map((r) => r.dataIdx))
          : new Set(
              baseBodyRows
                .filter(({ row }) => rowPassesTaskTableFilter(row, nextFilter, taskFilterColIdx))
                .map((r) => r.dataIdx),
            );
      if (!opts?.keepModalOpen) setTaskFilterModalOpen(false);
      startTransition(() => {
        setConfig((c) => (c ? { ...c, taskTableFilter: nextFilter } : c));
        setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
      });
      void saveTaskTableFilterToDisk(nextFilter).catch((e) => push(\`筛选保存失败: \${e}\`));
    },
    [config, taskFilterDraft, baseBodyRows, taskFilterColIdx, saveTaskTableFilterToDisk, push],
  );

  const clearSavedTableFilter = useCallback(() => {
    if (!config) return;
    if (isItemTableView) {
      const base = config.itemTableFilter ? cloneItemTableFilter(config.itemTableFilter) : emptyItemTableFilter();
      const cleared = clearItemFilterSelectionsKeepOrder(base);
      setItemFilterDraft(cleared);
      setItemFilterQuickQuery("");
      commitItemFilterSave(cleared, { keepModalOpen: itemFilterModalOpen });
    } else if (isTaskTableView) {
      const base = config.taskTableFilter ? cloneTaskTableFilter(config.taskTableFilter) : emptyTaskTableFilter();
      const cleared = clearTaskFilterSelectionsKeepOrder(base);
      setTaskFilterDraft(cleared);
      setTaskFilterQuickQuery("");
      commitTaskFilterSave(cleared, { keepModalOpen: taskFilterModalOpen });
    }
    push("已清空筛选");
  }, [
    config,
    isItemTableView,
    isTaskTableView,
    itemFilterModalOpen,
    taskFilterModalOpen,
    commitItemFilterSave,
    commitTaskFilterSave,
    push,
  ]);

  const applyItemFilterQuickSearch = useCallback(() => {
    const q = itemFilterQuickQuery.trim();
    if (!q) {
      push("请输入搜索关键字");
      return;
    }
    const hasMatch = baseBodyRows.some(({ row }) => rowMatchesKeyword(row, q));
    if (!hasMatch) {
      push("无包含该关键字的行");
      return;
    }
    const nextDraft: ItemTableFilter = { ...itemFilterDraft, rowKeyword: q, typeRemarkKeys: [] };
    setItemFilterDraft(nextDraft);
    commitItemFilterSave(nextDraft);
  }, [itemFilterQuickQuery, itemFilterDraft, baseBodyRows, commitItemFilterSave, push]);

  const applyTaskFilterQuickSearch = useCallback(() => {
    const q = taskFilterQuickQuery.trim();
    if (!q) {
      push("请输入搜索关键字");
      return;
    }
    const hasMatch = baseBodyRows.some(({ row }) => rowMatchesKeyword(row, q));
    if (!hasMatch) {
      push("无包含该关键字的行");
      return;
    }
    const nextDraft: TaskTableFilter = { ...taskFilterDraft, rowKeyword: q, taskTypeKeys: [], chainKeys: [] };
    setTaskFilterDraft(nextDraft);
    commitTaskFilterSave(nextDraft);
  }, [taskFilterQuickQuery, taskFilterDraft, baseBodyRows, commitTaskFilterSave, push]);`;

mustReplace(commitBlockOld, commitBlockNew, "commit and quick search");

mustReplace(
  `  const savedItemTypeRemarkKey = useMemo(() => {
    if (!isItemTableView) return null;
    return config?.itemTableFilter?.typeRemarkKeys?.[0] ?? null;
  }, [isItemTableView, config?.itemTableFilter?.typeRemarkKeys]);

  const freezeAnchorHeader = useMemo(() => {`,
  `  const savedItemTypeRemarkKey = useMemo(() => {
    if (!isItemTableView) return null;
    return config?.itemTableFilter?.typeRemarkKeys?.[0] ?? null;
  }, [isItemTableView, config?.itemTableFilter?.typeRemarkKeys]);

  const savedItemRowKeyword = useMemo(() => {
    if (!isItemTableView) return null;
    const k = config?.itemTableFilter?.rowKeyword?.trim();
    return k || null;
  }, [isItemTableView, config?.itemTableFilter?.rowKeyword]);

  const savedTaskRowKeyword = useMemo(() => {
    if (!isTaskTableView) return null;
    const k = config?.taskTableFilter?.rowKeyword?.trim();
    return k || null;
  }, [isTaskTableView, config?.taskTableFilter?.rowKeyword]);

  const hasActiveTableFilter = useMemo(() => {
    if (isItemTableView) return !itemTableFilterIsInactive(config?.itemTableFilter ?? null);
    if (isTaskTableView) return !taskTableFilterIsInactive(config?.taskTableFilter ?? null);
    return false;
  }, [isItemTableView, isTaskTableView, config?.itemTableFilter, config?.taskTableFilter]);

  const freezeAnchorHeader = useMemo(() => {`,
  "saved keywords and hasActiveTableFilter",
);

mustReplace(
  `              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const m = sendTemplateModal;
                  void sendTemplateItemsNow(m.title, m.draftItems).then((ok) => {
                    if (ok) setSendTemplateModal(null);
                  });
                }}
              >
                取消
              </button>`,
  `              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const m = sendTemplateModal;
                  void sendTemplateItemsNow(m.title, m.draftItems).then((ok) => {
                    if (ok) setSendTemplateModal(null);
                  });
                }}
              >
                发送
              </button>`,
  "send template primary button",
);

mustReplace(
  `                  placeholder="Ctrl+F 快速筛选类型备注（Enter 应用）"`,
  `                  placeholder="Ctrl+F 搜索任意列（Enter 应用）"`,
  "item filter placeholder",
);

mustReplace(
  `                选项随当前表格数据更新。三列条件之间为「且」；类型备注为单选（仅一项），物品品质同列多选为「或」。选项行左侧 ⋮⋮ 可拖拽调整选项顺序；区块行左侧 ⋮⋮ 可拖拽调整类型备注 / 物品品质 / 防护值顺序，保存后写入配置。防护值：「无」指单元格为空；「范围内」指可解析为数字且在区间内（可只填最小或最大）。**Ctrl+F** 在快捷框输入后按 Enter，等同只勾选一项类型备注并保存。`,
  `                选项随当前表格数据更新。三列条件之间为「且」；类型备注为单选（仅一项），物品品质同列多选为「或」。选项行左侧 ⋮⋮ 可拖拽调整选项顺序；区块行左侧 ⋮⋮ 可拖拽调整类型备注 / 物品品质 / 防护值顺序，保存后写入配置。防护值：「无」指单元格为空；「范围内」指可解析为数字且在区间内（可只填最小或最大）。**Ctrl+F** 在快捷框输入关键字后按 Enter，筛选任意列包含该文字的行并保存（与类型备注等条件为且）。`,
  "item filter help",
);

mustReplace(
  `                  placeholder="Ctrl+F 快速筛选任务类型（Enter 应用）"`,
  `                  placeholder="Ctrl+F 搜索任意列（Enter 应用）"`,
  "task filter placeholder",
);

mustReplace(
  `                选项随当前表格数据更新。两列条件为「且」；同列多选为「或」。选项行左侧 ⋮⋮ 可拖拽调整选项顺序；区块行左侧 ⋮⋮ 可拖拽调整任务类型 / 任务链顺序，保存后写入配置。**Ctrl+F** 在快捷框输入后按 Enter，等同只勾选一项任务类型并保存。`,
  `                选项随当前表格数据更新。两列条件为「且」；同列多选为「或」。选项行左侧 ⋮⋮ 可拖拽调整选项顺序；区块行左侧 ⋮⋮ 可拖拽调整任务类型 / 任务链顺序，保存后写入配置。**Ctrl+F** 在快捷框输入关键字后按 Enter，筛选任意列包含该文字的行并保存（与任务类型等条件为且）。`,
  "task filter help",
);

mustReplace(
  `          <button
            type="button"
            className="btn"
            disabled={wizardOpen || !config?.excelWorkspaceRoot?.trim()}
            onClick={() => openTableFilterModal()}
          >
            筛选
          </button>
          {savedItemTypeRemarkKey ? (`,
  `          <button
            type="button"
            className="btn"
            disabled={wizardOpen || !config?.excelWorkspaceRoot?.trim() || (!isItemTableView && !isTaskTableView)}
            onClick={() => openTableFilterModal()}
          >
            筛选
          </button>
          {(isItemTableView || isTaskTableView) ? (
            <button
              type="button"
              className="btn"
              disabled={wizardOpen || !config?.excelWorkspaceRoot?.trim() || !hasActiveTableFilter}
              onClick={() => void clearSavedTableFilter()}
            >
              清空筛选
            </button>
          ) : null}
          {savedItemRowKeyword ? (
            <span className="topbar-filter-summary" title="已保存的关键字筛选">
              <span className="topbar-filter-summary-label">关键字</span>
              <span className="topbar-filter-summary-value">
                <span>{savedItemRowKeyword}</span>
              </span>
            </span>
          ) : null}
          {savedTaskRowKeyword ? (
            <span className="topbar-filter-summary" title="已保存的关键字筛选">
              <span className="topbar-filter-summary-label">关键字</span>
              <span className="topbar-filter-summary-value">
                <span>{savedTaskRowKeyword}</span>
              </span>
            </span>
          ) : null}
          {savedItemTypeRemarkKey ? (`,
  "topbar clear filter and keyword summary",
);

mustReplace(
  `                          >
                            ?
                          </button>
                          <button
                            type="button"
                            className={\`th-sort-btn\${tableSort?.colIndex === ci && !tableSort.descending ? " active" : ""}\`}
                            title="升序"`,
  `                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className={\`th-sort-btn\${tableSort?.colIndex === ci && !tableSort.descending ? " active" : ""}\`}
                            title="升序"`,
  "sort desc icon",
);

// Remove unused resolveQuickFilterKey after Ctrl+F rework
const rqStart = s.indexOf("function resolveQuickFilterKey(");
const rqEnd = s.indexOf("function rowPassesItemTableFilter(", rqStart);
if (rqStart >= 0 && rqEnd > rqStart) {
  s = s.slice(0, rqStart) + s.slice(rqEnd);
}

fs.writeFileSync(appPath, s, "utf8");
const rem = (s.match(/\?\?\?/g) || []).length;
console.log("Wrote App.tsx, remaining ???", rem);
if (rem) process.exit(1);
console.log("OK");
