import React, { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { AddExpPanel } from "./AddExpPanel";
import { useClampedMenuPosition } from "./hooks/useClampedMenuPosition.ts";
import { useTableAxisScroll } from "./hooks/useTableAxisScroll.ts";
import { useTableRowToTemplateDrag } from "./hooks/useTableRowToTemplateDrag.tsx";
import { GlobalSendMailModal } from "./GlobalSendMailModal.tsx";
import { ColumnPickModal } from "./ColumnPickModal";
import { DataTableBody, TABLE_ROW_HEIGHT_ESTIMATE } from "./DataTableBody";
import { FilterOptionGrid } from "./FilterOptionGrid";
import { ItemFilterChipBar, SEASON_ITEM_CHIP_KEY, TYPE_REMARK_PINNED_KEYS } from "./ItemFilterChipBar";
import { TaskFilterChipBar } from "./TaskFilterChipBar";
import type {
  ActiveView,
  AppConfig,
  GlobalSendLastForm,
  ItemTableFilter,
  SavedTemplate,
  SendTemplateItem,
  TaskTableFilter,
} from "./types";
import type { GlobalSendSubmitPayload } from "./GlobalSendMailModal.tsx";
import { excelAccountPath, excelItemPath, excelMissionPath } from "./lib/paths";
import {
  DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC,
  fingerprintsEqual,
  normalizeExcelAutoRefreshIntervalSec,
  type ExcelWorkspaceMtimeFingerprint,
} from "./lib/excelWorkspaceFingerprint.ts";
import { isStaleExcelLoadSeq, shouldSkipSilentExcelLoad } from "./lib/excelLoadSchedule.ts";
import {
  isCtrlOrCmdF,
  shouldOpenAppFilterModal,
  shouldPreventNativeFind,
  shouldRefocusFilterQuickSearch,
} from "./lib/ctrlFFilterShortcut.ts";
import { parseAccountLevelSheet } from "./lib/accountLevelExp";
import {
  isDisplayableTableBodyRow,
  isSelectableTableDataRow,
  parseTableRowIdForCopy,
  resolveTableContextDataIdx,
} from "./lib/tableRowId.ts";
import type { ReactNode } from "react";
import {
  cellStr,
  itemQualityFilterBucket,
  itemQualityPrefixFromCell,
  readOptionalSheetFromWorkbook,
  readSheetFromWorkbook,
  resolveDefenseValueColumnIndex,
  resolveItemIdColumnIndex,
  resolveItemQualityColumnIndex,
  resolveRemarkColumnIndex,
  resolveSeasonItemColumnIndex,
  resolveTaskChainColumnIndex,
  resolveTaskTypeColumnIndex,
  resolveTypeRemarkColumnIndex,
  taskChainFilterKey,
  taskTypeFilterKey,
  TASK_TYPE_LABEL_SORT_ORDER,
  ITEM_TYPE_REMARK_PRESET_EMOTE,
  isDaHongJianShiEmoteTypeRemark,
  rowMatchesEmotePreset,
  rowMatchesKeyword,
  typeRemarkFilterKey,
  type SheetMatrix,
} from "./lib/xlsxHelpers";
import {
  applyThemeCssVarsToDocument,
  DEFAULT_THEME_ACCENT_HEX,
  DEFAULT_THEME_BACKGROUND_HEX,
  normalizeThemeAccentHex,
  normalizeThemeBackgroundHex,
} from "./lib/themeAccent";
import { setWindowCloseFlush } from "./lib/windowClose";
import {
  applySnapshot,
  snapshotFromSelection,
  viewSelectionKey,
  type ViewSelectionSnapshot,
} from "./lib/viewSelectionCache";
import {
  applyBoxSelectToggle,
  boxSelectOverlayStyleFixed,
  computeBoxSelectHitsFromPointer,
  DRAG_THRESHOLD_PX,
  isTableScrollbarHit,
  type BoxSelectPointerState,
} from "./lib/tableBoxSelect";
import { mergePinnedOrder, partitionRowsByPinOrder } from "./lib/tablePinRows";
import { toggleVisibleRowSelection } from "./lib/rowSelection.ts";
import { parseItemLineQtyInput } from "./lib/itemLineQty.ts";
import {
  buildItemTypeLookupIndex,
  EMPTY_ITEM_TYPE_LOOKUP_INDEX,
  resolveItemRowSubTypeColumnIndex,
  resolveItemRowTypeColumnIndex,
  type ItemTypeLookupIndex,
} from "./lib/itemTypeLookup.ts";
import {
  applyWallpaperCssVarsToDocument,
  clampThemeWallpaperOpacity,
  DEFAULT_THEME_WALLPAPER_OPACITY,
  normalizeThemeWallpaperRelativePath,
  resolveWallpaperAssetUrl,
} from "./lib/wallpaper";
import { typeRemarkLabelPrefix } from "./lib/typeRemarkIcons";
import {
  DEFAULT_GMT_BASE_URL,
  gmtCloseLoginWindow,
  gmtCollectLoginCookies,
  gmtExecAdminFinishTask,
  gmtFetchEnvs,
  gmtOpenLoginWindow,
  gmtSessionProbe,
  gmtSessionSliceFromConfig,
  type GmtEnvEntry,
} from "./lib/gmtClient";
import { evaluateGmtItemSendReadiness } from "./lib/gmtSendReadiness";
import {
  formatTaskCompleteToast,
  parseTaskRowForComplete,
  pickNextTaskRowByIdAsc,
  validateTaskChainSelection,
} from "./lib/completeTask";
import { evaluateGmtTaskCompleteOneRow, evaluateGmtTaskSendReadiness } from "./lib/gmtTaskSendReadiness";
import { acceptTasksViaGtop, restoreDefaultTaskCsvViaGtop } from "./lib/gtopAcceptTasks";
import {
  readItemPricesFromCsv,
  readItemPricesFromTableRow,
} from "./lib/gtopItemCsvPatch.ts";
import { modifyItemPricesViaGtop, restoreItemDefaultPricesViaGtop } from "./lib/gtopModifyItemPrices.ts";
import { resolveItemCsvPath } from "./lib/resolveItemCsv.ts";
import { resolveTaskCsvPath } from "./lib/resolveTaskCsv";
import { parseItemRowId } from "./lib/tableRowId.ts";
import { ModifyItemPriceModal } from "./ModifyItemPriceModal.tsx";
import {
  appendOperationLog,
  buildGmtOperationLog,
  createOperationLogEntry,
  toGmtLogItems,
  type OperationLogEntry,
  type OperationOutcome,
} from "./lib/operationLog";
import { OperationLogPanel } from "./OperationLogPanel";
import { rowPassesItemTableFilter } from "./lib/itemTableFilter";
import { migrateConfigTemplates } from "./lib/templateMigrate";
import { Sidebar } from "./Sidebar.tsx";
import {
  DEFAULT_SIDEBAR_ADD_EXP_CARD_COLOR,
  DEFAULT_SIDEBAR_ITEM_CARD_COLOR,
  DEFAULT_SIDEBAR_TASK_CARD_COLOR,
  sidebarAddExpDefaultColor,
} from "./lib/sidebarCardColor.ts";
import { TopbarUpdateControls } from "./TopbarUpdateControls.tsx";
import { UpdateAvailableModal } from "./UpdateAvailableModal.tsx";
import { useAppUpdater } from "./useAppUpdater.ts";
import {
  buildSendItemsFromSelection,
  execAdminSendGlobalMail,
  execAdminSendMailItems,
  mergeSendTemplateItems,
} from "./lib/sendTemplate";
import { normalizeGlobalSendLastForm } from "./lib/globalSendLastForm.ts";
import { normalizeItemServerWideSendSettings } from "./lib/itemServerWideSendSettings.ts";
import {
  buildBranchEnvDisplayLabelMap,
  formatBranchEnvOptionLabel,
  sortBranchEnvEntries,
} from "./lib/branchEnvDisplay";
import { healGmtEnvConfig } from "./lib/healGmtEnvConfig";
import { gmtEnvSelectionBlockMessage } from "./lib/gmtEnvSelection";
import {
  DEFAULT_GTOP_BASE_URL,
  DEFAULT_GTOP_PROJECT,
  gtopCloseLoginWindow,
  gtopCollectLoginCookies,
  gtopOpenLoginWindow,
  gtopSessionProbe,
  gtopSessionSliceFromConfig,
} from "./lib/gtopClient";
import { SettingsModal } from "./SettingsModal.tsx";
import {
  runAddExpPresetMaxLevel,
  runAddExpPresetRich,
  runAddExpPresetRichAndMaxLevel,
  type AddExpPresetRunnerDeps,
} from "./lib/addExpPresetRunner.ts";

const MAX_TEMPLATES = 50;

const GMT_COMMAND_LIST_URL =
  "https://test-krad.stdgmtool.web.garena.cn/command/list?page=1&size=20";

/** 不可隐藏的 Excel 表头（列隐藏面板中禁用） */
const NON_HIDEABLE_ITEM_HEADERS = new Set(["物品ID"]);
const NON_HIDEABLE_TASK_HEADERS = new Set(["任务ID"]);

function headerCannotHide(table: "item" | "task", header: string): boolean {
  return table === "item" ? NON_HIDEABLE_ITEM_HEADERS.has(header) : NON_HIDEABLE_TASK_HEADERS.has(header);
}

type ItemFilterSectionId = "typeRemark" | "quality" | "defense";
type TaskFilterSectionId = "taskType" | "chain";

const ITEM_FILTER_SECTION_IDS: ItemFilterSectionId[] = ["typeRemark", "quality", "defense"];
const TASK_FILTER_SECTION_IDS: TaskFilterSectionId[] = ["taskType", "chain"];

function normalizeItemSectionOrderFromDisk(raw: unknown): ItemFilterSectionId[] | null {
  if (!Array.isArray(raw)) return null;
  const allow = new Set<string>(ITEM_FILTER_SECTION_IDS);
  const seen = new Set<string>();
  const out: ItemFilterSectionId[] = [];
  for (const x of raw) {
    if (typeof x !== "string" || x === "seasonItem" || !allow.has(x) || seen.has(x)) continue;
    seen.add(x);
    out.push(x as ItemFilterSectionId);
  }
  return out.length === ITEM_FILTER_SECTION_IDS.length ? out : null;
}

function mergeItemSectionOrder(
  saved: readonly ("typeRemark" | "quality" | "defense" | "seasonItem")[] | null | undefined,
): ItemFilterSectionId[] {
  const filtered =
    saved?.filter((id): id is ItemFilterSectionId =>
      (ITEM_FILTER_SECTION_IDS as readonly string[]).includes(id),
    ) ?? null;
  if (!filtered?.length) return [...ITEM_FILTER_SECTION_IDS];
  const all = new Set(ITEM_FILTER_SECTION_IDS);
  const used = new Set<ItemFilterSectionId>();
  const out: ItemFilterSectionId[] = [];
  for (const id of filtered) {
    if (all.has(id) && !used.has(id)) {
      out.push(id);
      used.add(id);
    }
  }
  for (const id of ITEM_FILTER_SECTION_IDS) {
    if (!used.has(id)) out.push(id);
  }
  return out;
}

function normalizeTaskSectionOrderFromDisk(raw: unknown): TaskFilterSectionId[] | null {
  if (!Array.isArray(raw)) return null;
  const allow = new Set<string>(TASK_FILTER_SECTION_IDS);
  const seen = new Set<string>();
  const out: TaskFilterSectionId[] = [];
  for (const x of raw) {
    if (typeof x !== "string" || !allow.has(x) || seen.has(x)) continue;
    seen.add(x);
    out.push(x as TaskFilterSectionId);
  }
  return out.length === TASK_FILTER_SECTION_IDS.length ? out : null;
}

function mergeTaskSectionOrder(saved: TaskFilterSectionId[] | null | undefined): TaskFilterSectionId[] {
  if (!saved?.length) return [...TASK_FILTER_SECTION_IDS];
  const all = new Set(TASK_FILTER_SECTION_IDS);
  const used = new Set<TaskFilterSectionId>();
  const out: TaskFilterSectionId[] = [];
  for (const id of saved) {
    if (all.has(id) && !used.has(id)) {
      out.push(id);
      used.add(id);
    }
  }
  for (const id of TASK_FILTER_SECTION_IDS) {
    if (!used.has(id)) out.push(id);
  }
  return out;
}

/** 从磁盘 JSON 规范化 AppConfig（筛选、快照等） */
function migrateTaskTypeStoredKey(k: string): string {
  return k;
}

/** 当前表格勾选行所属业务类型（与快照 source 对齐） */
function getCurrentTableSource(activeView: ActiveView, config: AppConfig): "item" | "task" | null {
  if (activeView.kind === "addExp") return null;
  if (activeView.kind === "item") return "item";
  if (activeView.kind === "task") return "task";
  if (activeView.kind === "template" || activeView.kind === "snapshot") {
    const id = activeView.id;
    return config.savedTemplates.find((t) => t.id === id)?.source ?? null;
  }
  return null;
}

/** 表头排序：与 localeCompare 一致，升序为 a 在前时返回负 */
function compareDataCells(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  const sa = cellStr(a);
  const sb = cellStr(b);
  return sa.localeCompare(sb, "zh-CN", { numeric: true, sensitivity: "accent" });
}

function headersCompatibleForAppend(currentHeader: unknown[] | undefined, snapHeader: unknown[] | undefined): boolean {
  if (!currentHeader?.length || !snapHeader?.length || currentHeader.length !== snapHeader.length) return false;
  for (let i = 0; i < currentHeader.length; i++) {
    if (cellStr(currentHeader[i]) !== cellStr(snapHeader[i])) return false;
  }
  return true;
}

/** 从 currentAoa 与 selectedRows 构建选中行子表（含表头） */
function buildSelectedDataRows(currentAoa: SheetMatrix, selectedRows: Set<number>): { idxs: number[]; dataRows: unknown[][]; fullAoa: SheetMatrix } | null {
  const idxs = [...selectedRows].sort((a, b) => a - b);
  if (idxs.length === 0) return null;
  const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
  const dataRows = idxs.map((di) => {
    const r = currentAoa[di + 1];
    if (!r) return [] as unknown[];
    return headersRow.map((_, ci) => (r[ci] != null ? r[ci] : ""));
  });
  const fullAoa: SheetMatrix = [headersRow as unknown[], ...dataRows];
  return { idxs, dataRows, fullAoa };
}

function emptyItemTableFilter(): ItemTableFilter {
  return {
    typeRemarkKeys: [],
    qualityKeys: [],
    defenseNone: false,
    defenseRange: false,
    defenseMin: null,
    defenseMax: null,
    seasonItemOnly: false,
    rowKeyword: null,
    customKeywordKeys: [],
  };
}

function normalizeItemTableFilterFromDisk(raw: unknown): ItemTableFilter | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as ItemTableFilter;
  const typeRemarkKeysRaw = normalizeStringArray(o.typeRemarkKeys);
  const f: ItemTableFilter = {
    typeRemarkKeys: typeRemarkKeysRaw,
    qualityKeys: normalizeStringArray(o.qualityKeys),
    defenseNone: Boolean(o.defenseNone),
    defenseRange: Boolean(o.defenseRange),
    defenseMin: typeof o.defenseMin === "number" && Number.isFinite(o.defenseMin) ? o.defenseMin : null,
    defenseMax: typeof o.defenseMax === "number" && Number.isFinite(o.defenseMax) ? o.defenseMax : null,
    seasonItemOnly: Boolean(o.seasonItemOnly),
    typeRemarkKeyOrder: normalizeKeyOrderField(o.typeRemarkKeyOrder),
    qualityKeyOrder: normalizeKeyOrderField(o.qualityKeyOrder),
    sectionOrder: normalizeItemSectionOrderFromDisk((o as ItemTableFilter).sectionOrder),
    chipBarTypeRemarkOrder: normalizeKeyOrderField(o.chipBarTypeRemarkOrder),
    chipBarQualityOrder: normalizeKeyOrderField(o.chipBarQualityOrder),
    rowKeyword: typeof o.rowKeyword === "string" && o.rowKeyword.trim() ? o.rowKeyword.trim() : null,
    savedCustomKeywords: normalizeKeyOrderField(o.savedCustomKeywords),
    customKeywordKeys: normalizeStringArray(o.customKeywordKeys),
    chipBarCustomKeywordOrder: normalizeKeyOrderField(o.chipBarCustomKeywordOrder),
  };
  if (itemTableFilterIsInactive(f) && !hasCustomItemKeyOrder(f)) return null;
  return f;
}

function clearItemFilterSelectionsKeepOrder(d: ItemTableFilter): ItemTableFilter {
  return {
    ...d,
    typeRemarkKeys: [],
    qualityKeys: [],
    defenseNone: false,
    defenseRange: false,
    defenseMin: null,
    defenseMax: null,
    seasonItemOnly: false,
    rowKeyword: null,
    customKeywordKeys: [],
  };
}

function cloneItemTableFilter(f: ItemTableFilter | null): ItemTableFilter {
  if (!f) return emptyItemTableFilter();
  return {
    typeRemarkKeys: [...f.typeRemarkKeys],
    qualityKeys: [...f.qualityKeys],
    defenseNone: f.defenseNone,
    defenseRange: f.defenseRange,
    defenseMin: f.defenseMin,
    defenseMax: f.defenseMax,
    seasonItemOnly: Boolean(f.seasonItemOnly),
    typeRemarkKeyOrder: f.typeRemarkKeyOrder?.length ? [...f.typeRemarkKeyOrder] : null,
    qualityKeyOrder: f.qualityKeyOrder?.length ? [...f.qualityKeyOrder] : null,
    sectionOrder: f.sectionOrder?.length ? [...f.sectionOrder] : null,
    chipBarTypeRemarkOrder: f.chipBarTypeRemarkOrder?.length ? [...f.chipBarTypeRemarkOrder] : null,
    chipBarQualityOrder: f.chipBarQualityOrder?.length ? [...f.chipBarQualityOrder] : null,
    rowKeyword: f.rowKeyword?.trim() ? f.rowKeyword.trim() : null,
    savedCustomKeywords: f.savedCustomKeywords?.length ? [...f.savedCustomKeywords] : null,
    customKeywordKeys: [...f.customKeywordKeys],
    chipBarCustomKeywordOrder: f.chipBarCustomKeywordOrder?.length ? [...f.chipBarCustomKeywordOrder] : null,
  };
}

function itemTableFilterIsInactive(f: ItemTableFilter | null): boolean {
  if (f == null) return true;
  return (
    f.typeRemarkKeys.length === 0 &&
    f.qualityKeys.length === 0 &&
    !f.defenseNone &&
    !f.defenseRange &&
    !f.seasonItemOnly &&
    !(f.rowKeyword?.trim()) &&
    f.customKeywordKeys.length === 0
  );
}

function normalizeStringArray(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
}

function normalizeKeyOrderField(raw: unknown): string[] | null {
  const a = normalizeStringArray(raw);
  return a.length ? a : null;
}

function hasCustomItemKeyOrder(f: ItemTableFilter): boolean {
  return (
    (f.typeRemarkKeyOrder?.length ?? 0) > 0 ||
    (f.qualityKeyOrder?.length ?? 0) > 0 ||
    (f.chipBarTypeRemarkOrder?.length ?? 0) > 0 ||
    (f.chipBarQualityOrder?.length ?? 0) > 0 ||
    (f.savedCustomKeywords?.length ?? 0) > 0 ||
    (f.chipBarCustomKeywordOrder?.length ?? 0) > 0 ||
    (f.sectionOrder != null && f.sectionOrder.length > 0)
  );
}

function hasCustomTaskKeyOrder(f: TaskTableFilter): boolean {
  return (
    (f.taskTypeKeyOrder?.length ?? 0) > 0 ||
    (f.chainKeyOrder?.length ?? 0) > 0 ||
    (f.chipBarTaskTypeOrder?.length ?? 0) > 0 ||
    (f.chipBarChainOrder?.length ?? 0) > 0 ||
    (f.savedCustomKeywords?.length ?? 0) > 0 ||
    (f.chipBarCustomKeywordOrder?.length ?? 0) > 0 ||
    (f.sectionOrder != null && f.sectionOrder.length > 0)
  );
}

const TASK_CHAIN_CHIP_PINNED_COUNT = 6;
const TASK_TYPE_CHIP_PINNED_COUNT = 8;

function allCustomKeywordKeys(f: { savedCustomKeywords?: string[] | null }): string[] {
  return f.savedCustomKeywords?.length ? [...f.savedCustomKeywords] : [];
}

function sanitizeChipBarOrder(orderedKeys: string[], validKeys: readonly string[]): string[] {
  const valid = new Set(validKeys);
  return orderedKeys.filter((k) => valid.has(k));
}

/** 数据键集合 S + 保存顺序 O：先按 O 保留仍在 S 的键，再按默认规则追加 S 中剩余键 */
function mergeKeyOrder(keysFromData: readonly string[], savedOrder: string[] | null | undefined, sortRest: (rest: string[]) => string[]): string[] {
  const S = new Set(keysFromData);
  const out: string[] = [];
  if (savedOrder?.length) {
    for (const k of savedOrder) {
      if (S.has(k)) {
        out.push(k);
        S.delete(k);
      }
    }
  }
  const rest = [...S];
  out.push(...sortRest(rest));
  return out;
}

const TYPE_REMARK_PRIORITY = ["武器", "防具", "食材", "材料", "藏品"];

function sortTypeRemarkRest(rest: string[]): string[] {
  const s = new Set(rest);
  const ordered: string[] = [];
  for (const p of TYPE_REMARK_PRIORITY) {
    if (s.has(p)) {
      ordered.push(p);
      s.delete(p);
    }
  }
  const hasEmpty = s.has("空");
  if (hasEmpty) s.delete("空");
  const mid = [...s].sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  return [...ordered, ...mid, ...(hasEmpty ? ["空"] : [])];
}

const QUALITY_LABEL_ORDER = ["低品质", "绿", "蓝", "紫", "金", "红"];

function sortQualityRest(rest: string[]): string[] {
  const s = new Set(rest);
  const out: string[] = [];
  for (const lab of QUALITY_LABEL_ORDER) {
    if (s.has(lab)) {
      out.push(lab);
      s.delete(lab);
    }
  }
  const nums: string[] = [];
  const other: string[] = [];
  let hasEmpty = false;
  for (const k of s) {
    if (k === "空") {
      hasEmpty = true;
      continue;
    }
    if (/^-?\d+$/.test(k)) nums.push(k);
    else other.push(k);
  }
  nums.sort((a, b) => Number(a) - Number(b));
  other.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  return [...out, ...nums, ...other, ...(hasEmpty ? ["空"] : [])];
}

function sortTaskTypeRest(rest: string[]): string[] {
  const s = new Set(rest);
  const hasEmpty = s.has("空");
  if (hasEmpty) s.delete("空");
  const fixed: string[] = [];
  for (const lab of TASK_TYPE_LABEL_SORT_ORDER) {
    if (s.has(lab)) {
      fixed.push(lab);
      s.delete(lab);
    }
  }
  const nums = [...s].filter((k) => /^-?\d+$/.test(k));
  const other = [...s].filter((k) => !/^-?\d+$/.test(k));
  nums.sort((a, b) => Number(a) - Number(b));
  other.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  return [...fixed, ...nums, ...other, ...(hasEmpty ? ["空"] : [])];
}

function sortChainRest(rest: string[]): string[] {
  const nums = rest.filter((k) => /^-?\d+$/.test(k));
  nums.sort((a, b) => Number(a) - Number(b));
  const other = rest.filter((k) => !/^-?\d+$/.test(k));
  other.sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));
  return [...nums, ...other];
}

function emptyTaskTableFilter(): TaskTableFilter {
  return { taskTypeKeys: [], chainKeys: [], rowKeyword: null, customKeywordKeys: [] };
}

function normalizeTaskTableFilterFromDisk(raw: unknown): TaskTableFilter | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as TaskTableFilter;
  const f: TaskTableFilter = {
    taskTypeKeys: normalizeStringArray(o.taskTypeKeys).map(migrateTaskTypeStoredKey),
    chainKeys: normalizeStringArray(o.chainKeys),
    taskTypeKeyOrder: normalizeKeyOrderField(o.taskTypeKeyOrder)?.map(migrateTaskTypeStoredKey) ?? null,
    chainKeyOrder: normalizeKeyOrderField(o.chainKeyOrder),
    sectionOrder: normalizeTaskSectionOrderFromDisk((o as TaskTableFilter).sectionOrder),
    chipBarTaskTypeOrder: normalizeKeyOrderField(o.chipBarTaskTypeOrder)?.map(migrateTaskTypeStoredKey) ?? null,
    chipBarChainOrder: normalizeKeyOrderField(o.chipBarChainOrder),
    rowKeyword: typeof o.rowKeyword === "string" && o.rowKeyword.trim() ? o.rowKeyword.trim() : null,
    savedCustomKeywords: normalizeKeyOrderField(o.savedCustomKeywords),
    customKeywordKeys: normalizeStringArray(o.customKeywordKeys),
    chipBarCustomKeywordOrder: normalizeKeyOrderField(o.chipBarCustomKeywordOrder),
  };
  if (taskTableFilterIsInactive(f) && !hasCustomTaskKeyOrder(f)) return null;
  return f;
}

function cloneTaskTableFilter(f: TaskTableFilter | null): TaskTableFilter {
  if (!f) return emptyTaskTableFilter();
  return {
    taskTypeKeys: [...f.taskTypeKeys],
    chainKeys: [...f.chainKeys],
    taskTypeKeyOrder: f.taskTypeKeyOrder?.length ? [...f.taskTypeKeyOrder] : null,
    chainKeyOrder: f.chainKeyOrder?.length ? [...f.chainKeyOrder] : null,
    chipBarTaskTypeOrder: f.chipBarTaskTypeOrder?.length ? [...f.chipBarTaskTypeOrder] : null,
    chipBarChainOrder: f.chipBarChainOrder?.length ? [...f.chipBarChainOrder] : null,
    sectionOrder: f.sectionOrder?.length ? [...f.sectionOrder] : null,
    rowKeyword: f.rowKeyword?.trim() ? f.rowKeyword.trim() : null,
    savedCustomKeywords: f.savedCustomKeywords?.length ? [...f.savedCustomKeywords] : null,
    customKeywordKeys: [...f.customKeywordKeys],
    chipBarCustomKeywordOrder: f.chipBarCustomKeywordOrder?.length ? [...f.chipBarCustomKeywordOrder] : null,
  };
}

function clearTaskFilterSelectionsKeepOrder(d: TaskTableFilter): TaskTableFilter {
  return { ...d, taskTypeKeys: [], chainKeys: [], rowKeyword: null, customKeywordKeys: [] };
}

function taskTableFilterIsInactive(f: TaskTableFilter | null): boolean {
  if (f == null) return true;
  return (
    f.taskTypeKeys.length === 0 &&
    f.chainKeys.length === 0 &&
    !(f.rowKeyword?.trim()) &&
    f.customKeywordKeys.length === 0
  );
}

function rowPassesTaskTableFilter(row: unknown[], f: TaskTableFilter, col: { tt: number; ch: number }): boolean {
  if (f.rowKeyword?.trim() && !rowMatchesKeyword(row, f.rowKeyword)) return false;
  if (f.customKeywordKeys.length > 0) {
    if (!f.customKeywordKeys.every((k) => rowMatchesKeyword(row, k))) return false;
  }
  if (col.tt >= 0 && f.taskTypeKeys.length > 0) {
    if (!f.taskTypeKeys.includes(taskTypeFilterKey(row[col.tt]))) return false;
  }
  if (col.ch >= 0 && f.chainKeys.length > 0) {
    const ck = taskChainFilterKey(row[col.ch]);
    if (ck === null || !f.chainKeys.includes(ck)) return false;
  }
  return true;
}

type FilterDnDListProps = {
  items: string[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  onReorderKeys: (orderedKeys: string[]) => void;
  labelPrefix?: (key: string) => ReactNode;
};

function FilterDnDOptionList({ items, selectedKeys, onToggle, onReorderKeys, labelPrefix }: FilterDnDListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<number | null>(null);
  const itemsAtDragRef = useRef<string[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const endDrag = useCallback(() => {
    fromRef.current = null;
    itemsAtDragRef.current = [];
    setDragFrom(null);
    setDropIdx(null);
  }, []);

  const onHandlePointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      fromRef.current = index;
      itemsAtDragRef.current = [...items];
      setDragFrom(index);
      setDropIdx(index);

      const onMove = (ev: PointerEvent) => {
        if (fromRef.current === null) return;
        const root = listRef.current;
        if (!root) return;
        const rows = root.querySelectorAll<HTMLElement>("[data-dnd-filter-row]");
        const n = rows.length;
        let insert = n;
        for (let i = 0; i < n; i++) {
          const r = rows[i].getBoundingClientRect();
          const mid = r.top + r.height / 2;
          if (ev.clientY < mid) {
            insert = i;
            break;
          }
        }
        setDropIdx(insert);
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const from = fromRef.current;
        if (from === null) {
          endDrag();
          return;
        }
        let insert = itemsAtDragRef.current.length;
        const root = listRef.current;
        if (root) {
          const rows = root.querySelectorAll<HTMLElement>("[data-dnd-filter-row]");
          const n = rows.length;
          insert = n;
          for (let i = 0; i < n; i++) {
            const r = rows[i].getBoundingClientRect();
            const mid = r.top + r.height / 2;
            if (ev.clientY < mid) {
              insert = i;
              break;
            }
          }
        }
        const src = itemsAtDragRef.current;
        let to = insert;
        const next = [...src];
        const [row] = next.splice(from, 1);
        if (to > from) to -= 1;
        next.splice(to, 0, row);
        const changed = next.length !== items.length || next.some((v, i) => v !== items[i]);
        if (changed) onReorderKeys(next);
        endDrag();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [items, onReorderKeys, endDrag],
  );

  return (
    <div ref={listRef} className="filter-dnd-list">
      {items.map((opt, index) => {
        const showLineBefore = dropIdx !== null && dropIdx === index;
        const showLineAfter = dropIdx !== null && dropIdx === items.length && index === items.length - 1;
        const prefix = labelPrefix?.(opt) ?? null;
        return (
          <div
            key={opt}
            data-dnd-filter-row
            className={`filter-dnd-row${dragFrom === index ? " filter-dnd-row--dragging" : ""}${showLineBefore ? " filter-dnd-row--drop-before" : ""}${showLineAfter ? " filter-dnd-row--drop-after" : ""}`}
          >
            <span
              className="filter-dnd-handle"
              role="button"
              tabIndex={0}
              onPointerDown={onHandlePointerDown(index)}
              title="拖拽调整顺序"
              aria-grabbed={dragFrom === index}
            >
              ⋮⋮
            </span>
            <label className="filter-dnd-label">
              <input type="checkbox" checked={selectedKeys.includes(opt)} onChange={() => onToggle(opt)} />
              {prefix ? <span className="filter-dnd-prefix">{prefix}</span> : null}
              <span className="filter-dnd-text" title={opt}>
                {opt}
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}

type FilterSectionDnDListProps<T extends string> = {
  order: T[];
  onReorder: (next: T[]) => void;
  renderSection: (id: T) => ReactNode;
  rowClassForId?: (id: T) => string;
};

function FilterSectionDnDList<T extends string>({ order, onReorder, renderSection, rowClassForId }: FilterSectionDnDListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<number | null>(null);
  const orderAtDragRef = useRef<T[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const endDrag = useCallback(() => {
    fromRef.current = null;
    orderAtDragRef.current = [];
    setDragFrom(null);
    setDropIdx(null);
  }, []);

  const onHandlePointerDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      fromRef.current = index;
      orderAtDragRef.current = [...order];
      setDragFrom(index);
      setDropIdx(index);

      const onMove = (ev: PointerEvent) => {
        if (fromRef.current === null) return;
        const root = listRef.current;
        if (!root) return;
        const rows = root.querySelectorAll<HTMLElement>("[data-dnd-section-row]");
        const n = rows.length;
        let insert = n;
        for (let i = 0; i < n; i++) {
          const r = rows[i].getBoundingClientRect();
          const mid = r.top + r.height / 2;
          if (ev.clientY < mid) {
            insert = i;
            break;
          }
        }
        setDropIdx(insert);
      };

      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const from = fromRef.current;
        if (from === null) {
          endDrag();
          return;
        }
        let insert = orderAtDragRef.current.length;
        const root = listRef.current;
        if (root) {
          const rows = root.querySelectorAll<HTMLElement>("[data-dnd-section-row]");
          const n = rows.length;
          insert = n;
          for (let i = 0; i < n; i++) {
            const r = rows[i].getBoundingClientRect();
            const mid = r.top + r.height / 2;
            if (ev.clientY < mid) {
              insert = i;
              break;
            }
          }
        }
        const src = orderAtDragRef.current;
        let to = insert;
        const next = [...src];
        const [row] = next.splice(from, 1);
        if (to > from) to -= 1;
        next.splice(to, 0, row);
        const changed = next.length !== order.length || next.some((v, i) => v !== order[i]);
        if (changed) onReorder(next);
        endDrag();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [order, onReorder, endDrag],
  );

  return (
    <div ref={listRef} className="filter-section-dnd-list">
      {order.map((id, index) => {
        const rowExtra = rowClassForId?.(id) ?? "";
        const showLineBefore = dropIdx !== null && dropIdx === index;
        const showLineAfter = dropIdx !== null && dropIdx === order.length && index === order.length - 1;
        return (
          <div
            key={id}
            data-dnd-section-row
            className={`filter-section-dnd-row${rowExtra}${dragFrom === index ? " filter-section-dnd-row--dragging" : ""}${showLineBefore ? " filter-section-dnd-row--drop-before" : ""}${showLineAfter ? " filter-section-dnd-row--drop-after" : ""}`}
          >
            <span
              className="filter-section-dnd-handle"
              role="button"
              tabIndex={0}
              onPointerDown={onHandlePointerDown(index)}
              title="拖拽调整区块顺序"
              aria-grabbed={dragFrom === index}
            >
              ⋮⋮
            </span>
            <div className="filter-section-dnd-slot">{renderSection(id)}</div>
          </div>
        );
      })}
    </div>
  );
}

const defaultConfig = (): AppConfig => ({
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
  recycledTemplates: [],
  themeAccentHex: DEFAULT_THEME_ACCENT_HEX,
  themeBackgroundHex: DEFAULT_THEME_BACKGROUND_HEX,
  themeWallpaperRelativePath: null,
  themeWallpaperOpacity: DEFAULT_THEME_WALLPAPER_OPACITY,
  sidebarItemCardColor: DEFAULT_SIDEBAR_ITEM_CARD_COLOR,
  sidebarTaskCardColor: DEFAULT_SIDEBAR_TASK_CARD_COLOR,
  sidebarAddExpCardColor: DEFAULT_SIDEBAR_ADD_EXP_CARD_COLOR,
  sidebarItemCardColorOverride: null,
  sidebarTaskCardColorOverride: null,
  sidebarTemplateOrder: null,
  initialItemFilterSheetShown: false,
  initialTaskFilterSheetShown: false,
  gmtBaseUrl: DEFAULT_GMT_BASE_URL,
  gmtCookie: "",
  gmtEnvId: null,
  gmtEnvName: null,
  gmtAccountId: "",
  gmtTradable: false,
  gmtLockRegion: "SG",
  gmtNotiRegion: "SG",
  gtopBaseUrl: DEFAULT_GTOP_BASE_URL,
  gtopCookie: "",
  gtopProject: DEFAULT_GTOP_PROJECT,
  gtopEnvId: null,
  gtopEnvName: null,
  gtopRegionServerId: null,
  gtopRegionServerName: null,
  excelAutoRefreshIntervalSec: DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC,
  showItemTypeInTable: false,
});

function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const push = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);
  return { toasts, push };
}

function useOperationLog() {
  const [entries, setEntries] = useState<OperationLogEntry[]>([]);
  const logOp = useCallback((partial: Omit<OperationLogEntry, "id" | "at">) => {
    setEntries((prev) => appendOperationLog(prev, createOperationLogEntry(partial)));
  }, []);
  const clearLog = useCallback(() => setEntries([]), []);
  return { entries, logOp, clearLog };
}

export default function App() {
  const { toasts, push } = useToasts();
  const { entries: operationLogEntries, logOp, clearLog } = useOperationLog();
  const appUpdater = useAppUpdater({ checkOnMount: true });
  const [logPanelOpen, setLogPanelOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [itemAoa, setItemAoa] = useState<SheetMatrix | null>(null);
  const [itemTypeLookupIndex, setItemTypeLookupIndex] = useState<ItemTypeLookupIndex>(
    EMPTY_ITEM_TYPE_LOOKUP_INDEX,
  );
  const [taskAoa, setTaskAoa] = useState<SheetMatrix | null>(null);
  const [accountLevelByLevel, setAccountLevelByLevel] = useState<Map<number, number> | null>(null);
  const [accountLevelParseError, setAccountLevelParseError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>({ kind: "item" });
  const [remarkColIndex, setRemarkColIndex] = useState<number>(-1);
  const [columnPickOpen, setColumnPickOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(() => new Set());
  /** 勾选先后顺序（UI 用；完成任务按任务 ID 升序，不用此队列） */
  const [selectedRowOrder, setSelectedRowOrder] = useState<number[]>(() => []);
  const [pinnedRowOrder, setPinnedRowOrder] = useState<{ item: number[]; task: number[] }>({
    item: [],
    task: [],
  });
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; dataIdx: number | null } | null>(null);
  const [hiddenPanel, setHiddenPanel] = useState<"item" | "task" | null>(null);
  const [hiddenPanelDraft, setHiddenPanelDraft] = useState<string[] | null>(null);

  const [goGmtModal, setGoGmtModal] = useState<{ instruction: string; repeatVisit: boolean } | null>(null);
  const [templateNameModal, setTemplateNameModal] = useState<{
    defaultTitle: string;
    source: "item" | "task";
    aoa: SheetMatrix;
    items: SendTemplateItem[];
  } | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [templateRenameModal, setTemplateRenameModal] = useState<{ id: string; draft: string } | null>(null);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState<{ id: string; title: string } | null>(null);
  const [addExpPresetBusy, setAddExpPresetBusy] = useState(false);
  const [sendTemplateModal, setSendTemplateModal] = useState<{
    templateId: string;
    title: string;
    draftItems: SendTemplateItem[];
  } | null>(null);
  const [columnHeaderMenu, setColumnHeaderMenu] = useState<{ x: number; y: number; headerName: string } | null>(null);
  const logPanelRef = useRef<HTMLDivElement>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  /** 道具表每行数量（dataIdx → qty），默认 1 */
  const [tableSort, setTableSort] = useState<{ colIndex: number; descending: boolean } | null>(null);
  /** 主表拉取 Excel 时空态：fetch=首次；refresh=工具栏刷新后 */
  const excelLoadMessageModeRef = useRef<"fetch" | "refresh">("fetch");
  /** GMT 登录态：检查中 / 已登录 / 未登录；登录用 openUrl */
  const gmtBrowserOpenedThisSessionRef = useRef(false);
  const tableDataRef = useRef<HTMLTableElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const boxSelectRef = useRef<BoxSelectPointerState | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);
  const columnHeaderMenuRef = useRef<HTMLDivElement>(null);
  const tableMetaBarRef = useRef<HTMLDivElement | null>(null);
  const [stickyCellLeftPx, setStickyCellLeftPx] = useState<number[]>([]);
  const [layoutResizeSeq, setLayoutResizeSeq] = useState(0);
  /** 道具 / 任务表顶栏 GMT 发送前置校验提示 */
  const [itemLineQty, setItemLineQty] = useState<Record<number, number>>({});
  const selectionByViewRef = useRef<Map<string, ViewSelectionSnapshot>>(new Map());
  const selectedRowsRef = useRef(selectedRows);
  const selectedRowOrderRef = useRef(selectedRowOrder);
  const itemLineQtyRef = useRef(itemLineQty);
  const [itemFilterModalOpen, setItemFilterModalOpen] = useState(false);
  const [itemFilterDraft, setItemFilterDraft] = useState<ItemTableFilter>(() => emptyItemTableFilter());
  const [taskFilterModalOpen, setTaskFilterModalOpen] = useState(false);
  const [taskFilterDraft, setTaskFilterDraft] = useState<TaskTableFilter>(() => emptyTaskTableFilter());
  const [itemFilterQuickQuery, setItemFilterQuickQuery] = useState("");
  const [taskFilterQuickQuery, setTaskFilterQuickQuery] = useState("");
  const itemFilterQuickInputRef = useRef<HTMLInputElement>(null);
  const taskFilterQuickInputRef = useRef<HTMLInputElement>(null);
  const itemFilterQuickFocusPendingRef = useRef(false);
  const taskFilterQuickFocusPendingRef = useRef(false);
  const itemFilterTypeRemarkScrollRef = useRef<HTMLDivElement | null>(null);
  const [globalSendModal, setGlobalSendModal] = useState<{ items: SendTemplateItem[]; hint: string } | null>(null);
  const [globalSendSubmitting, setGlobalSendSubmitting] = useState(false);
  const [boxSelect, setBoxSelect] = useState<BoxSelectPointerState | null>(null);
  const [itemFilterChipSaveHint, setItemFilterChipSaveHint] = useState<string | null>(null);
  const [taskFilterChipSaveHint, setTaskFilterChipSaveHint] = useState<string | null>(null);
  const itemFilterChipSaveHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskFilterChipSaveHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterSheetOpen = itemFilterModalOpen || taskFilterModalOpen;
  const [gmtLoggedIn, setGmtLoggedIn] = useState(false);
  const [gmtLoginModalOpen, setGmtLoginModalOpen] = useState(false);
  const [gmtEnvs, setGmtEnvs] = useState<GmtEnvEntry[]>([]);
  const [gmtSessionChecking, setGmtSessionChecking] = useState(false);
  const [gmtAccountIdDraft, setGmtAccountIdDraft] = useState("");
  const [gtopLoggedIn, setGtopLoggedIn] = useState(false);
  const [gtopLoginModalOpen, setGtopLoginModalOpen] = useState(false);
  const [restoreDefaultTaskCsvBusy, setRestoreDefaultTaskCsvBusy] = useState(false);
  const [itemPriceModal, setItemPriceModal] = useState<{
    itemId: string;
    baseValue: string;
    stdPrice: string;
  } | null>(null);
  const [itemPriceSubmitting, setItemPriceSubmitting] = useState(false);
  const [restoreItemPriceBusy, setRestoreItemPriceBusy] = useState(false);
  const [excelBackgroundBusy, setExcelBackgroundBusy] = useState(false);
  const excelFingerprintRef = useRef<ExcelWorkspaceMtimeFingerprint | null>(null);
  const excelLoadSeqRef = useRef(0);
  const excelLoadInFlightRef = useRef(0);

  const persist = useCallback(async (next: AppConfig) => {
    await invoke("save_config", { config: next });
    setConfig(next);
  }, []);

  const configRef = useRef<AppConfig | null>(null);
  const gmtAccountIdDraftRef = useRef("");
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    gmtAccountIdDraftRef.current = gmtAccountIdDraft;
  }, [gmtAccountIdDraft]);

  const buildPersistedConfigFromUi = useCallback((): AppConfig | null => {
    const c = configRef.current;
    if (!c) return null;
    return { ...c, gmtAccountId: gmtAccountIdDraftRef.current };
  }, []);

  const flushSessionSettingsToDisk = useCallback(() => {
    const next = buildPersistedConfigFromUi();
    if (!next) return;
    void invoke("save_config", { config: next });
  }, [buildPersistedConfigFromUi]);

  const flushSessionRef = useRef(flushSessionSettingsToDisk);
  useEffect(() => {
    flushSessionRef.current = flushSessionSettingsToDisk;
    setWindowCloseFlush(() => flushSessionRef.current());
  }, [flushSessionSettingsToDisk]);

  const saveItemTableFilterToDisk = useCallback(async (filter: ItemTableFilter | null) => {
    await invoke("save_item_table_filter", { filter });
  }, []);

  const saveTaskTableFilterToDisk = useCallback(async (filter: TaskTableFilter | null) => {
    await invoke("save_task_table_filter", { filter });
  }, []);

  const loadConfigFromDisk = useCallback(async () => {
    const c = await invoke<AppConfig>("load_config");
    const rawSnaps = Array.isArray(c.savedSnapshots) ? c.savedSnapshots : [];
    const merged = migrateConfigTemplates({
      ...defaultConfig(),
      ...c,
      freezeThroughItemHeader: (c as AppConfig).freezeThroughItemHeader ?? null,
      freezeThroughTaskHeader: (c as AppConfig).freezeThroughTaskHeader ?? null,
      itemTableFilter: normalizeItemTableFilterFromDisk((c as AppConfig).itemTableFilter),
      taskTableFilter: normalizeTaskTableFilterFromDisk((c as AppConfig).taskTableFilter),
      savedSnapshots: rawSnaps.map((s) => ({ ...s, freezeThroughHeader: s.freezeThroughHeader ?? null })),
      savedTemplates: Array.isArray((c as AppConfig).savedTemplates) ? (c as AppConfig).savedTemplates : [],
      recycledTemplates: Array.isArray((c as AppConfig).recycledTemplates)
        ? (c as AppConfig).recycledTemplates
        : [],
      sendTemplates: Array.isArray((c as AppConfig).sendTemplates) ? (c as AppConfig).sendTemplates : [],
    });
    setConfig({
      ...merged,
      themeAccentHex: normalizeThemeAccentHex((c as AppConfig).themeAccentHex),
      themeBackgroundHex: normalizeThemeBackgroundHex((c as AppConfig).themeBackgroundHex),
      themeWallpaperRelativePath: normalizeThemeWallpaperRelativePath((c as AppConfig).themeWallpaperRelativePath),
      themeWallpaperOpacity: clampThemeWallpaperOpacity((c as AppConfig).themeWallpaperOpacity),
      initialItemFilterSheetShown:
        Boolean((c as AppConfig & { initialFilterHintShown?: boolean }).initialFilterHintShown) ||
        Boolean((c as AppConfig).initialItemFilterSheetShown),
      initialTaskFilterSheetShown:
        Boolean((c as AppConfig & { initialFilterHintShown?: boolean }).initialFilterHintShown) ||
        Boolean((c as AppConfig).initialTaskFilterSheetShown),
      gmtBaseUrl: (c as AppConfig).gmtBaseUrl?.trim() || DEFAULT_GMT_BASE_URL,
      gmtCookie: (c as AppConfig).gmtCookie ?? "",
      gmtEnvId: (c as AppConfig).gmtEnvId ?? null,
      gmtEnvName: (c as AppConfig).gmtEnvName ?? null,
      gmtAccountId: (c as AppConfig).gmtAccountId ?? "",
      gmtTradable: Boolean((c as AppConfig).gmtTradable),
      gmtLockRegion: (c as AppConfig).gmtLockRegion?.trim() || "SG",
      gmtNotiRegion: (c as AppConfig).gmtNotiRegion?.trim() || "SG",
      gtopBaseUrl: (c as AppConfig).gtopBaseUrl?.trim() || DEFAULT_GTOP_BASE_URL,
      gtopCookie: (c as AppConfig).gtopCookie ?? "",
      gtopProject: (c as AppConfig).gtopProject?.trim() || DEFAULT_GTOP_PROJECT,
      gtopEnvId: (c as AppConfig).gtopEnvId ?? null,
      gtopEnvName: (c as AppConfig).gtopEnvName ?? null,
      gtopRegionServerId: (c as AppConfig).gtopRegionServerId ?? null,
      gtopRegionServerName: (c as AppConfig).gtopRegionServerName ?? null,
      itemServerWideSendSettings: normalizeItemServerWideSendSettings((c as AppConfig).itemServerWideSendSettings),
      globalSendLastForm: normalizeGlobalSendLastForm((c as AppConfig).globalSendLastForm),
      excelAutoRefreshIntervalSec: normalizeExcelAutoRefreshIntervalSec(
        (c as AppConfig).excelAutoRefreshIntervalSec,
      ),
      showItemTypeInTable: Boolean((c as AppConfig).showItemTypeInTable),
    });
    const needWizard = !c.excelWorkspaceRoot.trim();
    setWizardOpen(needWizard);
  }, []);

  const loadExcelData = useCallback(
    async (c: AppConfig, messageMode: "fetch" | "refresh" | "silent" = "fetch"): Promise<boolean> => {
      const root = c.excelWorkspaceRoot.trim();
      if (!root) {
        if (messageMode !== "silent") {
          excelLoadMessageModeRef.current = "fetch";
          setLoadError(null);
          setItemAoa(null);
          setTaskAoa(null);
          setItemTypeLookupIndex(EMPTY_ITEM_TYPE_LOOKUP_INDEX);
          setAccountLevelByLevel(null);
          setAccountLevelParseError(null);
        }
        return false;
      }

      if (messageMode === "silent") {
        if (shouldSkipSilentExcelLoad(excelLoadInFlightRef.current)) return false;
        try {
          const fp = await invoke<ExcelWorkspaceMtimeFingerprint>("excel_workspace_mtime_fingerprint", {
            root,
          });
          if (excelFingerprintRef.current && fingerprintsEqual(fp, excelFingerprintRef.current)) {
            return false;
          }
        } catch {
          // 指纹失败时仍尝试读取
        }
        if (shouldSkipSilentExcelLoad(excelLoadInFlightRef.current)) return false;
      } else {
        excelLoadMessageModeRef.current = messageMode;
      }

      const seq = ++excelLoadSeqRef.current;
      excelLoadInFlightRef.current += 1;
      setExcelBackgroundBusy(true);

      if (messageMode !== "silent") {
        setLoadError(null);
        setItemAoa(null);
        setTaskAoa(null);
        setItemTypeLookupIndex(EMPTY_ITEM_TYPE_LOOKUP_INDEX);
        setAccountLevelByLevel(null);
        setAccountLevelParseError(null);
      }

      const applyLatest = (fn: () => void) => {
        if (!isStaleExcelLoadSeq(seq, excelLoadSeqRef.current)) fn();
      };

      const ip = excelItemPath(root);
      const mp = excelMissionPath(root);
      let succeeded = false;
      try {
        const [ib64, mb64] = await Promise.all([
          invoke<string>("read_file_base64", { path: ip }),
          invoke<string>("read_file_base64", { path: mp }),
        ]);
        if (isStaleExcelLoadSeq(seq, excelLoadSeqRef.current)) return false;

        const item = readSheetFromWorkbook(ib64, "Item");
        const task = readSheetFromWorkbook(mb64, "Task");
        const typeLookup = buildItemTypeLookupIndex(
          readOptionalSheetFromWorkbook(ib64, "ItemType"),
          readOptionalSheetFromWorkbook(ib64, "ItemSubType"),
        );
        applyLatest(() => {
          setItemAoa(item);
          setTaskAoa(task);
          setItemTypeLookupIndex(typeLookup);
        });
        const headers = item[0]?.map((h) => cellStr(h)) ?? [];
        const ridx = resolveRemarkColumnIndex(headers, c.itemRemarkColumn);
        applyLatest(() => {
          if (ridx < 0) {
            if (messageMode !== "silent") {
              setRemarkColIndex(-1);
              setColumnPickOpen(true);
            }
          } else {
            setRemarkColIndex(ridx);
          }
        });
        try {
          const accPath = excelAccountPath(root);
          const ab64 = await invoke<string>("read_file_base64", { path: accPath });
          if (isStaleExcelLoadSeq(seq, excelLoadSeqRef.current)) return false;

          const accAoa = readSheetFromWorkbook(ab64, "AccountLevel");
          const parsed = parseAccountLevelSheet(accAoa);
          applyLatest(() => {
            if (parsed.ok) {
              setAccountLevelByLevel(parsed.byLevel);
              setAccountLevelParseError(null);
            } else {
              setAccountLevelByLevel(null);
              setAccountLevelParseError(parsed.error);
            }
          });
        } catch (accE) {
          applyLatest(() => {
            setAccountLevelByLevel(null);
            setAccountLevelParseError(accE instanceof Error ? accE.message : String(accE));
          });
        }
        try {
          const fp = await invoke<ExcelWorkspaceMtimeFingerprint>("excel_workspace_mtime_fingerprint", {
            root,
          });
          if (!isStaleExcelLoadSeq(seq, excelLoadSeqRef.current)) {
            excelFingerprintRef.current = fp;
          }
        } catch {
          if (!isStaleExcelLoadSeq(seq, excelLoadSeqRef.current)) {
            excelFingerprintRef.current = null;
          }
        }
        succeeded = true;
      } catch (e) {
        if (!isStaleExcelLoadSeq(seq, excelLoadSeqRef.current)) {
          const msg = e instanceof Error ? e.message : String(e);
          if (messageMode === "silent") {
            push(`后台同步失败: ${msg}`);
          } else {
            setLoadError(msg);
            push(`读 Excel 失败: ${msg}`);
          }
        }
        return false;
      } finally {
        excelLoadInFlightRef.current = Math.max(0, excelLoadInFlightRef.current - 1);
        if (excelLoadInFlightRef.current === 0) setExcelBackgroundBusy(false);
      }

      return succeeded && !isStaleExcelLoadSeq(seq, excelLoadSeqRef.current);
    },
    [push],
  );

  useEffect(() => {
    void loadConfigFromDisk();
  }, [loadConfigFromDisk]);

  useEffect(() => {
    if (config) setGmtAccountIdDraft(config.gmtAccountId);
  }, [config?.gmtAccountId]);

  useEffect(() => {
    if (!config) return;
    if (gmtAccountIdDraft.trim() === config.gmtAccountId) return;
    const t = window.setTimeout(() => {
      const c = configRef.current;
      if (!c) return;
      void persist({ ...c, gmtAccountId: gmtAccountIdDraftRef.current });
    }, 500);
    return () => window.clearTimeout(t);
  }, [gmtAccountIdDraft, config, persist]);

  useEffect(() => {
    const onFlush = () => flushSessionRef.current();
    window.addEventListener("beforeunload", onFlush);
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        onFlush();
        return;
      }
      if (wizardOpen) return;
      const c = configRef.current;
      if (!c?.excelWorkspaceRoot.trim()) return;
      void loadExcelData(c, "silent");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", onFlush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadExcelData, wizardOpen]);

  const onGmtSessionVerifiedLoggedIn = useCallback(() => {
    setGmtLoggedIn(true);
    setGmtLoginModalOpen(false);
    void gmtCloseLoginWindow();
  }, []);

  const refreshGmtSession = useCallback(
    async (cfg: AppConfig) => {
      setGmtSessionChecking(true);
      try {
        const slice = gmtSessionSliceFromConfig(cfg);
        const r = await gmtSessionProbe(slice);
        setGmtLoggedIn(r.loggedIn);
        if (r.loggedIn) {
          onGmtSessionVerifiedLoggedIn();
          const envs = sortBranchEnvEntries(await gmtFetchEnvs(slice));
          setGmtEnvs(envs);
          const heal = healGmtEnvConfig(
            { gmtEnvId: cfg.gmtEnvId, gmtEnvName: cfg.gmtEnvName },
            envs,
          );
          if (heal.kind === "persist") {
            void persist({ ...cfg, ...heal.next });
            if (heal.toast) push(heal.toast);
          }
        } else {
          setGmtEnvs([]);
        }
      } catch (e) {
        setGmtLoggedIn(false);
        setGmtEnvs([]);
        push(`GMT 登录检查失败: ${e}`);
      } finally {
        setGmtSessionChecking(false);
      }
    },
    [push, onGmtSessionVerifiedLoggedIn, persist],
  );

  const refreshGtopSession = useCallback(async (cfg: AppConfig) => {
    const slice = gtopSessionSliceFromConfig(cfg);
    if (!slice.gtopCookie.trim()) {
      setGtopLoggedIn(false);
      return;
    }
    try {
      const r = await gtopSessionProbe(slice);
      setGtopLoggedIn(r.loggedIn);
    } catch {
      setGtopLoggedIn(false);
    }
  }, []);

  const completeGtopLogin = useCallback(async () => {
    if (!config) return;
    try {
      const cookie = await gtopCollectLoginCookies();
      const next = { ...config, gtopCookie: cookie };
      await persist(next);
      setGtopLoggedIn(true);
      setGtopLoginModalOpen(false);
      await refreshGtopSession(next);
      await gtopCloseLoginWindow();
      push("GTOP 已登录");
    } catch (e) {
      push(`GTOP 登录失败: ${e}`);
    }
  }, [config, persist, push, refreshGtopSession]);

  const openGtopLoginWindow = useCallback(async () => {
    if (!config) return;
    try {
      await gtopOpenLoginWindow(config.gtopBaseUrl);
      setGtopLoginModalOpen(true);
    } catch (e) {
      push(`打开 GTOP 登录窗失败: ${e}`);
    }
  }, [config, push]);

  useEffect(() => {
    if (!config) return;
    void refreshGtopSession(config);
  }, [config?.gtopCookie, config?.gtopBaseUrl, config?.gtopProject, refreshGtopSession, config]);

  const gmtSessionKey = config
    ? `${config.gmtBaseUrl}\0${config.gmtCookie}\0${config.gmtEnvId ?? ""}`
    : "";

  useEffect(() => {
    if (!config || wizardOpen) return;
    void refreshGmtSession(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅 Cookie/登录态变化时探测
  }, [gmtSessionKey, wizardOpen, refreshGmtSession]);

  const ensureGmtLoggedIn = useCallback(async (): Promise<boolean> => {
    if (!config) return false;
    if (gmtLoggedIn && config.gmtCookie.trim()) {
      onGmtSessionVerifiedLoggedIn();
      return true;
    }
    const r = await gmtSessionProbe(gmtSessionSliceFromConfig(config));
    if (r.loggedIn) {
      onGmtSessionVerifiedLoggedIn();
      return true;
    }
    setGmtLoginModalOpen(true);
    return false;
  }, [config, gmtLoggedIn, onGmtSessionVerifiedLoggedIn]);

  const completeGmtLogin = useCallback(async () => {
    if (!config) return;
    try {
      const cookie = await gmtCollectLoginCookies();
      const next = { ...config, gmtCookie: cookie };
      await persist(next);
      onGmtSessionVerifiedLoggedIn();
      await refreshGmtSession(next);
      push("GMT 已退出");
    } catch (e) {
      push(`GMT 登录失败: ${e}`);
    }
  }, [config, persist, push, refreshGmtSession, onGmtSessionVerifiedLoggedIn]);

  const openGmtLoginWindow = useCallback(async () => {
    if (!config) return;
    if (gmtLoggedIn && config.gmtCookie.trim()) {
      onGmtSessionVerifiedLoggedIn();
      push("GMT 已退出");
      return;
    }
    try {
      await gmtOpenLoginWindow(config.gmtBaseUrl);
      setGmtLoginModalOpen(true);
    } catch (e) {
      push(`打开 GMT 登录窗失败: ${e}`);
    }
  }, [config, gmtLoggedIn, push, onGmtSessionVerifiedLoggedIn]);

  const commitGmtAccountIdDraft = useCallback(() => {
    if (!config) return;
    const trimmed = gmtAccountIdDraft.trim();
    if (trimmed === config.gmtAccountId) return;
    void persist({ ...config, gmtAccountId: gmtAccountIdDraft });
  }, [config, gmtAccountIdDraft, persist]);

  const themeAccentHex = config?.themeAccentHex ?? DEFAULT_THEME_ACCENT_HEX;
  const themeBackgroundHex = config?.themeBackgroundHex ?? DEFAULT_THEME_BACKGROUND_HEX;
  const themeWallpaperRelativePath = config?.themeWallpaperRelativePath ?? "";
  const themeWallpaperOpacity = config?.themeWallpaperOpacity ?? 0;

  useEffect(() => {
    applyThemeCssVarsToDocument(themeAccentHex, themeBackgroundHex);
  }, [themeAccentHex, themeBackgroundHex]);

  useEffect(() => {
    let cancelled = false;
    const rel = normalizeThemeWallpaperRelativePath(themeWallpaperRelativePath);
    const op = clampThemeWallpaperOpacity(themeWallpaperOpacity);
    if (!rel) {
      applyWallpaperCssVarsToDocument(null, 0);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const url = await resolveWallpaperAssetUrl(rel);
      if (cancelled) return;
      applyWallpaperCssVarsToDocument(url, op);
    })();
    return () => {
      cancelled = true;
    };
  }, [themeWallpaperRelativePath, themeWallpaperOpacity]);

  const excelWorkspaceRoot = config?.excelWorkspaceRoot.trim() ?? "";

  useEffect(() => {
    if (!config || wizardOpen) return;
    if (!excelWorkspaceRoot) return;
    excelFingerprintRef.current = null;
    void loadExcelData(config, "fetch");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 向导关闭后加载 Excel
  }, [excelWorkspaceRoot, wizardOpen, loadExcelData]);

  useEffect(() => {
    if (!config || wizardOpen) return;
    const sec = normalizeExcelAutoRefreshIntervalSec(config.excelAutoRefreshIntervalSec);
    if (sec <= 0) return;
    if (!excelWorkspaceRoot) return;
    const id = window.setInterval(() => {
      const c = configRef.current;
      if (!c?.excelWorkspaceRoot.trim()) return;
      void loadExcelData(c, "silent");
    }, sec * 1000);
    return () => window.clearInterval(id);
  }, [config?.excelAutoRefreshIntervalSec, excelWorkspaceRoot, wizardOpen, loadExcelData]);

  const savedTemplateIds = useMemo(
    () => (config?.savedTemplates ?? []).map((t) => t.id).join("\0"),
    [config?.savedTemplates],
  );

  useEffect(() => {
    if (!config) return;
    if (activeView.kind !== "template" && activeView.kind !== "snapshot") return;
    const id = activeView.id;
    const exists = config.savedTemplates.some((t) => t.id === id);
    if (!exists) setActiveView({ kind: "item" });
    else if (activeView.kind === "snapshot") setActiveView({ kind: "template", id });
  }, [config, activeView, savedTemplateIds]);

  useEffect(() => {
    if (!hiddenPanel) {
      setHiddenPanelDraft(null);
      return;
    }
    if (!config) return;
    const key = hiddenPanel === "item" ? "hiddenItemColumns" : "hiddenTaskColumns";
    const blocked = hiddenPanel === "item" ? NON_HIDEABLE_ITEM_HEADERS : NON_HIDEABLE_TASK_HEADERS;
    setHiddenPanelDraft([...config[key]].filter((h) => !blocked.has(h)));
  }, [hiddenPanel]);

  const currentAoa = useMemo(() => {
    if (!config) return null;
    if (activeView.kind === "template" || activeView.kind === "snapshot") {
      const tpl = config.savedTemplates.find((t) => t.id === activeView.id);
      return tpl?.aoa ?? null;
    }
    return activeView.kind === "item" ? itemAoa : taskAoa;
  }, [activeView, itemAoa, taskAoa, config]);

  const isItemTableView = useMemo(() => {
    if (activeView.kind === "addExp") return false;
    if (activeView.kind === "item") return true;
    if (activeView.kind === "task") return false;
    if (!config) return false;
    return config.savedTemplates.find((t) => t.id === activeView.id)?.source === "item";
  }, [activeView, config]);

  const isTaskTableView = useMemo(() => {
    if (activeView.kind === "addExp") return false;
    if (activeView.kind === "task") return true;
    if (activeView.kind === "item") return false;
    if (!config) return false;
    return config.savedTemplates.find((t) => t.id === activeView.id)?.source === "task";
  }, [activeView, config]);

  const gmtEnvDisplayLabelMap = useMemo(
    () => buildBranchEnvDisplayLabelMap(gmtEnvs),
    [gmtEnvs],
  );

  const resolveGmtEnvDisplayLabel = useCallback(
    (cfg: Pick<AppConfig, "gmtEnvId" | "gmtEnvName">) => {
      if (cfg.gmtEnvId == null) return undefined;
      const env = gmtEnvs.find((e) => e.id === cfg.gmtEnvId);
      if (!env) return undefined;
      return formatBranchEnvOptionLabel(env.name, env.id, gmtEnvDisplayLabelMap);
    },
    [gmtEnvs, gmtEnvDisplayLabelMap],
  );

  const gmtItemSendReadiness = useMemo(
    () =>
      evaluateGmtItemSendReadiness({
        gmtSessionChecking,
        gmtLoggedIn,
        gmtEnvName: config?.gmtEnvName,
        gmtEnvId: config?.gmtEnvId,
        gmtAccountId: gmtAccountIdDraft,
        selectedRows,
        currentAoa,
      }),
    [
      gmtSessionChecking,
      gmtLoggedIn,
      config?.gmtEnvName,
      config?.gmtEnvId,
      gmtAccountIdDraft,
      selectedRows,
      currentAoa,
    ],
  );

  const gmtTaskSendReadiness = useMemo(() => {
    void selectedRowOrder;
    return evaluateGmtTaskSendReadiness({
      gmtSessionChecking,
      gmtLoggedIn,
      gmtEnvName: config?.gmtEnvName,
      gmtEnvId: config?.gmtEnvId,
      gmtAccountId: gmtAccountIdDraft,
      selectedRows,
      currentAoa,
    });
  }, [
    gmtSessionChecking,
    gmtLoggedIn,
    config?.gmtEnvName,
    config?.gmtEnvId,
    gmtAccountIdDraft,
    selectedRows,
    selectedRowOrder,
    currentAoa,
  ]);

  const hiddenSet = useMemo(() => {
    if (activeView.kind === "addExp") return new Set<string>();
    if (activeView.kind === "template" || activeView.kind === "snapshot") return new Set<string>();
    const arr = activeView.kind === "item" ? config?.hiddenItemColumns ?? [] : config?.hiddenTaskColumns ?? [];
    const blocked = activeView.kind === "item" ? NON_HIDEABLE_ITEM_HEADERS : NON_HIDEABLE_TASK_HEADERS;
    return new Set(arr.filter((h) => !blocked.has(h)));
  }, [activeView, config]);

  const headers = useMemo(() => {
    if (!currentAoa?.length) return [] as string[];
    return (currentAoa[0] ?? []).map((h) => cellStr(h));
  }, [currentAoa]);

  const visibleColIndices = useMemo(() => {
    return headers.map((h, i) => (hiddenSet.has(h) ? -1 : i)).filter((i) => i >= 0);
  }, [headers, hiddenSet]);

  useEffect(() => {
    setTableSort(null);
  }, [activeView.kind, activeView.kind === "snapshot" ? activeView.id : ""]);

  useEffect(() => {
    if (!isItemTableView) {
      setItemLineQty({});
      return;
    }
    setItemLineQty((q) => {
      const next = { ...q };
      let changed = false;
      for (const k of Object.keys(next).map(Number)) {
        if (!selectedRows.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      for (const di of selectedRows) {
        const v = next[di];
        if (v == null || v < 1) {
          next[di] = 1;
          changed = true;
        }
      }
      return changed ? next : q;
    });
  }, [selectedRows, isItemTableView]);

  const baseBodyRows = useMemo(() => {
    if (!currentAoa || currentAoa.length < 2) return [] as { row: unknown[]; dataIdx: number }[];
    return currentAoa.slice(1).map((row, i) => ({
      row: (row ?? []) as unknown[],
      dataIdx: i,
    }));
  }, [currentAoa]);

  const tableSheetSource = useMemo(
    () => (config ? getCurrentTableSource(activeView, config) : null),
    [config, activeView],
  );

  const dataBodyRows = useMemo(() => {
    if (tableSheetSource !== "item" && tableSheetSource !== "task") return baseBodyRows;
    if (!currentAoa) return baseBodyRows;
    return baseBodyRows.filter(({ dataIdx }) =>
      isDisplayableTableBodyRow(currentAoa, dataIdx, tableSheetSource),
    );
  }, [baseBodyRows, currentAoa, tableSheetSource]);

  const itemFilterColIdx = useMemo(() => {
    if (!isItemTableView || !headers.length) return { tr: -1, def: -1, qual: -1, remark: -1, season: -1 };
    return {
      tr: resolveTypeRemarkColumnIndex(headers),
      def: resolveDefenseValueColumnIndex(headers),
      qual: resolveItemQualityColumnIndex(headers),
      remark: resolveRemarkColumnIndex(headers, config?.itemRemarkColumn ?? null),
      season: resolveSeasonItemColumnIndex(headers),
    };
  }, [isItemTableView, headers, config?.itemRemarkColumn]);

  const itemIdColIndex = useMemo(() => {
    if (!isItemTableView || !headers.length) return -1;
    return resolveItemIdColumnIndex(headers);
  }, [isItemTableView, headers]);

  const itemTypeColIndex = useMemo(() => {
    if (!isItemTableView || !headers.length) return -1;
    return resolveItemRowTypeColumnIndex(headers);
  }, [isItemTableView, headers]);

  const itemSubTypeColIndex = useMemo(() => {
    if (!isItemTableView || !headers.length) return -1;
    return resolveItemRowSubTypeColumnIndex(headers);
  }, [isItemTableView, headers]);

  const itemFilterOptions = useMemo(() => {
    if (!isItemTableView || !currentAoa || currentAoa.length < 2) {
      return { typeRemark: [] as string[], quality: [] as string[] };
    }
    const typeSet = new Set<string>();
    const qualSet = new Set<string>();
    for (let i = 1; i < currentAoa.length; i++) {
      const dataIdx = i - 1;
      if (!isDisplayableTableBodyRow(currentAoa, dataIdx, "item")) continue;
      const row = (currentAoa[i] ?? []) as unknown[];
      if (itemFilterColIdx.tr >= 0) {
        const trKey = typeRemarkFilterKey(row[itemFilterColIdx.tr]);
        if (!isDaHongJianShiEmoteTypeRemark(trKey)) typeSet.add(trKey);
      }
      if (itemFilterColIdx.qual >= 0) qualSet.add(itemQualityFilterBucket(row[itemFilterColIdx.qual]));
    }
    return { typeRemark: [...typeSet], quality: [...qualSet] };
  }, [isItemTableView, currentAoa, itemFilterColIdx]);

  const taskFilterColIdx = useMemo(() => {
    if (isItemTableView || !headers.length) return { tt: -1, ch: -1 };
    return {
      tt: resolveTaskTypeColumnIndex(headers),
      ch: resolveTaskChainColumnIndex(headers),
    };
  }, [isItemTableView, headers]);

  const taskFilterOptions = useMemo(() => {
    if (isItemTableView || !isTaskTableView || !currentAoa || currentAoa.length < 2) {
      return { taskType: [] as string[], chain: [] as string[] };
    }
    const ttSet = new Set<string>();
    const chSet = new Set<string>();
    for (let i = 1; i < currentAoa.length; i++) {
      const dataIdx = i - 1;
      if (!isDisplayableTableBodyRow(currentAoa, dataIdx, "task")) continue;
      const row = (currentAoa[i] ?? []) as unknown[];
      if (taskFilterColIdx.tt >= 0) ttSet.add(taskTypeFilterKey(row[taskFilterColIdx.tt]));
      if (taskFilterColIdx.ch >= 0) {
        const ck = taskChainFilterKey(row[taskFilterColIdx.ch]);
        if (ck != null) chSet.add(ck);
      }
    }
    return { taskType: [...ttSet], chain: [...chSet] };
  }, [isItemTableView, isTaskTableView, currentAoa, taskFilterColIdx]);

  const itemTypeRemarkDisplayKeys = useMemo(() => {
    if (itemFilterColIdx.remark < 0 && itemFilterColIdx.tr < 0) return [];
    if (itemFilterColIdx.remark < 0) {
      const merged = mergeKeyOrder(
        itemFilterOptions.typeRemark,
        itemFilterDraft.typeRemarkKeyOrder ?? null,
        sortTypeRemarkRest,
      );
      return merged.filter((k) => k !== ITEM_TYPE_REMARK_PRESET_EMOTE);
    }
    const merged = mergeKeyOrder(itemFilterOptions.typeRemark, itemFilterDraft.typeRemarkKeyOrder ?? null, sortTypeRemarkRest);
    const rest = itemFilterColIdx.tr >= 0 ? merged.filter((k) => k !== ITEM_TYPE_REMARK_PRESET_EMOTE) : [];
    return [ITEM_TYPE_REMARK_PRESET_EMOTE, ...rest];
  }, [itemFilterOptions.typeRemark, itemFilterDraft.typeRemarkKeyOrder, itemFilterColIdx.tr, itemFilterColIdx.remark]);
  const itemQualityDisplayKeys = useMemo(
    () => mergeKeyOrder(itemFilterOptions.quality, itemFilterDraft.qualityKeyOrder ?? null, sortQualityRest),
    [itemFilterOptions.quality, itemFilterDraft.qualityKeyOrder],
  );

  const itemTypeRemarkAllKeys = useMemo(() => {
    if (itemFilterColIdx.remark < 0 && itemFilterColIdx.tr < 0) return [];
    if (itemFilterColIdx.remark < 0) {
      const merged = mergeKeyOrder(
        itemFilterOptions.typeRemark,
        config?.itemTableFilter?.typeRemarkKeyOrder ?? null,
        sortTypeRemarkRest,
      );
      return merged.filter((k) => k !== ITEM_TYPE_REMARK_PRESET_EMOTE);
    }
    const merged = mergeKeyOrder(
      itemFilterOptions.typeRemark,
      config?.itemTableFilter?.typeRemarkKeyOrder ?? null,
      sortTypeRemarkRest,
    );
    const rest = itemFilterColIdx.tr >= 0 ? merged.filter((k) => k !== ITEM_TYPE_REMARK_PRESET_EMOTE) : [];
    return [ITEM_TYPE_REMARK_PRESET_EMOTE, ...rest];
  }, [itemFilterOptions.typeRemark, config?.itemTableFilter?.typeRemarkKeyOrder, itemFilterColIdx.tr, itemFilterColIdx.remark]);

  const itemQualityAllKeys = useMemo(
    () => mergeKeyOrder(itemFilterOptions.quality, config?.itemTableFilter?.qualityKeyOrder ?? null, sortQualityRest),
    [itemFilterOptions.quality, config?.itemTableFilter?.qualityKeyOrder],
  );

  const chipTypeRemarkPinnedBase = useMemo(() => {
    return TYPE_REMARK_PINNED_KEYS.filter((k) => {
      if (k === ITEM_TYPE_REMARK_PRESET_EMOTE) return itemFilterColIdx.remark >= 0;
      return itemFilterColIdx.tr >= 0;
    });
  }, [itemFilterColIdx.tr, itemFilterColIdx.remark]);

  const chipTypeRemarkBarValidKeys = useMemo(() => {
    const keys = [...itemTypeRemarkAllKeys];
    if (itemFilterColIdx.season >= 0) keys.push(SEASON_ITEM_CHIP_KEY);
    return keys;
  }, [itemTypeRemarkAllKeys, itemFilterColIdx.season]);

  const chipTypeRemarkPinned = useMemo(() => {
    const saved = config?.itemTableFilter?.chipBarTypeRemarkOrder;
    const allSet = new Set(chipTypeRemarkBarValidKeys);
    if (saved?.length) {
      return saved.filter((k) => allSet.has(k));
    }
    const typeRemarkSet = new Set(itemTypeRemarkAllKeys);
    return chipTypeRemarkPinnedBase.filter((k) => typeRemarkSet.has(k));
  }, [
    chipTypeRemarkBarValidKeys,
    itemTypeRemarkAllKeys,
    chipTypeRemarkPinnedBase,
    config?.itemTableFilter?.chipBarTypeRemarkOrder,
  ]);

  const chipQualityBarKeys = useMemo(() => {
    const saved = config?.itemTableFilter?.chipBarQualityOrder;
    if (saved?.length) {
      const allSet = new Set(itemQualityAllKeys);
      return saved.filter((k) => allSet.has(k));
    }
    return mergeKeyOrder(itemQualityAllKeys, null, sortQualityRest);
  }, [itemQualityAllKeys, config?.itemTableFilter?.chipBarQualityOrder]);

  const chipTypeRemarkMore = useMemo(() => {
    const pin = new Set<string>(chipTypeRemarkPinned);
    return chipTypeRemarkBarValidKeys.filter((k) => !pin.has(k));
  }, [chipTypeRemarkBarValidKeys, chipTypeRemarkPinned]);

  const itemCustomKeywordAll = useMemo(
    () => allCustomKeywordKeys(config?.itemTableFilter ?? emptyItemTableFilter()),
    [config?.itemTableFilter],
  );

  const chipItemCustomKeywordPinned = useMemo(() => {
    const allSet = new Set(itemCustomKeywordAll);
    const saved = config?.itemTableFilter?.chipBarCustomKeywordOrder;
    if (saved?.length) return saved.filter((k) => allSet.has(k));
    return [];
  }, [itemCustomKeywordAll, config?.itemTableFilter?.chipBarCustomKeywordOrder]);

  const chipItemCustomKeywordMore = useMemo(() => {
    const pin = new Set(chipItemCustomKeywordPinned);
    return itemCustomKeywordAll.filter((k) => !pin.has(k));
  }, [itemCustomKeywordAll, chipItemCustomKeywordPinned]);

  const chipTaskTypeOptions = useMemo(
    () =>
      mergeKeyOrder(
        taskFilterOptions.taskType,
        config?.taskTableFilter?.taskTypeKeyOrder ?? null,
        sortTaskTypeRest,
      ),
    [taskFilterOptions.taskType, config?.taskTableFilter?.taskTypeKeyOrder],
  );

  const chipChainOptions = useMemo(
    () => mergeKeyOrder(taskFilterOptions.chain, config?.taskTableFilter?.chainKeyOrder ?? null, sortChainRest),
    [taskFilterOptions.chain, config?.taskTableFilter?.chainKeyOrder],
  );

  const chipTaskTypePinnedBase = useMemo(
    () => chipTaskTypeOptions.slice(0, TASK_TYPE_CHIP_PINNED_COUNT),
    [chipTaskTypeOptions],
  );

  const chipTaskTypePinned = useMemo(() => {
    const saved = config?.taskTableFilter?.chipBarTaskTypeOrder;
    const allSet = new Set(chipTaskTypeOptions);
    if (saved?.length) {
      return saved.filter((k) => allSet.has(k));
    }
    return chipTaskTypePinnedBase.filter((k) => allSet.has(k));
  }, [chipTaskTypeOptions, chipTaskTypePinnedBase, config?.taskTableFilter?.chipBarTaskTypeOrder]);

  const chipTaskTypeMore = useMemo(() => {
    const pin = new Set(chipTaskTypePinned);
    return chipTaskTypeOptions.filter((k) => !pin.has(k));
  }, [chipTaskTypeOptions, chipTaskTypePinned]);

  const chipChainPinned = useMemo(() => {
    const saved = config?.taskTableFilter?.chipBarChainOrder;
    const allSet = new Set(chipChainOptions);
    if (saved?.length) {
      return saved.filter((k) => allSet.has(k));
    }
    return chipChainOptions.slice(0, TASK_CHAIN_CHIP_PINNED_COUNT).filter((k) => allSet.has(k));
  }, [chipChainOptions, config?.taskTableFilter?.chipBarChainOrder]);

  const chipChainMore = useMemo(() => {
    const pin = new Set(chipChainPinned);
    return chipChainOptions.filter((k) => !pin.has(k));
  }, [chipChainOptions, chipChainPinned]);

  const taskCustomKeywordAll = useMemo(
    () => allCustomKeywordKeys(config?.taskTableFilter ?? emptyTaskTableFilter()),
    [config?.taskTableFilter],
  );

  const chipTaskCustomKeywordPinned = useMemo(() => {
    const allSet = new Set(taskCustomKeywordAll);
    const saved = config?.taskTableFilter?.chipBarCustomKeywordOrder;
    if (saved?.length) return saved.filter((k) => allSet.has(k));
    return [];
  }, [taskCustomKeywordAll, config?.taskTableFilter?.chipBarCustomKeywordOrder]);

  const chipTaskCustomKeywordMore = useMemo(() => {
    const pin = new Set(chipTaskCustomKeywordPinned);
    return taskCustomKeywordAll.filter((k) => !pin.has(k));
  }, [taskCustomKeywordAll, chipTaskCustomKeywordPinned]);

  const taskTypeDisplayKeys = useMemo(
    () => mergeKeyOrder(taskFilterOptions.taskType, taskFilterDraft.taskTypeKeyOrder ?? null, sortTaskTypeRest),
    [taskFilterOptions.taskType, taskFilterDraft.taskTypeKeyOrder],
  );
  const taskChainDisplayKeys = useMemo(
    () => mergeKeyOrder(taskFilterOptions.chain, taskFilterDraft.chainKeyOrder ?? null, sortChainRest),
    [taskFilterOptions.chain, taskFilterDraft.chainKeyOrder],
  );

  const itemFilterSectionOrder = useMemo(
    () => mergeItemSectionOrder(itemFilterDraft.sectionOrder),
    [itemFilterDraft.sectionOrder],
  );
  const taskFilterSectionOrder = useMemo(
    () => mergeTaskSectionOrder(taskFilterDraft.sectionOrder),
    [taskFilterDraft.sectionOrder],
  );

  const activeItemTableFilter = useMemo(() => {
    if (!isItemTableView) return null;
    if (itemFilterModalOpen) return itemFilterDraft;
    return config?.itemTableFilter ?? null;
  }, [isItemTableView, itemFilterModalOpen, itemFilterDraft, config?.itemTableFilter]);

  const activeTaskTableFilter = useMemo(() => {
    if (!isTaskTableView) return null;
    if (taskFilterModalOpen) return taskFilterDraft;
    return config?.taskTableFilter ?? null;
  }, [isTaskTableView, taskFilterModalOpen, taskFilterDraft, config?.taskTableFilter]);

  const activeItemFilterForChip = useMemo(
    () => (activeItemTableFilter ? cloneItemTableFilter(activeItemTableFilter) : emptyItemTableFilter()),
    [activeItemTableFilter],
  );

  const chipTypeRemarkSelectedKeys = useMemo(() => {
    const keys = [...activeItemFilterForChip.typeRemarkKeys];
    if (activeItemFilterForChip.seasonItemOnly) keys.push(SEASON_ITEM_CHIP_KEY);
    return keys;
  }, [activeItemFilterForChip.typeRemarkKeys, activeItemFilterForChip.seasonItemOnly]);

  const activeTaskFilterForChip = useMemo(
    () => (activeTaskTableFilter ? cloneTaskTableFilter(activeTaskTableFilter) : emptyTaskTableFilter()),
    [activeTaskTableFilter],
  );

  const filteredBodyRows = useMemo(() => {
    if (isItemTableView) {
      if (itemTableFilterIsInactive(activeItemTableFilter)) return dataBodyRows;
      const f = activeItemTableFilter!;
      return dataBodyRows.filter(({ row }) => rowPassesItemTableFilter(row, f, itemFilterColIdx));
    }
    if (taskTableFilterIsInactive(activeTaskTableFilter)) return dataBodyRows;
    const tf = activeTaskTableFilter!;
    return dataBodyRows.filter(({ row }) => rowPassesTaskTableFilter(row, tf, taskFilterColIdx));
  }, [
    dataBodyRows,
    isItemTableView,
    isTaskTableView,
    activeItemTableFilter,
    activeTaskTableFilter,
    itemFilterColIdx,
    taskFilterColIdx,
  ]);

  const pinActive = isItemTableView
    ? pinnedRowOrder.item.length > 0
    : isTaskTableView
      ? pinnedRowOrder.task.length > 0
      : false;

  const displayBodyRows = useMemo(() => {
    let rows = filteredBodyRows;
    if (tableSort) {
      const { colIndex, descending } = tableSort;
      const dir = descending ? -1 : 1;
      rows = [...filteredBodyRows].sort((x, y) => dir * compareDataCells(x.row[colIndex], y.row[colIndex]));
    }

    const order = isItemTableView ? pinnedRowOrder.item : isTaskTableView ? pinnedRowOrder.task : [];
    return order.length ? partitionRowsByPinOrder(rows, order) : rows;
  }, [
    filteredBodyRows,
    tableSort,
    isItemTableView,
    isTaskTableView,
    pinnedRowOrder.item,
    pinnedRowOrder.task,
  ]);

  const visibleDataIdxs = useMemo(() => displayBodyRows.map((r) => r.dataIdx), [displayBodyRows]);

  const selectableVisibleDataIdxs = useMemo(() => {
    if (!currentAoa?.length) return [] as number[];
    if (isItemTableView) {
      return visibleDataIdxs.filter((di) => isSelectableTableDataRow(currentAoa, di, "item"));
    }
    if (isTaskTableView) {
      return visibleDataIdxs.filter((di) => isSelectableTableDataRow(currentAoa, di, "task"));
    }
    return visibleDataIdxs;
  }, [visibleDataIdxs, currentAoa, isItemTableView, isTaskTableView]);

  const visibleSelectedCount = useMemo(() => {
    let n = 0;
    for (const di of selectableVisibleDataIdxs) {
      if (selectedRows.has(di)) n++;
    }
    return n;
  }, [selectableVisibleDataIdxs, selectedRows]);

  const allVisibleSelected =
    selectableVisibleDataIdxs.length > 0 &&
    selectableVisibleDataIdxs.every((di) => selectedRows.has(di));
  const someVisibleSelected = selectableVisibleDataIdxs.some((di) => selectedRows.has(di));

  const openTableFilterModal = useCallback(() => {
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
  }, [config, isItemTableView, isTaskTableView]);

  const dismissItemFilterModal = useCallback(() => {
    if (itemFilterChipSaveHintTimerRef.current) {
      clearTimeout(itemFilterChipSaveHintTimerRef.current);
      itemFilterChipSaveHintTimerRef.current = null;
    }
    setItemFilterChipSaveHint(null);
    setItemFilterModalOpen(false);
  }, []);

  const dismissTaskFilterModal = useCallback(() => {
    if (taskFilterChipSaveHintTimerRef.current) {
      clearTimeout(taskFilterChipSaveHintTimerRef.current);
      taskFilterChipSaveHintTimerRef.current = null;
    }
    setTaskFilterChipSaveHint(null);
    setTaskFilterModalOpen(false);
  }, []);

  const showItemFilterChipSaveHint = useCallback((message: string) => {
    if (itemFilterChipSaveHintTimerRef.current) clearTimeout(itemFilterChipSaveHintTimerRef.current);
    setItemFilterChipSaveHint(message);
    itemFilterChipSaveHintTimerRef.current = setTimeout(() => {
      setItemFilterChipSaveHint(null);
      itemFilterChipSaveHintTimerRef.current = null;
    }, 3000);
  }, []);

  const showTaskFilterChipSaveHint = useCallback((message: string) => {
    if (taskFilterChipSaveHintTimerRef.current) clearTimeout(taskFilterChipSaveHintTimerRef.current);
    setTaskFilterChipSaveHint(message);
    taskFilterChipSaveHintTimerRef.current = setTimeout(() => {
      setTaskFilterChipSaveHint(null);
      taskFilterChipSaveHintTimerRef.current = null;
    }, 3000);
  }, []);

  const commitItemFilterSave = useCallback(
    (draftOverride?: ItemTableFilter, opts?: { keepModalOpen?: boolean; immediate?: boolean }) => {
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
      if (d.typeRemarkKeys.includes(ITEM_TYPE_REMARK_PRESET_EMOTE) && itemFilterColIdx.remark >= 0) {
        const emoteHits = dataBodyRows.filter(({ row }) => rowMatchesEmotePreset(row[itemFilterColIdx.remark])).length;
        if (emoteHits === 0) {
          push("无匹配的 Emote 行，请检查「备注」列是否含 Emote");
          return;
        }
      }
      const nextFilter = itemTableFilterIsInactive(d) && !hasCustomItemKeyOrder(d) ? null : d;
      const visible =
        nextFilter == null
          ? new Set(dataBodyRows.map((r) => r.dataIdx))
          : new Set(
              dataBodyRows
                .filter(({ row }) => rowPassesItemTableFilter(row, nextFilter, itemFilterColIdx))
                .map((r) => r.dataIdx),
            );
      if (!opts?.keepModalOpen) setItemFilterModalOpen(false);
      const applyFilterUpdate = () => {
        setConfig((c) => (c ? { ...c, itemTableFilter: nextFilter } : c));
        setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
        setSelectedRowOrder((order) => order.filter((di) => visible.has(di)));
      };
      if (opts?.immediate) {
        applyFilterUpdate();
      } else {
        startTransition(applyFilterUpdate);
      }
      void saveItemTableFilterToDisk(nextFilter).catch((e) => push(`筛选保存失败: ${e}`));
    },
    [config, itemFilterDraft, dataBodyRows, itemFilterColIdx, saveItemTableFilterToDisk, push],
  );

  const updateItemFilterPersist = useCallback(
    (updater: (prev: ItemTableFilter) => ItemTableFilter) => {
      setConfig((c) => {
        if (!c) return c;
        const base = c.itemTableFilter ? cloneItemTableFilter(c.itemTableFilter) : emptyItemTableFilter();
        const next = updater(base);
        if (itemFilterModalOpen) setItemFilterDraft(next);
        const d = next;
        if (d.defenseRange) {
          if (d.defenseMin === null && d.defenseMax === null) {
            queueMicrotask(() => push("请填写防护值范围的最小值或最大值"));
            return c;
          }
          if (d.defenseMin !== null && d.defenseMax !== null && d.defenseMin > d.defenseMax) {
            queueMicrotask(() => push("请填写防护值范围的最小值或最大值"));
            return c;
          }
        }
        if (d.typeRemarkKeys.includes(ITEM_TYPE_REMARK_PRESET_EMOTE) && itemFilterColIdx.remark >= 0) {
          const emoteHits = dataBodyRows.filter(({ row }) =>
            rowMatchesEmotePreset(row[itemFilterColIdx.remark]),
          ).length;
          if (emoteHits === 0) {
            queueMicrotask(() => push("无匹配的 Emote 行，请检查「备注」列是否含 Emote"));
            return c;
          }
        }
        const nextFilter = itemTableFilterIsInactive(d) && !hasCustomItemKeyOrder(d) ? null : d;
        const visible =
          nextFilter == null
            ? new Set(dataBodyRows.map((r) => r.dataIdx))
            : new Set(
                dataBodyRows
                  .filter(({ row }) => rowPassesItemTableFilter(row, nextFilter, itemFilterColIdx))
                  .map((r) => r.dataIdx),
              );
        queueMicrotask(() => {
          void saveItemTableFilterToDisk(nextFilter).catch((e) => push(`筛选保存失败: ${e}`));
        });
        startTransition(() => {
          setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
        setSelectedRowOrder((order) => order.filter((di) => visible.has(di)));
        });
        return { ...c, itemTableFilter: nextFilter };
      });
    },
    [itemFilterModalOpen, dataBodyRows, itemFilterColIdx, saveItemTableFilterToDisk, push],
  );

  const toggleItemFilterTypeRemarkKey = useCallback(
    (key: string) => {
      updateItemFilterPersist((d) => {
        const s = new Set(d.typeRemarkKeys);
        if (s.has(key)) s.delete(key);
        else s.add(key);
        return { ...d, typeRemarkKeys: [...s] };
      });
    },
    [updateItemFilterPersist],
  );

  const toggleItemFilterQualityKey = useCallback(
    (key: string) => {
      updateItemFilterPersist((d) => {
        const s = new Set(d.qualityKeys);
        if (s.has(key)) s.delete(key);
        else s.add(key);
        return { ...d, qualityKeys: [...s] };
      });
    },
    [updateItemFilterPersist],
  );

  const toggleItemFilterCustomKeywordKey = useCallback(
    (key: string) => {
      updateItemFilterPersist((d) => {
        const s = new Set(d.customKeywordKeys);
        if (s.has(key)) s.delete(key);
        else s.add(key);
        return { ...d, customKeywordKeys: [...s] };
      });
    },
    [updateItemFilterPersist],
  );

  const removeItemCustomKeyword = useCallback(
    (key: string) => {
      if (!window.confirm(`确定删除自定义筛选项「${key}」？删除后需重新保存。`)) return;
      updateItemFilterPersist((d) => {
        const saved = (d.savedCustomKeywords ?? []).filter((k) => k !== key);
        const barOrder = (d.chipBarCustomKeywordOrder ?? []).filter((k) => k !== key);
        return {
          ...d,
          savedCustomKeywords: saved.length ? saved : null,
          chipBarCustomKeywordOrder: barOrder.length ? barOrder : null,
          customKeywordKeys: d.customKeywordKeys.filter((k) => k !== key),
        };
      });
    },
    [updateItemFilterPersist],
  );

  const clearItemFilterCustomKeywords = useCallback(() => {
    updateItemFilterPersist((d) => ({ ...d, customKeywordKeys: [] }));
  }, [updateItemFilterPersist]);

  const clearItemFilterTypeRemark = useCallback(() => {
    updateItemFilterPersist((d) => ({ ...d, typeRemarkKeys: [], seasonItemOnly: false }));
  }, [updateItemFilterPersist]);

  const clearItemFilterQuality = useCallback(() => {
    updateItemFilterPersist((d) => ({ ...d, qualityKeys: [] }));
  }, [updateItemFilterPersist]);

  const toggleItemFilterSeasonItem = useCallback(() => {
    updateItemFilterPersist((d) => ({ ...d, seasonItemOnly: !d.seasonItemOnly }));
  }, [updateItemFilterPersist]);

  const toggleItemFilterTypeRemarkChip = useCallback(
    (key: string) => {
      if (key === SEASON_ITEM_CHIP_KEY) toggleItemFilterSeasonItem();
      else toggleItemFilterTypeRemarkKey(key);
    },
    [toggleItemFilterSeasonItem, toggleItemFilterTypeRemarkKey],
  );

  const updateTaskFilterPersist = useCallback(
    (updater: (prev: TaskTableFilter) => TaskTableFilter) => {
      setConfig((c) => {
        if (!c) return c;
        const base = c.taskTableFilter ? cloneTaskTableFilter(c.taskTableFilter) : emptyTaskTableFilter();
        const next = updater(base);
        if (taskFilterModalOpen) setTaskFilterDraft(next);
        const nextFilter = taskTableFilterIsInactive(next) && !hasCustomTaskKeyOrder(next) ? null : next;
        const visible =
          nextFilter == null
            ? new Set(dataBodyRows.map((r) => r.dataIdx))
            : new Set(
                dataBodyRows
                  .filter(({ row }) => rowPassesTaskTableFilter(row, nextFilter, taskFilterColIdx))
                  .map((r) => r.dataIdx),
              );
        queueMicrotask(() => {
          void saveTaskTableFilterToDisk(nextFilter).catch((e) => push(`筛选保存失败: ${e}`));
        });
        startTransition(() => {
          setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
        setSelectedRowOrder((order) => order.filter((di) => visible.has(di)));
        });
        return { ...c, taskTableFilter: nextFilter };
      });
    },
    [taskFilterModalOpen, dataBodyRows, taskFilterColIdx, saveTaskTableFilterToDisk, push],
  );

  const toggleTaskFilterTaskTypeKey = useCallback(
    (key: string) => {
      updateTaskFilterPersist((d) => {
        const s = new Set(d.taskTypeKeys);
        if (s.has(key)) s.delete(key);
        else s.add(key);
        return { ...d, taskTypeKeys: [...s] };
      });
    },
    [updateTaskFilterPersist],
  );

  const toggleTaskFilterChainKey = useCallback(
    (key: string) => {
      updateTaskFilterPersist((d) => {
        const s = new Set(d.chainKeys);
        if (s.has(key)) s.delete(key);
        else s.add(key);
        return { ...d, chainKeys: [...s] };
      });
    },
    [updateTaskFilterPersist],
  );

  const toggleTaskFilterCustomKeywordKey = useCallback(
    (key: string) => {
      updateTaskFilterPersist((d) => {
        const s = new Set(d.customKeywordKeys);
        if (s.has(key)) s.delete(key);
        else s.add(key);
        return { ...d, customKeywordKeys: [...s] };
      });
    },
    [updateTaskFilterPersist],
  );

  const clearTaskFilterCustomKeywords = useCallback(() => {
    updateTaskFilterPersist((d) => ({ ...d, customKeywordKeys: [] }));
  }, [updateTaskFilterPersist]);

  const clearTaskFilterTaskType = useCallback(() => {
    updateTaskFilterPersist((d) => ({ ...d, taskTypeKeys: [] }));
  }, [updateTaskFilterPersist]);

  const clearTaskFilterChain = useCallback(() => {
    updateTaskFilterPersist((d) => ({ ...d, chainKeys: [] }));
  }, [updateTaskFilterPersist]);

  const removeTaskCustomKeyword = useCallback(
    (key: string) => {
      if (!window.confirm(`确定删除自定义筛选项「${key}」？删除后需重新保存。`)) return;
      updateTaskFilterPersist((d) => {
        const saved = (d.savedCustomKeywords ?? []).filter((k) => k !== key);
        const barOrder = (d.chipBarCustomKeywordOrder ?? []).filter((k) => k !== key);
        return {
          ...d,
          savedCustomKeywords: saved.length ? saved : null,
          chipBarCustomKeywordOrder: barOrder.length ? barOrder : null,
          customKeywordKeys: d.customKeywordKeys.filter((k) => k !== key),
        };
      });
    },
    [updateTaskFilterPersist],
  );

  const persistSaveCustomKeyword = useCallback((d: ItemTableFilter, q: string): ItemTableFilter => {
    let saved = d.savedCustomKeywords?.length ? [...d.savedCustomKeywords] : [];
    if (!saved.includes(q)) saved = [q, ...saved];
    else saved = [q, ...saved.filter((k) => k !== q)];
    const barOrder = sanitizeChipBarOrder(
      [q, ...(d.chipBarCustomKeywordOrder ?? []).filter((k) => k !== q)],
      saved,
    );
    const sel = new Set(d.customKeywordKeys);
    sel.add(q);
    return {
      ...d,
      rowKeyword: null,
      savedCustomKeywords: saved,
      chipBarCustomKeywordOrder: barOrder,
      customKeywordKeys: [...sel],
    };
  }, []);

  const persistSaveCustomKeywordTask = useCallback((d: TaskTableFilter, q: string): TaskTableFilter => {
    let saved = d.savedCustomKeywords?.length ? [...d.savedCustomKeywords] : [];
    if (!saved.includes(q)) saved = [q, ...saved];
    else saved = [q, ...saved.filter((k) => k !== q)];
    const barOrder = sanitizeChipBarOrder(
      [q, ...(d.chipBarCustomKeywordOrder ?? []).filter((k) => k !== q)],
      saved,
    );
    const sel = new Set(d.customKeywordKeys);
    sel.add(q);
    return {
      ...d,
      rowKeyword: null,
      savedCustomKeywords: saved,
      chipBarCustomKeywordOrder: barOrder,
      customKeywordKeys: [...sel],
    };
  }, []);

  const saveItemCustomKeywordFromDraft = useCallback(() => {
    const q = itemFilterQuickQuery.trim();
    if (!q) {
      push("请输入搜索关键字");
      return;
    }
    const hasMatch = dataBodyRows.some(({ row }) => rowMatchesKeyword(row, q));
    if (!hasMatch) {
      push("无包含该关键字的行");
      return;
    }
    const next = persistSaveCustomKeyword(itemFilterDraft, q);
    setItemFilterDraft(next);
    updateItemFilterPersist((d) => (itemFilterModalOpen ? next : persistSaveCustomKeyword(d, q)));
    showItemFilterChipSaveHint(`已保存到筛选项「${q}」`);
  }, [
    itemFilterQuickQuery,
    itemFilterDraft,
    itemFilterModalOpen,
    dataBodyRows,
    persistSaveCustomKeyword,
    updateItemFilterPersist,
    push,
    showItemFilterChipSaveHint,
  ]);

  const saveTaskCustomKeywordFromDraft = useCallback(() => {
    const q = taskFilterQuickQuery.trim();
    if (!q) {
      push("请输入搜索关键字");
      return;
    }
    const hasMatch = dataBodyRows.some(({ row }) => rowMatchesKeyword(row, q));
    if (!hasMatch) {
      push("无包含该关键字的行");
      return;
    }
    const next = persistSaveCustomKeywordTask(taskFilterDraft, q);
    setTaskFilterDraft(next);
    updateTaskFilterPersist((d) => (taskFilterModalOpen ? next : persistSaveCustomKeywordTask(d, q)));
    showTaskFilterChipSaveHint(`已保存到筛选项「${q}」`);
  }, [
    taskFilterQuickQuery,
    taskFilterDraft,
    taskFilterModalOpen,
    dataBodyRows,
    persistSaveCustomKeywordTask,
    updateTaskFilterPersist,
    push,
    showTaskFilterChipSaveHint,
  ]);

  const commitTaskFilterSave = useCallback(
    (draftOverride?: TaskTableFilter, opts?: { keepModalOpen?: boolean; immediate?: boolean }) => {
      if (!config) return;
      const d = draftOverride ?? taskFilterDraft;
      const nextFilter = taskTableFilterIsInactive(d) && !hasCustomTaskKeyOrder(d) ? null : d;
      const visible =
        nextFilter == null
          ? new Set(dataBodyRows.map((r) => r.dataIdx))
          : new Set(
              dataBodyRows
                .filter(({ row }) => rowPassesTaskTableFilter(row, nextFilter, taskFilterColIdx))
                .map((r) => r.dataIdx),
            );
      if (!opts?.keepModalOpen) setTaskFilterModalOpen(false);
      const applyFilterUpdate = () => {
        setConfig((c) => (c ? { ...c, taskTableFilter: nextFilter } : c));
        setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
        setSelectedRowOrder((order) => order.filter((di) => visible.has(di)));
      };
      if (opts?.immediate) {
        applyFilterUpdate();
      } else {
        startTransition(applyFilterUpdate);
      }
      void saveTaskTableFilterToDisk(nextFilter).catch((e) => push(`筛选保存失败: ${e}`));
    },
    [config, taskFilterDraft, dataBodyRows, taskFilterColIdx, saveTaskTableFilterToDisk, push],
  );

  const clearSavedTableFilter = useCallback(() => {
    if (!config) return;
    if (isItemTableView) {
      const base = activeItemTableFilter
        ? cloneItemTableFilter(activeItemTableFilter)
        : emptyItemTableFilter();
      const cleared = clearItemFilterSelectionsKeepOrder(base);
      setItemFilterDraft(cleared);
      setItemFilterQuickQuery("");
      setItemFilterModalOpen(false);
      commitItemFilterSave(cleared, { immediate: true });
    } else if (isTaskTableView) {
      const base = activeTaskTableFilter
        ? cloneTaskTableFilter(activeTaskTableFilter)
        : emptyTaskTableFilter();
      const cleared = clearTaskFilterSelectionsKeepOrder(base);
      setTaskFilterDraft(cleared);
      setTaskFilterQuickQuery("");
      setTaskFilterModalOpen(false);
      commitTaskFilterSave(cleared, { immediate: true });
    }
    push("已清空筛选");
  }, [
    config,
    isItemTableView,
    isTaskTableView,
    activeItemTableFilter,
    activeTaskTableFilter,
    commitItemFilterSave,
    commitTaskFilterSave,
    push,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isCtrlOrCmdF(e)) return;
      if (!shouldPreventNativeFind()) return;

      e.preventDefault();
      e.stopPropagation();

      const ctx = {
        wizardOpen,
        settingsOpen,
        hasConfig: Boolean(config),
        hasCurrentAoa: Boolean(currentAoa),
        isItemTableView,
        isTaskTableView,
        itemFilterModalOpen: itemFilterModalOpen,
        taskFilterModalOpen: taskFilterModalOpen,
        eventTarget: e.target,
      };

      if (shouldOpenAppFilterModal(ctx)) {
        openTableFilterModal();
        if (isItemTableView) itemFilterQuickFocusPendingRef.current = true;
        else if (isTaskTableView) taskFilterQuickFocusPendingRef.current = true;
        return;
      }

      if (shouldRefocusFilterQuickSearch(ctx)) {
        if (isItemTableView) itemFilterQuickInputRef.current?.focus();
        else if (isTaskTableView) taskFilterQuickInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [
    wizardOpen,
    settingsOpen,
    config,
    currentAoa,
    isItemTableView,
    isTaskTableView,
    itemFilterModalOpen,
    taskFilterModalOpen,
    openTableFilterModal,
  ]);

  useEffect(() => {
    if (!itemFilterModalOpen) return;
    if (!itemFilterQuickFocusPendingRef.current) return;
    itemFilterQuickFocusPendingRef.current = false;
    const tid = window.requestAnimationFrame(() => itemFilterQuickInputRef.current?.focus());
    return () => window.cancelAnimationFrame(tid);
  }, [itemFilterModalOpen]);

  useEffect(() => {
    if (!taskFilterModalOpen) return;
    if (!taskFilterQuickFocusPendingRef.current) return;
    taskFilterQuickFocusPendingRef.current = false;
    const tid = window.requestAnimationFrame(() => taskFilterQuickInputRef.current?.focus());
    return () => window.cancelAnimationFrame(tid);
  }, [taskFilterModalOpen]);

  useEffect(() => {
    if (!itemFilterModalOpen) return;
    const key = itemFilterDraft.typeRemarkKeys[0];
    if (!key) return;
    const tid = window.requestAnimationFrame(() => {
      const root = itemFilterTypeRemarkScrollRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`[data-filter-grid-item][title="${CSS.escape(key)}"]`);
      el?.scrollIntoView({ block: "nearest" });
    });
    return () => window.cancelAnimationFrame(tid);
  }, [itemFilterModalOpen, itemFilterDraft.typeRemarkKeys]);

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

  const freezeAnchorHeader = useMemo(() => {
    if (!config) return null;
    if (activeView.kind === "item") return config.freezeThroughItemHeader;
    if (activeView.kind === "task") return config.freezeThroughTaskHeader;
    if (activeView.kind === "template" || activeView.kind === "snapshot") {
      return config.savedTemplates.find((t) => t.id === activeView.id)?.freezeThroughHeader ?? null;
    }
    return null;
  }, [config, activeView]);

  const freezeVisIdx = useMemo(() => {
    if (!freezeAnchorHeader) return -1;
    for (let v = 0; v < visibleColIndices.length; v++) {
      const ci = visibleColIndices[v];
      if ((headers[ci] ?? "") === freezeAnchorHeader) return v;
    }
    return -1;
  }, [freezeAnchorHeader, visibleColIndices, headers]);

  const {
    scrollLeft: tableScrollLeft,
    scrollLeftRef: tableScrollLeftRef,
    hasHorizontalOverflow: tableHasHorizontalOverflow,
    tableScrollBodyRef,
    tableScrollXBarRef,
    tableScrollSpacerRef,
    tableScrollContentRef,
    onHorizontalBarScroll,
    onTableBodyWheel,
    scrollBodyToTop,
  } = useTableAxisScroll({
    tableRef: tableDataRef,
    shellRef: tableScrollRef,
    layoutSeq: layoutResizeSeq,
    contentSeq: currentAoa
      ? visibleColIndices.length * 1_000_000 + displayBodyRows.length + headers.length
      : 0,
  });

  useLayoutEffect(() => {
    const wrap = tableScrollRef.current;
    const bar = tableMetaBarRef.current;
    if (!wrap || !bar) return;
    wrap.style.setProperty("--table-meta-row-height", `${bar.offsetHeight}px`);
  }, [
    visibleSelectedCount,
    selectableVisibleDataIdxs.length,
    allVisibleSelected,
    someVisibleSelected,
    isItemTableView,
    isTaskTableView,
    pinActive,
    visibleColIndices.length,
    layoutResizeSeq,
    currentAoa,
  ]);

  useLayoutEffect(() => {
    const table = tableDataRef.current;
    const tr = table?.tHead?.rows[0];
    if (!tr?.cells.length) {
      setStickyCellLeftPx([]);
      return;
    }
    const cells = tr.cells;
    const lefts: number[] = [];
    let acc = 0;
    for (let i = 0; i < cells.length; i++) {
      lefts.push(acc);
      acc += cells[i].offsetWidth;
    }
    setStickyCellLeftPx(lefts);
  }, [
    freezeVisIdx,
    visibleColIndices,
    displayBodyRows.length,
    currentAoa,
    tableSort,
    headers.length,
    layoutResizeSeq,
  ]);

  useEffect(() => {
    const onResize = () => setLayoutResizeSeq((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleRow = (dataIdx: number) => {
    setSelectedRows((prev) => {
      const n = new Set(prev);
      const wasSelected = n.has(dataIdx);
      if (wasSelected) n.delete(dataIdx);
      else n.add(dataIdx);
      setSelectedRowOrder((order) => {
        if (wasSelected) return order.filter((di) => di !== dataIdx);
        if (order.includes(dataIdx)) return order;
        return [...order, dataIdx];
      });
      return n;
    });
  };

  const clearRowSelection = useCallback(() => {
    setSelectedRows(new Set());
    setSelectedRowOrder([]);
  }, []);

  useEffect(() => {
    selectedRowsRef.current = selectedRows;
  }, [selectedRows]);

  useEffect(() => {
    selectedRowOrderRef.current = selectedRowOrder;
  }, [selectedRowOrder]);

  useEffect(() => {
    itemLineQtyRef.current = itemLineQty;
  }, [itemLineQty]);

  const switchActiveView = useCallback(
    (next: ActiveView) => {
      const prevKey = viewSelectionKey(activeView);
      if (prevKey) {
        selectionByViewRef.current.set(
          prevKey,
          snapshotFromSelection(
            selectedRowsRef.current,
            selectedRowOrderRef.current,
            itemLineQtyRef.current,
          ),
        );
      }

      setActiveView(next);

      const nextKey = viewSelectionKey(next);
      if (!nextKey) {
        clearRowSelection();
        setItemLineQty({});
        return;
      }

      const cached = selectionByViewRef.current.get(nextKey);
      if (cached) {
        const restored = applySnapshot(cached);
        setSelectedRows(restored.selectedRows);
        setSelectedRowOrder(restored.selectedRowOrder);
        setItemLineQty(restored.itemLineQty);
      } else {
        clearRowSelection();
        setItemLineQty({});
      }
    },
    [activeView, clearRowSelection],
  );

  const removeSelectedDataIdx = useCallback((dataIdx: number) => {
    setSelectedRows((prev) => {
      const n = new Set(prev);
      n.delete(dataIdx);
      return n;
    });
    setSelectedRowOrder((order) => order.filter((di) => di !== dataIdx));
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedRows((prev) => {
      const { selectedRows, selectedRowOrder } = toggleVisibleRowSelection(
        prev,
        selectedRowOrderRef.current,
        selectableVisibleDataIdxs,
      );
      setSelectedRowOrder(selectedRowOrder);
      return selectedRows;
    });
  }, [selectableVisibleDataIdxs]);

  const handlePinButtonClick = useCallback(() => {
    if (visibleSelectedCount > 0) {
      const toAdd = visibleDataIdxs.filter((di) => selectedRows.has(di));
      if (isItemTableView) {
        setPinnedRowOrder((p) => ({
          ...p,
          item: mergePinnedOrder(p.item, toAdd, selectedRowOrder),
        }));
      } else if (isTaskTableView) {
        setPinnedRowOrder((p) => ({
          ...p,
          task: mergePinnedOrder(p.task, toAdd, selectedRowOrder),
        }));
      }
    } else if (pinActive) {
      if (isItemTableView) {
        setPinnedRowOrder((p) => ({ ...p, item: [] }));
      } else if (isTaskTableView) {
        setPinnedRowOrder((p) => ({ ...p, task: [] }));
      }
    }
  }, [
    visibleSelectedCount,
    visibleDataIdxs,
    selectedRows,
    selectedRowOrder,
    isItemTableView,
    isTaskTableView,
    pinActive,
  ]);

  const scrollTableToTop = useCallback(() => {
    scrollBodyToTop();
  }, [scrollBodyToTop]);

  const canBoxSelect = Boolean(currentAoa) && activeView.kind !== "addExp";

  const isBoxSelectInteractiveTarget = (t: EventTarget | null): boolean => {
    const el = t instanceof HTMLElement ? t : null;
    if (!el) return false;
    if (el.closest("input,button,select,textarea,a,[role='button']")) return true;
    if (el.closest("thead")) return true;
    if (el.closest(".table-selection-meta-bar")) return true;
    return false;
  };

  const commitBoxSelectFromRef = useCallback(() => {
    const wrap = tableScrollBodyRef.current;
    const sel = boxSelectRef.current;
    boxSelectRef.current = null;
    setBoxSelect(null);
    if (!wrap || !sel || !canBoxSelect) return;

    const dx = sel.curClientX - sel.startClientX;
    const dy = sel.curClientY - sel.startClientY;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (displayBodyRows.length === 0) return;

    const table = tableDataRef.current;
    const headerH = table?.tHead?.rows[0]?.getBoundingClientRect().height ?? 0;
    const bodyOffsetY = headerH;

    const rowH =
      table?.tBodies?.[0]?.querySelector("tr:not(.virtual-spacer)")?.getBoundingClientRect().height ||
      TABLE_ROW_HEIGHT_ESTIMATE;

    const hitResult = computeBoxSelectHitsFromPointer({
      sel,
      wrapRectTop: wrap.getBoundingClientRect().top,
      wrapScrollTop: wrap.scrollTop,
      rowCount: displayBodyRows.length,
      rowHeight: rowH,
      bodyOffsetY,
      dataIdxForVisualIndex: (i) => displayBodyRows[i]?.dataIdx,
    });
    if (!hitResult) return;

    const toggled = applyBoxSelectToggle(
      selectedRowsRef.current,
      selectedRowOrderRef.current,
      hitResult.dataIdxs,
    );
    setSelectedRows(toggled.selectedRows);
    setSelectedRowOrder(toggled.selectedRowOrder);
  }, [canBoxSelect, displayBodyRows]);

  const beginBoxSelect = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (!canBoxSelect) return;
      if (isBoxSelectInteractiveTarget(e.target)) return;

      const wrap = tableScrollBodyRef.current;
      if (!wrap) return;
      if (isTableScrollbarHit(wrap, tableScrollXBarRef.current, e.clientX, e.clientY)) return;

      e.preventDefault();
      e.stopPropagation();

      const session: BoxSelectPointerState = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        curClientX: e.clientX,
        curClientY: e.clientY,
        originScrollTop: wrap.scrollTop,
        originScrollLeft: tableScrollLeftRef.current,
      };
      boxSelectRef.current = session;
      setBoxSelect(session);

      const pointerId = e.pointerId;
      const captureTarget = e.currentTarget;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const cur = boxSelectRef.current;
        if (!cur) return;
        ev.preventDefault();
        const next = { ...cur, curClientX: ev.clientX, curClientY: ev.clientY };
        boxSelectRef.current = next;
        setBoxSelect(next);
      };

      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        try {
          captureTarget.releasePointerCapture(pointerId);
        } catch {
          // ignore
        }
        commitBoxSelectFromRef();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);

      try {
        captureTarget.setPointerCapture(pointerId);
      } catch {
        // ignore
      }
    },
    [canBoxSelect, commitBoxSelectFromRef],
  );

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected]);

  const deselectItemRow = useCallback((dataIdx: number) => {
    setSelectedRows((s) => {
      const n = new Set(s);
      n.delete(dataIdx);
      return n;
    });
    setSelectedRowOrder((order) => order.filter((di) => di !== dataIdx));
    setItemLineQty((q) => {
      const next = { ...q };
      delete next[dataIdx];
      return next;
    });
  }, []);

  const bumpItemLineQty = useCallback(
    (dataIdx: number, sign: 1 | -1) => {
      if (sign === -1) {
        setItemLineQty((q) => {
          const cur = q[dataIdx] ?? 1;
          if (cur <= 1) {
            deselectItemRow(dataIdx);
            return q;
          }
          return { ...q, [dataIdx]: cur - 1 };
        });
      } else {
        setItemLineQty((q) => ({ ...q, [dataIdx]: Math.min(9999, (q[dataIdx] ?? 1) + 1) }));
      }
    },
    [deselectItemRow],
  );

  const setItemLineQtyDirect = useCallback(
    (dataIdx: number, raw: string) => {
      const parsed = parseItemLineQtyInput(raw);
      if (parsed == null) {
        deselectItemRow(dataIdx);
        return;
      }
      setItemLineQty((q) => ({ ...q, [dataIdx]: parsed }));
    },
    [deselectItemRow],
  );

  const toggleHideColumn = async (header: string, hide: boolean) => {
    if (!config || activeView.kind === "template" || activeView.kind === "snapshot") return;
    if (activeView.kind === "item" || activeView.kind === "task") {
      if (headerCannotHide(activeView.kind, header)) return;
    }
    const key = activeView.kind === "item" ? "hiddenItemColumns" : "hiddenTaskColumns";
    const cur = new Set(config[key]);
    if (hide) cur.add(header);
    else cur.delete(header);
    const next = { ...config, [key]: [...cur] };
    if (hide) {
      if (activeView.kind === "item" && config.freezeThroughItemHeader === header) {
        next.freezeThroughItemHeader = null;
      } else if (activeView.kind === "task" && config.freezeThroughTaskHeader === header) {
        next.freezeThroughTaskHeader = null;
      }
    }
    await persist(next);
  };

  const closeCtx = () => {
    setCtxMenu(null);
    setColumnHeaderMenu(null);
  };

  const logGmt = useCallback(
    (
      partial: Parameters<typeof buildGmtOperationLog>[0] & { toast?: string },
    ) => {
      const { toast, ...rest } = partial;
      if (toast) push(toast);
      logOp(buildGmtOperationLog(rest));
    },
    [push, logOp],
  );

  const addExpPresetDeps = useMemo((): AddExpPresetRunnerDeps | null => {
    if (!config) return null;
    return {
      config,
      cumulativeByLevel: accountLevelByLevel,
      cumulativeLoadError: accountLevelParseError,
      gmtAccountIdDraft,
      ensureGmtLoggedIn,
      logGmt,
    };
  }, [
    config,
    accountLevelByLevel,
    accountLevelParseError,
    gmtAccountIdDraft,
    ensureGmtLoggedIn,
    logGmt,
  ]);

  const runSidebarAddExpPreset = useCallback(
    async (runner: (deps: AddExpPresetRunnerDeps) => Promise<void>) => {
      if (!addExpPresetDeps || addExpPresetBusy) return;
      setAddExpPresetBusy(true);
      try {
        await runner(addExpPresetDeps);
      } finally {
        setAddExpPresetBusy(false);
      }
    },
    [addExpPresetDeps, addExpPresetBusy],
  );

  const notify = useCallback(
    (
      text: string,
      log?: {
        action: string;
        outcome: OperationOutcome;
        detail?: string;
        context?: string;
        extra?: string;
        gmt?: OperationLogEntry["gmt"];
      },
    ) => {
      push(text);
      if (log) {
        logOp({
          action: log.action,
          outcome: log.outcome,
          detail: log.detail,
          message: text,
          context: log.context,
          extra: log.extra,
          gmt: log.gmt,
        });
      }
    },
    [push, logOp],
  );

  useEffect(() => {
    const fn = () => closeCtx();
    window.addEventListener("click", fn);
    return () => window.removeEventListener("click", fn);
  }, []);

  useEffect(() => {
    if (!logPanelOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (logPanelRef.current && !logPanelRef.current.contains(e.target as Node)) {
        setLogPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [logPanelOpen]);

  const onTableContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const dataIdx = resolveTableContextDataIdx(e.target);
    if (dataIdx == null && selectedRows.size === 0) return;
    if (!isItemTableView && !isTaskTableView) return;
    setColumnHeaderMenu(null);
    setCtxMenu({ x: e.clientX, y: e.clientY, dataIdx });
  };

  const openItemPriceModalFromContext = async () => {
    if (!ctxMenu || ctxMenu.dataIdx == null || !currentAoa || !config) {
      closeCtx();
      return;
    }
    const dataIdx = ctxMenu.dataIdx;
    closeCtx();
    const itemId = parseItemRowId(currentAoa, dataIdx);
    if (!itemId) {
      push("无法修改：缺少物品 ID");
      return;
    }
    let { baseValue, stdPrice } = readItemPricesFromTableRow(currentAoa, dataIdx);
    const csvPath = await resolveItemCsvPath(config.excelWorkspaceRoot);
    if (csvPath) {
      try {
        const csvText = await invoke<string>("read_text_file", { path: csvPath });
        const fromCsv = readItemPricesFromCsv(csvText, itemId);
        if (fromCsv) {
          if (!baseValue) baseValue = fromCsv.baseValue;
          if (!stdPrice) stdPrice = fromCsv.stdPrice;
        }
      } catch {
        /* 预填失败时仍打开弹窗 */
      }
    }
    setItemPriceModal({ itemId, baseValue, stdPrice });
  };

  const submitItemPriceModal = async (changes: { baseValue?: number; stdPrice?: number }) => {
    if (!config || !itemPriceModal) return;
    setItemPriceSubmitting(true);
    try {
      const result = await modifyItemPricesViaGtop({
        config,
        gtopLoggedIn,
        itemId: itemPriceModal.itemId,
        changes,
      });
      notify(result.toast, {
        action: "GTOP 修改物品价格",
        outcome: result.ok ? "success" : "failure",
        detail: result.ok ? undefined : result.message,
      });
      if (result.ok) setItemPriceModal(null);
    } finally {
      setItemPriceSubmitting(false);
    }
  };

  const restoreItemDefaultPricesFromContext = async () => {
    if (!ctxMenu || ctxMenu.dataIdx == null || !currentAoa || !config) {
      closeCtx();
      return;
    }
    const dataIdx = ctxMenu.dataIdx;
    closeCtx();
    const itemId = parseItemRowId(currentAoa, dataIdx);
    if (!itemId) {
      push("无法还原：缺少物品 ID");
      return;
    }
    setRestoreItemPriceBusy(true);
    try {
      const result = await restoreItemDefaultPricesViaGtop({
        config,
        gtopLoggedIn,
        itemId,
      });
      notify(result.toast, {
        action: "GTOP 还原默认物品价格",
        outcome: result.ok ? "success" : "failure",
        detail: result.ok ? undefined : result.message,
      });
    } finally {
      setRestoreItemPriceBusy(false);
    }
  };

  const copyContextRowId = async () => {
    if (!ctxMenu || ctxMenu.dataIdx == null || !currentAoa || !config) {
      closeCtx();
      return;
    }
    const tableSource =
      getCurrentTableSource(activeView, config) ?? (isItemTableView ? "item" : "task");
    if (tableSource !== "item" && tableSource !== "task") {
      closeCtx();
      push("当前视图无法复制 ID");
      return;
    }
    const id = parseTableRowIdForCopy(currentAoa, ctxMenu.dataIdx, tableSource);
    closeCtx();
    if (!id) {
      push(tableSource === "item" ? "无法复制：缺少物品ID或该行为空" : "无法复制：缺少任务ID或该行为空");
      return;
    }
    try {
      await writeText(id);
      push(tableSource === "item" ? `已复制物品 ID：${id}` : `已复制任务 ID：${id}`);
    } catch (err) {
      push(`复制失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const applyFreezeThrough = async (headerName: string | null) => {
    if (!config) return;
    setColumnHeaderMenu(null);
    if (activeView.kind === "item") {
      await persist({ ...config, freezeThroughItemHeader: headerName });
    } else if (activeView.kind === "task") {
      await persist({ ...config, freezeThroughTaskHeader: headerName });
    } else if (activeView.kind === "template" || activeView.kind === "snapshot") {
      const list = config.savedTemplates.map((t) =>
        t.id === activeView.id ? { ...t, freezeThroughHeader: headerName } : t,
      );
      await persist({ ...config, savedTemplates: list });
    }
    push(headerName ? "已冻结到此列" : "已取消冻结");
  };

  const openTemplateNameModal = () => {
    closeCtx();
    if (!currentAoa || !config) return;
    const built = buildSelectedDataRows(currentAoa, selectedRows);
    if (!built) {
      push("请先勾选行");
      return;
    }
    const source = getCurrentTableSource(activeView, config) ?? "item";
    let items: SendTemplateItem[] = [];
    if (source === "item") {
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
      items = buildSendItemsFromSelection(currentAoa, selectedRows, itemLineQty, ridx);
    }
    const now = Date.now();
    const rowCount = built.idxs.length;
    const defaultTitle =
      source === "item" && items.length > 0
        ? `模板 ${new Date(now).toLocaleString("zh-CN", { hour12: false })}（${rowCount} 行 · ${items.length} 种）`
        : `模板 ${new Date(now).toLocaleString("zh-CN", { hour12: false })}（${rowCount} 行）`;
    setTemplateNameDraft(defaultTitle);
    setTemplateNameModal({ defaultTitle, source, aoa: built.fullAoa, items });
  };

  const commitTemplateSave = async (titleInput: string) => {
    if (!templateNameModal || !config) return;
    const trimmed = titleInput.trim();
    const title = trimmed || templateNameModal.defaultTitle;
    const items = mergeSendTemplateItems(templateNameModal.items);
    const { source, aoa } = templateNameModal;
    let list = [...config.savedTemplates];
    while (list.length >= MAX_TEMPLATES) {
      list.sort((a, b) => a.createdAt - b.createdAt);
      list.shift();
    }
    const tpl: SavedTemplate = {
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
      source,
      aoa,
      items,
    };
    await persist({ ...config, savedTemplates: [...list, tpl] });
    setTemplateNameModal(null);
    setTemplateNameDraft("");
    switchActiveView({ kind: "template", id: tpl.id });
    const label = source === "item" ? "道具" : "任务";
    notify(`已保存模板「${title}」（${label} · ${Math.max(0, aoa.length - 1)} 行）`, {
      action: "保存为模板",
      outcome: "success",
      detail: title,
    });
  };

  const commitTemplateRename = async (draft: string) => {
    if (!templateRenameModal || !config) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      notify("名称不能为空", { action: "重命名发送模板", outcome: "failure" });
      return;
    }
    const { id } = templateRenameModal;
    const list = config.savedTemplates.map((t) => (t.id === id ? { ...t, title: trimmed } : t));
    await persist({ ...config, savedTemplates: list });
    setTemplateRenameModal(null);
    notify("已重命名", { action: "重命名发送模板", outcome: "success", detail: trimmed });
  };

  const moveTemplateToRecycle = async (id: string) => {
    if (!config) return;
    const removed = config.savedTemplates.find((t) => t.id === id);
    if (!removed) return;
    const list = config.savedTemplates.filter((t) => t.id !== id);
    const order =
      config.sidebarTemplateOrder == null
        ? null
        : config.sidebarTemplateOrder.filter((tid) => tid !== id);
    const recycled = [
      ...(config.recycledTemplates ?? []),
      { template: removed, deletedAt: Date.now() },
    ];
    await persist({
      ...config,
      savedTemplates: list,
      recycledTemplates: recycled,
      sidebarTemplateOrder: order,
    });
    selectionByViewRef.current.delete(`template:${id}`);
    if ((activeView.kind === "template" || activeView.kind === "snapshot") && activeView.id === id) {
      switchActiveView({ kind: removed.source === "task" ? "task" : "item" });
    }
  };

  const purgeRecycledTemplate = async (id: string) => {
    if (!config) return;
    const recycled = (config.recycledTemplates ?? []).filter((r) => r.template.id !== id);
    await persist({ ...config, recycledTemplates: recycled });
  };

  const restoreRecycledTemplate = async (id: string) => {
    if (!config) return;
    const entry = (config.recycledTemplates ?? []).find((r) => r.template.id === id);
    if (!entry) return;
    if (config.savedTemplates.some((t) => t.id === id)) {
      notify("该模板已在侧栏中，无法重复还原", { action: "还原模板", outcome: "failure" });
      return;
    }
    let list = [...config.savedTemplates, entry.template];
    while (list.length > MAX_TEMPLATES) {
      list.sort((a, b) => a.createdAt - b.createdAt);
      list.shift();
    }
    const recycled = (config.recycledTemplates ?? []).filter((r) => r.template.id !== id);
    let order = config.sidebarTemplateOrder;
    if (order != null && !order.includes(id)) {
      order = [...order, id];
    }
    await persist({
      ...config,
      savedTemplates: list,
      recycledTemplates: recycled,
      sidebarTemplateOrder: order,
    });
    notify(`已还原模板「${entry.template.title}」`, {
      action: "还原模板",
      outcome: "success",
      detail: entry.template.title,
    });
  };

  const sendTemplateItemsNow = async (title: string, items: SendTemplateItem[]) => {
    if (!config) return;
    const envName = config.gmtEnvName;
    const accountId = gmtAccountIdDraft.trim();
    const mergedPreview = mergeSendTemplateItems(items);

    if (!(await ensureGmtLoggedIn())) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: "未登录 GMT",
        toast: "未登录 GMT",
        envName,
        accountId,
        items: toGmtLogItems(mergedPreview),
        source: "template",
        templateTitle: title,
      });
      return;
    }
    if (!envName?.trim()) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: "请选择区服",
        toast: "请选择区服",
        envName,
        accountId,
        items: toGmtLogItems(mergedPreview),
        source: "template",
        templateTitle: title,
      });
      return;
    }
    const envBlock = gmtEnvSelectionBlockMessage(envName, config.gmtEnvId);
    if (envBlock) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: envBlock,
        toast: envBlock,
        envName,
        accountId,
        items: toGmtLogItems(mergedPreview),
        source: "template",
        templateTitle: title,
      });
      return;
    }
    if (!accountId) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: "请填写账号 ID",
        toast: "请填写账号 ID",
        envName,
        accountId,
        items: toGmtLogItems(mergedPreview),
        source: "template",
        templateTitle: title,
      });
      return;
    }
    const merged = mergedPreview;
    if (merged.length === 0) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: "模板内物品 ID 为空",
        toast: "模板内物品 ID 为空",
        envName,
        accountId,
        items: [],
        source: "template",
        templateTitle: title,
      });
      return;
    }
    const result = await execAdminSendMailItems(
      merged,
      config,
      accountId,
      resolveGmtEnvDisplayLabel(config),
    );
    logGmt({
      action: "GMT 发放道具",
      outcome: result.ok ? "success" : "failure",
      message: result.message,
      toast: result.message,
      envName,
      accountId,
      items: toGmtLogItems(merged),
      source: "template",
      templateTitle: title,
    });
    return result.ok;
  };

  const itemServerWideUi = useMemo(
    () => normalizeItemServerWideSendSettings(config?.itemServerWideSendSettings),
    [config?.itemServerWideSendSettings],
  );

  const ctxMenuContentKey = useMemo(() => {
    if (!ctxMenu || !config) return null;
    const tableSource =
      getCurrentTableSource(activeView, config) ?? (isItemTableView ? "item" : "task");
    const tplCount = config.savedTemplates.filter((t) => t.source === tableSource).length;
    return `${selectedRows.size}-${tplCount}-${isTaskTableView}-${isItemTableView}-${activeView.kind}-${itemServerWideUi.entriesEnabled}-${ctxMenu.dataIdx ?? "n"}`;
  }, [
    ctxMenu,
    config,
    activeView,
    isItemTableView,
    isTaskTableView,
    selectedRows.size,
    itemServerWideUi.entriesEnabled,
  ]);

  const ctxMenuPos = useClampedMenuPosition(ctxMenu, ctxMenuRef, ctxMenuContentKey);
  const columnHeaderMenuAnchor = columnHeaderMenu
    ? { x: columnHeaderMenu.x, y: columnHeaderMenu.y }
    : null;
  const columnHeaderMenuPos = useClampedMenuPosition(
    columnHeaderMenuAnchor,
    columnHeaderMenuRef,
    columnHeaderMenu?.headerName ?? null,
  );

  const openGlobalSendDialog = useCallback(
    (items: SendTemplateItem[], hint: string) => {
      const merged = mergeSendTemplateItems(items);
      if (merged.length === 0) {
        logGmt({
          action: "GMT 全服邮件",
          outcome: "failure",
          message: "没有可发送的物品",
          toast: "没有可发送的物品",
          envName: config?.gmtEnvName,
          accountId: gmtAccountIdDraft,
          items: [],
          source: "global-mail",
        });
        return;
      }
      setGlobalSendModal({ items: merged, hint });
    },
    [config?.gmtEnvName, gmtAccountIdDraft, logGmt],
  );

  const saveGlobalSendLastForm = useCallback(
    (form: GlobalSendLastForm) => {
      if (!config) return;
      void persist({ ...config, globalSendLastForm: form });
    },
    [config, persist],
  );

  const submitGlobalSend = useCallback(
    async (payload: GlobalSendSubmitPayload) => {
      if (!config) return;
      setGlobalSendSubmitting(true);
      const envName = config.gmtEnvName;
      const accountId = gmtAccountIdDraft.trim();
      try {
        if (!(await ensureGmtLoggedIn())) {
          logGmt({
            action: "GMT 全服邮件",
            outcome: "failure",
            message: "未登录 GMT",
            toast: "未登录 GMT",
            envName,
            accountId,
            items: toGmtLogItems(payload.items),
            source: "global-mail",
            templateTitle: payload.title,
          });
          return;
        }
        if (!envName?.trim()) {
          logGmt({
            action: "GMT 全服邮件",
            outcome: "failure",
            message: "请先在顶栏选择 GMT 环境",
            toast: "请先在顶栏选择 GMT 环境",
            envName,
            accountId,
            items: toGmtLogItems(payload.items),
            source: "global-mail",
            templateTitle: payload.title,
          });
          return;
        }
        const result = await execAdminSendGlobalMail(payload.items, config, {
          region: config.gmtLockRegion,
          title: payload.title,
          content: payload.content,
          senderName: payload.senderName,
          startTime: payload.startTime,
          endTime: payload.endTime,
        });
        logGmt({
          action: "GMT 全服邮件",
          outcome: result.ok ? "success" : "failure",
          message: result.message,
          toast: result.message,
          envName,
          accountId,
          items: toGmtLogItems(payload.items),
          source: "global-mail",
          templateTitle: payload.title,
        });
        if (result.ok) setGlobalSendModal(null);
      } finally {
        setGlobalSendSubmitting(false);
      }
    },
    [config, gmtAccountIdDraft, ensureGmtLoggedIn, logGmt],
  );

  const openGlobalSendFromTableContext = useCallback(() => {
    closeCtx();
    if (!config || !currentAoa || !itemServerWideUi.entriesEnabled) return;
    if (getCurrentTableSource(activeView, config) !== "item") return;
    if (selectedRows.size === 0) {
      push("请先勾选行");
      return;
    }
    const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
    const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
    const items = buildSendItemsFromSelection(currentAoa, selectedRows, itemLineQty, ridx);
    openGlobalSendDialog(items, "表格右键 · 当前勾选");
  }, [
    config,
    currentAoa,
    activeView,
    selectedRows,
    itemLineQty,
    itemServerWideUi.entriesEnabled,
    openGlobalSendDialog,
    push,
  ]);

  const sendTemplateSelectedRows = useCallback(
    async (templateId: string) => {
      if (!config || !currentAoa) return;
      const tpl = config.savedTemplates.find((t) => t.id === templateId);
      if (!tpl) return;
      const viewId =
        activeView.kind === "template" || activeView.kind === "snapshot" ? activeView.id : null;
      if (viewId !== templateId || selectedRows.size === 0) {
        push("请先打开该模板并在表格中勾选要发送的行");
        return;
      }
      if (tpl.source !== "item") return;
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
      const items = buildSendItemsFromSelection(currentAoa, selectedRows, itemLineQty, ridx);
      await sendTemplateItemsNow(tpl.title, items);
    },
    [config, currentAoa, activeView, selectedRows, itemLineQty, push],
  );

  const appendRowsToTemplate = useCallback(
    async (templateId: string, rows: Set<number>, options?: { emptyMessage?: string }) => {
      if (!config || !currentAoa) return;
      const built = buildSelectedDataRows(currentAoa, rows);
      if (!built) {
        push(options?.emptyMessage ?? "请先勾选行");
        return;
      }
      const currentSource = getCurrentTableSource(activeView, config) ?? "item";
      const tpl = config.savedTemplates.find((t) => t.id === templateId);
      if (!tpl) return;
      if (tpl.source !== currentSource) {
        push("记录类型不匹配，无法追加");
        return;
      }
      if (!tpl.aoa?.length) {
        push("目标模板无表头，无法追加");
        return;
      }
      if (!headersCompatibleForAppend(currentAoa[0], tpl.aoa[0])) {
        push("表头与目标模板不一致");
        return;
      }
      const nextAoa: SheetMatrix = [tpl.aoa[0], ...tpl.aoa.slice(1), ...built.dataRows];
      let nextItems = tpl.items;
      if (tpl.source === "item") {
        const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
        const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
        const newItems = buildSendItemsFromSelection(currentAoa, rows, itemLineQty, ridx);
        nextItems = mergeSendTemplateItems([...tpl.items, ...newItems]);
      }
      const list = config.savedTemplates.map((t) =>
        t.id === templateId ? { ...t, aoa: nextAoa, items: nextItems } : t,
      );
      await persist({ ...config, savedTemplates: list });
      clearRowSelection();
      push(`已追加到模板「${tpl.title}」（${built.idxs.length} 行）`);
    },
    [config, currentAoa, activeView, itemLineQty, push, persist, clearRowSelection],
  );

  const appendSelectedRowsToTemplate = useCallback(
    async (templateId: string) => {
      closeCtx();
      await appendRowsToTemplate(templateId, selectedRows);
    },
    [appendRowsToTemplate, selectedRows],
  );

  const currentTableSource = useMemo(
    () => (config ? getCurrentTableSource(activeView, config) : null),
    [config, activeView],
  );

  const cancelBoxSelect = useCallback(() => {
    boxSelectRef.current = null;
    setBoxSelect(null);
  }, []);

  const {
    onRowPointerDown: onTableRowTemplateDragPointerDown,
    dragOverlay: tableRowDragOverlay,
    hoverTemplateId: templateDropHoverId,
    rejectTemplateId: templateDropRejectId,
    isRowTemplateDragging,
  } = useTableRowToTemplateDrag({
    enabled: Boolean(currentAoa) && currentTableSource != null && !filterSheetOpen,
    tableSource: currentTableSource,
    selectedRows,
    currentAoa,
    boxSelectRef,
    onCancelBoxSelect: cancelBoxSelect,
    onDrop: (templateId, rows) =>
      appendRowsToTemplate(templateId, rows, { emptyMessage: "无法追加该行" }),
  });

  const completeNextSelectedTask = useCallback(async () => {
    if (!config || !currentAoa) return;
    if (getCurrentTableSource(activeView, config) !== "task") {
      logGmt({
        action: "GMT 完成任务",
        outcome: "failure",
        message: "请在任务表或任务模板中操作",
        toast: "请在任务表或任务模板中操作",
        envName: config.gmtEnvName,
        accountId: gmtAccountIdDraft,
        items: [],
        source: "task",
      });
      return;
    }
    if (selectedRows.size === 0) {
      logGmt({
        action: "GMT 完成任务",
        outcome: "failure",
        message: "请先勾选要完成的任务",
        toast: "请先勾选要完成的任务",
        envName: config.gmtEnvName,
        accountId: gmtAccountIdDraft,
        items: [],
        source: "task",
      });
      return;
    }

    const chainCheck = validateTaskChainSelection(currentAoa, selectedRows);
    if (!chainCheck.ok) {
      logGmt({
        action: "GMT 完成任务",
        outcome: "failure",
        message: chainCheck.message,
        toast: chainCheck.message,
        envName: config.gmtEnvName,
        accountId: gmtAccountIdDraft,
        items: [],
        source: "task",
      });
      return;
    }

    const nextDi = pickNextTaskRowByIdAsc(currentAoa, selectedRows);
    if (nextDi == null) {
      logGmt({
        action: "GMT 完成任务",
        outcome: "failure",
        message: "所选行任务 ID 为空或当前表无「任务ID」列",
        toast: "所选行任务 ID 为空或当前表无「任务ID」列",
        envName: config.gmtEnvName,
        accountId: gmtAccountIdDraft,
        items: [],
        source: "task",
      });
      return;
    }

    const parsed = parseTaskRowForComplete(currentAoa, nextDi);
    if (!parsed) {
      logGmt({
        action: "GMT 完成任务",
        outcome: "failure",
        message: "所选行任务 ID 为空或当前表无「任务ID」列",
        toast: "所选行任务 ID 为空或当前表无「任务ID」列",
        envName: config.gmtEnvName,
        accountId: gmtAccountIdDraft,
        items: [],
        source: "task",
      });
      return;
    }

    const envName = config.gmtEnvName;
    const taskItems = [{ itemId: `任务 ${parsed.taskId}`, qty: 1 }];

    if (!(await ensureGmtLoggedIn())) {
      logGmt({
        action: "GMT 完成任务",
        outcome: "failure",
        message: "未登录 GMT",
        toast: "未登录 GMT",
        envName,
        accountId: gmtAccountIdDraft,
        items: taskItems,
        source: "task",
      });
      return;
    }

    const readiness = evaluateGmtTaskCompleteOneRow({
      gmtSessionChecking: false,
      gmtLoggedIn: true,
      gmtEnvName: config.gmtEnvName,
      gmtEnvId: config.gmtEnvId,
      gmtAccountId: gmtAccountIdDraft,
      currentAoa,
      dataIdx: nextDi,
    });
    if (!readiness.ready) {
      logGmt({
        action: "GMT 完成任务",
        outcome: "failure",
        message: readiness.message,
        toast: readiness.message,
        envName,
        accountId: gmtAccountIdDraft,
        items: taskItems,
        source: "task",
      });
      return;
    }

    const accountId = gmtAccountIdDraft.trim();
    const remainingBefore = selectedRows.size;
    try {
      const result = await gmtExecAdminFinishTask(gmtSessionSliceFromConfig(config), {
        envName: config.gmtEnvName!,
        accountId,
        lockRegion: config.gmtLockRegion,
        notiRegion: config.gmtNotiRegion,
        taskId: parsed.taskId,
      });
      const remainingAfter = Math.max(0, remainingBefore - 1);
      const toastMsg = result.ok
        ? formatTaskCompleteToast(parsed, remainingAfter > 0 ? remainingAfter : undefined)
        : `GMT 发送失败: ${result.message}`;
      logGmt({
        action: "GMT 完成任务",
        outcome: result.ok ? "success" : "failure",
        message: toastMsg,
        toast: toastMsg,
        envName,
        accountId,
        items: taskItems,
        source: "task",
      });
      if (result.ok) {
        removeSelectedDataIdx(nextDi);
      }
    } catch (e) {
      const msg = `GMT 登录失败: ${e}`;
      logGmt({
        action: "GMT 完成任务",
        outcome: "failure",
        message: msg,
        toast: msg,
        envName,
        accountId,
        items: taskItems,
        source: "task",
      });
    }
  }, [
    config,
    currentAoa,
    activeView,
    selectedRows,
    gmtAccountIdDraft,
    ensureGmtLoggedIn,
    logGmt,
    removeSelectedDataIdx,
  ]);

  const goGmtExecute = async () => {
    closeCtx();
    if (!config || !currentAoa) return;
    const idxs = [...selectedRows].sort((a, b) => a - b);
    if (idxs.length === 0) return;

    const currentSource: "item" | "task" | null = getCurrentTableSource(activeView, config);
    if (!currentSource) return;

    if (currentSource === "item") {
      const envName = config.gmtEnvName;
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
      const previewItems = buildSendItemsFromSelection(currentAoa, selectedRows, itemLineQty, ridx);

      if (!(await ensureGmtLoggedIn())) {
        logGmt({
          action: "GMT 发放道具",
          outcome: "failure",
          message: "未登录 GMT",
          toast: "未登录 GMT",
          envName,
          accountId: gmtAccountIdDraft,
          items: toGmtLogItems(previewItems),
          source: "item-table",
        });
        return;
      }
      const readiness = evaluateGmtItemSendReadiness({
        gmtSessionChecking: false,
        gmtLoggedIn: true,
        gmtEnvName: config.gmtEnvName,
        gmtEnvId: config.gmtEnvId,
        gmtAccountId: gmtAccountIdDraft,
        selectedRows,
        currentAoa,
      });
      if (!readiness.ready) {
        logGmt({
          action: "GMT 发放道具",
          outcome: "failure",
          message: readiness.message,
          toast: readiness.message,
          envName,
          accountId: gmtAccountIdDraft,
          items: toGmtLogItems(previewItems),
          source: "item-table",
        });
        return;
      }
      const accountId = gmtAccountIdDraft.trim();
      const items = previewItems;
      const result = await execAdminSendMailItems(
        items,
        config,
        accountId,
        resolveGmtEnvDisplayLabel(config),
      );
      const toastMsg = result.ok ? `${result.message}（${idxs.length} 行）` : result.message;
      logGmt({
        action: "GMT 发放道具",
        outcome: result.ok ? "success" : "failure",
        message: toastMsg,
        toast: toastMsg,
        envName,
        accountId,
        items: toGmtLogItems(items),
        source: "item-table",
      });
      return;
    }

    if (currentSource === "task") {
      await completeNextSelectedTask();
      return;
    }

    let instruction = "";
    {
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const ridx =
        activeView.kind === "template" || activeView.kind === "snapshot"
          ? resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn)
          : remarkColIndex;
      if (ridx < 0) {
        push("请先配置「物品备注」列");
        return;
      }
      const qidx = resolveItemQualityColumnIndex(headersRow);
      const orderKeys: string[] = [];
      const counts = new Map<string, number>();
      for (const di of idxs) {
        const row = currentAoa[di + 1];
        const text = cellStr(row?.[ridx]).trim();
        if (!text) continue;
        const qty = Math.min(9999, Math.max(1, itemLineQty[di] ?? 1));
        const prefix = qidx >= 0 && row ? itemQualityPrefixFromCell(row[qidx]) : "";
        const displayName = prefix + text;
        if (!counts.has(displayName)) orderKeys.push(displayName);
        counts.set(displayName, (counts.get(displayName) ?? 0) + qty);
      }
      if (orderKeys.length === 0) {
        push("无法生成指令");
        return;
      }
      const body = orderKeys.map((t) => `${counts.get(t) ?? 0}个${t}`).join("、");
      instruction = `发送刚刚复制的道具:${body}`;
    }

    try {
      await writeText(instruction);
    } catch (e) {
      push(`复制失败: ${e}`);
      return;
    }

    const skipBrowser = gmtBrowserOpenedThisSessionRef.current;
    if (skipBrowser) {
      push("请去 GMT 中粘贴指令（已复制到剪贴板）");
    } else {
      push("已复制指令，请按弹窗步骤在浏览器中操作");
    }

    setGoGmtModal({ instruction, repeatVisit: skipBrowser });

    if (!skipBrowser) {
      window.setTimeout(() => {
        void openUrl(GMT_COMMAND_LIST_URL)
          .then(() => {
            gmtBrowserOpenedThisSessionRef.current = true;
          })
          .catch((e) => {
            push(`打开浏览器失败: ${e}`);
          });
      }, 200);
    }
  };

  const acceptSelectedTasksViaGtop = useCallback(async () => {
    if (!config) return;
    const result = await acceptTasksViaGtop({
      config,
      gtopLoggedIn,
      taskAoa: activeView.kind === "task" ? taskAoa : currentAoa,
      selectedDataIdxs: selectedRows,
    });
    notify(result.toast, {
      action: "GTOP 接取任务",
      outcome: result.ok ? "success" : "failure",
      detail: result.ok ? undefined : result.message,
      context: result.ok ? `接取 ${result.acceptedCount} 个任务` : undefined,
    });
  }, [config, gtopLoggedIn, taskAoa, currentAoa, activeView.kind, selectedRows, notify]);

  const acceptTasksFromTemplate = (templateId: string) => {
    const viewId =
      activeView.kind === "template" || activeView.kind === "snapshot" ? activeView.id : null;
    if (viewId !== templateId || !currentAoa) {
      push("请先打开该模板并在表格中勾选要接取的任务");
      return;
    }
    if (selectedRows.size === 0) {
      push("请先勾选要接取的任务行");
      return;
    }
    void acceptSelectedTasksViaGtop();
  };

  const restoreDefaultTaskCsv = useCallback(async () => {
    if (!config) return;
    if (!isTaskTableView) {
      push("请在任务表视图中操作");
      return;
    }
    if (!gtopLoggedIn) {
      notify("未登录 GTOP", {
        action: "GTOP 恢复默认 task.csv",
        outcome: "failure",
        detail: "未登录 GTOP",
        context: config.gtopEnvName ?? undefined,
      });
      return;
    }
    const envId = config.gtopEnvId?.trim() ?? "";
    const regionId = config.gtopRegionServerId?.trim() ?? "";
    if (!envId || !regionId) {
      push("请先在设置 → GTOP 接取任务 中配置默认环境与分支环境");
      setSettingsOpen(true);
      return;
    }
    const csvPath = await resolveTaskCsvPath(config.excelWorkspaceRoot);
    if (!csvPath) {
      push("未找到 Config/task.csv，请检查工作区路径");
      return;
    }
    const envLabel = config.gtopEnvName?.trim() || envId;
    const serverLabel = config.gtopRegionServerName?.trim() || regionId;
    const confirmMsg = `环境：${envLabel}\n区服：${serverLabel}\n本地文件：${csvPath}\n\n将上传原始 Task.csv 覆盖区服配置（不清空 PreTaskID）。\n\n继续？`;
    if (!window.confirm(confirmMsg)) return;

    setRestoreDefaultTaskCsvBusy(true);
    try {
      const result = await restoreDefaultTaskCsvViaGtop({ config, gtopLoggedIn });
      notify(result.toast, {
        action: "GTOP 恢复默认 task.csv",
        outcome: result.ok ? "success" : "failure",
        detail: result.ok ? undefined : result.message,
        context: `${envLabel} / ${serverLabel}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      notify(`恢复默认 task.csv 失败: ${msg}`, {
        action: "GTOP 恢复默认 task.csv",
        outcome: "failure",
        detail: msg,
        context: `${envLabel} / ${serverLabel}`,
      });
    } finally {
      setRestoreDefaultTaskCsvBusy(false);
    }
  }, [config, gtopLoggedIn, isTaskTableView, notify, push]);

  const completeNextTaskFromPinned = () => {
    if (activeView.kind !== "task") {
      push("请先打开全部任务并勾选要完成的任务");
      return;
    }
    void completeNextSelectedTask();
  };

  const completeTaskFromTemplate = (templateId: string) => {
    const viewId =
      activeView.kind === "template" || activeView.kind === "snapshot" ? activeView.id : null;
    if (viewId !== templateId || !currentAoa) {
      push("请先打开该模板并在表格中勾选要完成的任务");
      return;
    }
    void completeNextSelectedTask();
  };

  const pickFolder = async (title: string) => {
    const d = await open({ directory: true, multiple: false, title });
    return typeof d === "string" ? d : "";
  };

  const Wizard = () => {
    const [ex, setEx] = useState("");
    const [err, setErr] = useState<string | null>(null);

    const finish = async () => {
      setErr(null);
      const er = ex.trim();
      if (!er) {
        setErr("请配置 Excel 工作区");
        return;
      }
      const ip = excelItemPath(er);
      const mp = excelMissionPath(er);
      try {
        await invoke("read_file_base64", { path: ip });
        await invoke("read_file_base64", { path: mp });
      } catch {
        setErr(`Excel 文件未找到\n${ip}\n${mp}`);
        return;
      }
      const next = { ...defaultConfig(), excelWorkspaceRoot: er, gmAssistantLocalPath: "" };
      await invoke("save_config", { config: next });
      setConfig(next);
      setWizardOpen(false);
      void loadExcelData(next);
    };

    return (
      <div className="modal-back">
        <div className="modal">
          <h2>设置向导</h2>
          <p className="help">选择 Excel 工作区根目录，须包含 Excel\\Item.xlsx 与 Excel\\Mission.xlsx。</p>
          <div className="field">
            <label>Excel 工作区</label>
            <div className="path">{ex || "未选择"}</div>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => void pickFolder("选择 Excel 工作区").then(setEx)}>
                选择文件夹
              </button>
            </div>
          </div>
          {err ? <div className="error">{err}</div> : null}
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => void finish()}>
              保存并开始
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GtopLoginModal = () => {
    if (!gtopLoginModalOpen) return null;
    return (
      <div className="modal-back" onMouseDown={() => setGtopLoginModalOpen(false)}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <h2>GTOP 登录</h2>
          <p className="help">在内置浏览器完成登录后，点击「完成登录」保存 Cookie。</p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void openGtopLoginWindow()}>
              打开登录
            </button>
            <button type="button" className="btn primary" onClick={() => void completeGtopLogin()}>
              完成登录
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setGtopLoginModalOpen(false);
                void gtopCloseLoginWindow();
              }}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  };

  const HiddenFieldsPanel = () => {
    if (!hiddenPanel || !config) return null;
    const key = hiddenPanel === "item" ? "hiddenItemColumns" : "hiddenTaskColumns";
    const hs = hiddenPanel === "item" ? itemAoa?.[0]?.map((h) => cellStr(h)) ?? [] : taskAoa?.[0]?.map((h) => cellStr(h)) ?? [];
    const rawSaved = config[key];
    const savedHidden = rawSaved.filter((h) => !headerCannotHide(hiddenPanel, h));
    const draftCols = (hiddenPanelDraft ?? savedHidden).filter((h) => !headerCannotHide(hiddenPanel, h));
    const hidden = new Set(draftCols);
    const sortedJoin = (arr: string[]) => [...arr].sort().join("\0");
    const hadProtectedInConfig = rawSaved.some((h) => headerCannotHide(hiddenPanel, h));
    const applyDisabled = sortedJoin(draftCols) === sortedJoin(savedHidden) && !hadProtectedInConfig;

    return (
      <div
        className="modal-back"
        onMouseDown={() => {
          setHiddenPanel(null);
          setHiddenPanelDraft(null);
        }}
      >
        <div className="modal modal--sheet modal-hidden-fields" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-header-row">
            <h2>隐藏字段 · {hiddenPanel === "item" ? "道具" : "任务"}</h2>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setHiddenPanel(null);
                  setHiddenPanelDraft(null);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={applyDisabled}
                onClick={() =>
                  void (async () => {
                    if (!config) return;
                    const cols = (hiddenPanelDraft ?? savedHidden).filter((h) => !headerCannotHide(hiddenPanel, h));
                    let nextCfg: AppConfig = { ...config, [key]: cols };
                    if (hiddenPanel === "item" && nextCfg.freezeThroughItemHeader && cols.includes(nextCfg.freezeThroughItemHeader)) {
                      nextCfg = { ...nextCfg, freezeThroughItemHeader: null };
                    }
                    if (hiddenPanel === "task" && nextCfg.freezeThroughTaskHeader && cols.includes(nextCfg.freezeThroughTaskHeader)) {
                      nextCfg = { ...nextCfg, freezeThroughTaskHeader: null };
                    }
                    await persist(nextCfg);
                    setHiddenPanel(null);
                    setHiddenPanelDraft(null);
                    void loadExcelData(nextCfg, "refresh");
                  })()
                }
              >
                应用
              </button>
            </div>
          </div>
          <p className="help">勾选即隐藏该列；不可隐藏的列已禁用。点「应用」后写入配置并重新加载主表。</p>
          <div className="modal-scroll-body hidden-panel-list">
            {hs.map((h, i) => (
              <div key={`${i}-${h}`} className="hidden-panel-row">
                <span title={h}>{h || "(空)"}</span>
                {headerCannotHide(hiddenPanel, h) ? (
                  <>
                    <span className="muted">不可隐藏</span>
                    <span aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span className="muted">隐藏</span>
                    <input
                      type="checkbox"
                      checked={hidden.has(h)}
                      onChange={(e) => {
                        const nextH = new Set(hiddenPanelDraft ?? [...rawSaved]);
                        if (e.target.checked) nextH.add(h);
                        else nextH.delete(h);
                        setHiddenPanelDraft([...nextH].filter((x) => !headerCannotHide(hiddenPanel, x)));
                      }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const GmtLoginModal = () => {
    if (!gmtLoginModalOpen) return null;
    return (
      <div className="modal-back" onMouseDown={() => setGmtLoginModalOpen(false)}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <h2>GMT 登录</h2>
          <p className="help">
            将打开内置浏览器完成 Garena SSO 登录；完成后点「完成登录」保存 Cookie。
          </p>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void openGmtLoginWindow()}>
              打开登录
            </button>
            <button type="button" className="btn primary" onClick={() => void completeGmtLogin()}>
              完成登录
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setGmtLoginModalOpen(false);
                void gmtCloseLoginWindow();
              }}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GoGmtModalView = () => {
    if (!goGmtModal) return null;
    const { instruction, repeatVisit } = goGmtModal;
    return (
      <div className="modal-back" onMouseDown={() => setGoGmtModal(null)}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <h2>去 GMT 执行（需要手动挂载）</h2>
          <p className="help">
            {repeatVisit ? (
              <>
                ① 请去已打开的 GMT 页面，在 GM 助手输入框 <b>Ctrl+V</b> 粘贴指令（本次不再打开浏览器）。
              </>
            ) : (
              <>
                ① 指令已复制到剪贴板（见下方预览）。② 在 GM 助手输入框 <b>Ctrl+V</b> 粘贴即可。
              </>
            )}
          </p>
          <div className="field">
            <label>指令预览</label>
            <textarea className="bookmark" readOnly value={instruction} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={() => setGoGmtModal(null)}>
              知道了
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!config) {
    return <div className="empty">加载配置…</div>;
  }

  return (
    <div
      className={`app${isItemTableView ? " app--item-filter-bar" : ""}${isTaskTableView ? " app--task-filter-bar" : ""}${isRowTemplateDragging ? " app--row-template-dragging" : ""}`}
    >
      {wizardOpen ? <Wizard /> : null}
      {appUpdater.offer ? (
        <UpdateAvailableModal offer={appUpdater.offer} onDismiss={appUpdater.dismiss} />
      ) : null}
      {settingsOpen && config ? (
        <SettingsModal
          config={config}
          settingsOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onPersist={persist}
          onPurgeRecycledTemplate={(id) => void purgeRecycledTemplate(id)}
          onRestoreRecycledTemplate={(id) => void restoreRecycledTemplate(id)}
          onLoadExcelData={(next) => void loadExcelData(next)}
          gtopLoggedIn={gtopLoggedIn}
          onOpenGtopLogin={() => void openGtopLoginWindow()}
          onCompleteGtopLogin={() => void completeGtopLogin()}
          appUpdaterConfigured={appUpdater.configured}
          appUpdaterChecking={appUpdater.checking}
          appUpdaterStatusMessage={appUpdater.statusMessage}
          appUpdaterCurrentVersion={appUpdater.currentVersion}
          appUpdaterManifestUrl={appUpdater.manifestUrl}
          onAppUpdaterCheck={() => void appUpdater.runCheck(false)}
        />
      ) : null}
      {columnPickOpen && itemAoa && config ? (
        <ColumnPickModal
          headers={itemAoa[0]!.map((h) => cellStr(h))}
          onClose={() => setColumnPickOpen(false)}
          onPicked={(idx, name) => {
            setRemarkColIndex(idx);
            void persist({ ...config, itemRemarkColumn: name });
          }}
        />
      ) : null}
      <HiddenFieldsPanel />
      {templateNameModal ? (
        <div className="modal-back" onMouseDown={() => setTemplateNameModal(null)}>
          <div className="modal send-template-modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>保存为模板</h2>
            <p className="help">
              将保存当前勾选的 {templateNameModal.items.length} 种道具（含物品 ID 与数量）到左侧模板列表。
            </p>
            <div className="field">
              <label htmlFor="template-title-input">标题</label>
              <input
                id="template-title-input"
                type="text"
                className="bookmark"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={templateNameDraft}
                onChange={(e) => setTemplateNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitTemplateSave(templateNameDraft);
                  }
                }}
                autoFocus
              />
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setTemplateNameModal(null);
                  setTemplateNameDraft("");
                }}
              >
                取消
              </button>
              <button type="button" className="btn primary" onClick={() => void commitTemplateSave(templateNameDraft)}>
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {templateRenameModal ? (
        <div className="modal-back" onMouseDown={() => setTemplateRenameModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>重命名发送模板</h2>
            <div className="field">
              <label htmlFor="template-rename-input">名称</label>
              <input
                id="template-rename-input"
                type="text"
                className="bookmark"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={templateRenameModal.draft}
                onChange={(e) =>
                  setTemplateRenameModal((prev) => (prev ? { ...prev, draft: e.target.value } : null))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && templateRenameModal) {
                    e.preventDefault();
                    void commitTemplateRename(templateRenameModal.draft);
                  }
                }}
                autoFocus
              />
            </div>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setTemplateRenameModal(null)}>
                取消
              </button>
              <button type="button" className="btn primary" onClick={() => void commitTemplateRename(templateRenameModal.draft)}>
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingDeleteTemplate ? (
        <div className="modal-back" onMouseDown={() => setPendingDeleteTemplate(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <h2>移入回收站</h2>
            <p className="help">
              确定将发送模板「<span title={pendingDeleteTemplate.title}>{pendingDeleteTemplate.title}</span>」移入回收站？可在「设置 › 回收站」中彻底删除。
            </p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setPendingDeleteTemplate(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  const id = pendingDeleteTemplate.id;
                  setPendingDeleteTemplate(null);
                  void moveTemplateToRecycle(id);
                }}
              >
                移入回收站
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {sendTemplateModal ? (
        <div className="modal-back" onMouseDown={() => setSendTemplateModal(null)}>
          <div className="modal send-template-modal modal-send-template-preview modal--sheet" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h2>发送模板 · {sendTemplateModal.title}</h2>
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => setSendTemplateModal(null)}>
                  取消
                </button>
                <button
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
                </button>
              </div>
            </div>
            <p className="help">调整每种道具数量（1–9999）后发送。</p>
            <div className="modal-scroll-body">
            <div className="send-template-table-wrap">
              <table className="send-template-table">
                <thead>
                  <tr>
                    <th>物品 ID</th>
                    <th>名称/备注</th>
                    <th>数量</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sendTemplateModal.draftItems.map((it, idx) => (
                    <tr key={`${it.itemId}-${idx}`}>
                      <td>{it.itemId}</td>
                      <td>{it.label?.trim() ? it.label : "—"}</td>
                      <td>
                        <input
                          type="number"
                          className="bookmark item-filter-num"
                          min={1}
                          max={9999}
                          value={it.qty}
                          onChange={(e) => {
                            const t = e.target.value.trim();
                            const n = t === "" ? 1 : Number(t);
                            const qty = Number.isFinite(n) ? Math.min(9999, Math.max(1, Math.floor(n))) : it.qty;
                            setSendTemplateModal((m) =>
                              m
                                ? {
                                    ...m,
                                    draftItems: m.draftItems.map((row, i) => (i === idx ? { ...row, qty } : row)),
                                  }
                                : m,
                            );
                          }}
                        />
                      </td>
                      <td className="send-template-qty-btns">
                        <button
                          type="button"
                          className="btn btn-tiny"
                          onClick={() =>
                            setSendTemplateModal((m) =>
                              m
                                ? {
                                    ...m,
                                    draftItems: m.draftItems.map((row, i) =>
                                      i === idx ? { ...row, qty: Math.max(1, row.qty - 1) } : row,
                                    ),
                                  }
                                : m,
                            )
                          }
                        >
                          -
                        </button>
                        <button
                          type="button"
                          className="btn btn-tiny"
                          onClick={() =>
                            setSendTemplateModal((m) =>
                              m
                                ? {
                                    ...m,
                                    draftItems: m.draftItems.map((row, i) =>
                                      i === idx ? { ...row, qty: Math.min(9999, row.qty + 1) } : row,
                                    ),
                                  }
                                : m,
                            )
                          }
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </div>
      ) : null}
      <GlobalSendMailModal
        open={globalSendModal != null}
        hintTitle={globalSendModal?.hint}
        initialItems={globalSendModal?.items ?? []}
        lastForm={config.globalSendLastForm ?? null}
        defaultRegion={config.gmtLockRegion}
        gmtTradable={config.gmtTradable}
        submitting={globalSendSubmitting}
        onClose={() => setGlobalSendModal(null)}
        onSaveLastForm={saveGlobalSendLastForm}
        onSubmit={(payload) => void submitGlobalSend(payload)}
      />
      <ModifyItemPriceModal
        open={itemPriceModal != null}
        itemId={itemPriceModal?.itemId ?? ""}
        initialBaseValue={itemPriceModal?.baseValue ?? ""}
        initialStdPrice={itemPriceModal?.stdPrice ?? ""}
        submitting={itemPriceSubmitting}
        onClose={() => !itemPriceSubmitting && setItemPriceModal(null)}
        onSubmit={(payload) => void submitItemPriceModal(payload)}
      />
      {itemFilterModalOpen && config ? (
        <div className="modal-back modal-filter-back" onMouseDown={() => dismissItemFilterModal()}>
          <div className="modal modal-item-filter modal-filter-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-filter-sheet-inner">
              <div className="modal-filter-head">
                <h2>筛选 — 道具</h2>
                <div className="btn-row modal-filter-head-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setItemFilterDraft((d) => clearItemFilterSelectionsKeepOrder(d))}
                  >
                    清空
                  </button>
                  <button type="button" className="btn" onClick={() => dismissItemFilterModal()}>
                    取消
                  </button>
                  <button type="button" className="btn primary" onClick={() => void commitItemFilterSave()}>
                    保存
                  </button>
                </div>
              </div>
              <div className="filter-quick-search-block">
                {itemFilterChipSaveHint ? (
                  <p className="filter-chip-save-hint" role="status">
                    {itemFilterChipSaveHint}
                  </p>
                ) : null}
                <div className="filter-quick-search-row">
                  <input
                    id="item-filter-quick"
                    ref={itemFilterQuickInputRef}
                    type="search"
                    className="filter-quick-search"
                    placeholder="Ctrl+F 搜索任意列（Enter 保存到自定义筛选）"
                    value={itemFilterQuickQuery}
                    onChange={(e) => setItemFilterQuickQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveItemCustomKeywordFromDraft();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-save-filter-chip"
                    onClick={() => saveItemCustomKeywordFromDraft()}
                  >
                    保存到筛选项
                  </button>
                </div>
              </div>
              <p className="help modal-filter-help">
                选项随当前表格数据更新。各区块条件之间为「且」；类型、物品品质同列多选为「或」；自定义筛选同列多选为「且」。顶栏第一行可保存关键字为 Chip；**Enter** 或 **保存到筛选项** 将关键字写入自定义筛选并选中（与类型等为且）。防护值：「无」指单元格为空；「范围内」指可解析为数字且在区间内（可只填最小或最大）。类型区块内「赛季物品」：列值为 **1** 表示赛季物品。
              </p>
              <FilterSectionDnDList<ItemFilterSectionId>
                order={itemFilterSectionOrder}
                onReorder={(next) => setItemFilterDraft((d) => ({ ...d, sectionOrder: next }))}
                rowClassForId={(id) => (id === "typeRemark" ? " filter-section-dnd-row--grow" : " filter-section-dnd-row--static")}
                renderSection={(id) => {
                  if (id === "typeRemark") {
                    const typeRemarkSectionDisabled =
                      itemFilterColIdx.tr < 0 && itemFilterColIdx.remark < 0 && itemFilterColIdx.season < 0;
                    const typeRemarkOnlyEmote =
                      itemFilterColIdx.tr < 0 && itemFilterColIdx.remark >= 0;
                    return (
                      <div className={`item-filter-section item-filter-section--grow${typeRemarkSectionDisabled ? " item-filter-section--disabled" : ""}`}>
                        <div className="item-filter-h3-row">
                          <h3 className="item-filter-h3">类型</h3>
                          {itemFilterColIdx.tr >= 0 ? (
                            <button
                              type="button"
                              className="btn btn-tiny"
                              onClick={() => setItemFilterDraft((d) => ({ ...d, typeRemarkKeyOrder: null }))}
                            >
                              恢复默认排序
                            </button>
                          ) : null}
                        </div>
                        {typeRemarkSectionDisabled ? (
                          <p className="help muted">当前表无「类型备注」「备注」与「赛季物品」列，该条件不可用。</p>
                        ) : (
                          <>
                            {typeRemarkOnlyEmote ? (
                              <p className="help muted" style={{ marginBottom: "0.35rem" }}>
                                当前表无「类型备注」列，仅可使用预设 Emote（按「备注」列筛选）。
                              </p>
                            ) : null}
                            {itemFilterColIdx.tr >= 0 || itemFilterColIdx.remark >= 0 ? (
                              <p className="help muted" style={{ marginBottom: "0.35rem" }}>
                                预设「Emote」按「备注」列匹配：保留「动作名+Emote」（如秀肌肉Emote、贵族礼仪Emote）；排除含「大红检视」的 Emote（如大红检视Emote…）。其它选项仍按「类型备注」列。
                              </p>
                            ) : null}
                            {itemFilterColIdx.tr >= 0 || itemFilterColIdx.remark >= 0 ? (
                              <div ref={itemFilterTypeRemarkScrollRef} className="item-filter-section-grid-wrap">
                                <FilterOptionGrid
                                  items={itemTypeRemarkDisplayKeys}
                                  selectedKeys={itemFilterDraft.typeRemarkKeys}
                                  labelPrefix={typeRemarkLabelPrefix}
                                  onToggle={(opt) =>
                                    setItemFilterDraft((d) => {
                                      const s = new Set(d.typeRemarkKeys);
                                      if (s.has(opt)) s.delete(opt);
                                      else s.add(opt);
                                      return { ...d, typeRemarkKeys: [...s] };
                                    })
                                  }
                                />
                              </div>
                            ) : null}
                            {itemFilterColIdx.season >= 0 ? (
                              <label className="item-filter-row item-filter-row--large" style={{ marginTop: "0.5rem" }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(itemFilterDraft.seasonItemOnly)}
                                  onChange={(e) =>
                                    setItemFilterDraft((d) => ({ ...d, seasonItemOnly: e.target.checked }))
                                  }
                                />
                                <span>赛季物品</span>
                              </label>
                            ) : null}
                          </>
                        )}
                      </div>
                    );
                  }
                  if (id === "quality") {
                    return (
                      <div className={`item-filter-section item-filter-section--static${itemFilterColIdx.qual < 0 ? " item-filter-section--disabled" : ""}`}>
                        <div className="item-filter-h3-row">
                          <h3 className="item-filter-h3">物品品质</h3>
                          {itemFilterColIdx.qual >= 0 ? (
                            <button
                              type="button"
                              className="btn btn-tiny"
                              onClick={() => setItemFilterDraft((d) => ({ ...d, qualityKeyOrder: null }))}
                            >
                              恢复默认排序
                            </button>
                          ) : null}
                        </div>
                        {itemFilterColIdx.qual < 0 ? (
                          <p className="help muted">当前表无「物品品质」列，该条件不可用。</p>
                        ) : (
                          <div className="item-filter-section-grid-wrap item-filter-section-grid-wrap--static">
                            <FilterOptionGrid
                              items={itemQualityDisplayKeys}
                              selectedKeys={itemFilterDraft.qualityKeys}
                              qualityDots
                              onToggle={(opt) =>
                                setItemFilterDraft((d) => {
                                  const s = new Set(d.qualityKeys);
                                  if (s.has(opt)) s.delete(opt);
                                  else s.add(opt);
                                  return { ...d, qualityKeys: [...s] };
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="item-filter-section item-filter-section--static">
                      <h3 className="item-filter-h3">防护值</h3>
                      {itemFilterColIdx.def < 0 ? (
                        <p className="help muted">当前表无「防护值」列，该条件不可用。</p>
                      ) : (
                        <>
                          <label className="item-filter-row item-filter-row--large">
                            <input
                              type="checkbox"
                              checked={itemFilterDraft.defenseNone}
                              onChange={(e) => setItemFilterDraft((d) => ({ ...d, defenseNone: e.target.checked }))}
                            />
                            <span>无防护值（单元格为空）</span>
                          </label>
                          <label className="item-filter-row item-filter-row--large">
                            <input
                              type="checkbox"
                              checked={itemFilterDraft.defenseRange}
                              onChange={(e) => setItemFilterDraft((d) => ({ ...d, defenseRange: e.target.checked }))}
                            />
                            <span>范围内（含边界）</span>
                          </label>
                          <div className="item-filter-range-row">
                            <label>
                              最小
                              <input
                                type="number"
                                className="bookmark item-filter-num"
                                disabled={!itemFilterDraft.defenseRange}
                                value={itemFilterDraft.defenseMin ?? ""}
                                onChange={(e) => {
                                  const t = e.target.value.trim();
                                  setItemFilterDraft((d) =>
                                    t === ""
                                      ? { ...d, defenseMin: null }
                                      : { ...d, defenseMin: Number.isFinite(Number(t)) ? Number(t) : d.defenseMin },
                                  );
                                }}
                              />
                            </label>
                            <label>
                              最大
                              <input
                                type="number"
                                className="bookmark item-filter-num"
                                disabled={!itemFilterDraft.defenseRange}
                                value={itemFilterDraft.defenseMax ?? ""}
                                onChange={(e) => {
                                  const t = e.target.value.trim();
                                  setItemFilterDraft((d) =>
                                    t === ""
                                      ? { ...d, defenseMax: null }
                                      : { ...d, defenseMax: Number.isFinite(Number(t)) ? Number(t) : d.defenseMax },
                                  );
                                }}
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
      {taskFilterModalOpen && config ? (
        <div className="modal-back modal-filter-back" onMouseDown={() => dismissTaskFilterModal()}>
          <div className="modal modal-item-filter modal-filter-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-filter-sheet-inner">
              <div className="modal-filter-head">
                <h2>筛选 — 任务</h2>
                <div className="btn-row modal-filter-head-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setTaskFilterDraft((d) => clearTaskFilterSelectionsKeepOrder(d))}
                  >
                    清空
                  </button>
                  <button type="button" className="btn" onClick={() => dismissTaskFilterModal()}>
                    取消
                  </button>
                  <button type="button" className="btn primary" onClick={() => void commitTaskFilterSave()}>
                    保存
                  </button>
                </div>
              </div>
              <div className="filter-quick-search-block">
                {taskFilterChipSaveHint ? (
                  <p className="filter-chip-save-hint" role="status">
                    {taskFilterChipSaveHint}
                  </p>
                ) : null}
                <div className="filter-quick-search-row">
                  <input
                    id="task-filter-quick"
                    ref={taskFilterQuickInputRef}
                    type="search"
                    className="filter-quick-search"
                    placeholder="Ctrl+F 搜索任意列（Enter 保存到自定义筛选）"
                    value={taskFilterQuickQuery}
                    onChange={(e) => setTaskFilterQuickQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveTaskCustomKeywordFromDraft();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-save-filter-chip"
                    onClick={() => saveTaskCustomKeywordFromDraft()}
                  >
                    保存到筛选项
                  </button>
                </div>
              </div>
              <p className="help modal-filter-help">
                选项随当前表格数据更新。三列条件之间为「且」；任务类型、任务链同列多选为「或」；自定义筛选同列多选为「且」。顶栏可保存关键字为 Chip；**Enter** 或 **保存到筛选项** 将关键字写入自定义筛选并选中。选项行左侧 ⋮⋮ 可拖拽调整选项顺序；区块行左侧 ⋮⋮ 可拖拽调整任务类型 / 任务链顺序，保存后写入配置。
              </p>
              <FilterSectionDnDList<TaskFilterSectionId>
                order={taskFilterSectionOrder}
                onReorder={(next) => setTaskFilterDraft((d) => ({ ...d, sectionOrder: next }))}
                rowClassForId={() => " filter-section-dnd-row--grow"}
                renderSection={(id) => {
                  if (id === "taskType") {
                    return (
                      <div className={`item-filter-section item-filter-section--grow${taskFilterColIdx.tt < 0 ? " item-filter-section--disabled" : ""}`}>
                        <div className="item-filter-h3-row">
                          <h3 className="item-filter-h3">任务类型（TaskType）</h3>
                          {taskFilterColIdx.tt >= 0 ? (
                            <button
                              type="button"
                              className="btn btn-tiny"
                              onClick={() => setTaskFilterDraft((d) => ({ ...d, taskTypeKeyOrder: null }))}
                            >
                              恢复默认排序
                            </button>
                          ) : null}
                        </div>
                        {taskFilterColIdx.tt < 0 ? (
                          <p className="help muted">当前表无「TaskType」或「任务类型」列，该条件不可用。</p>
                        ) : (
                          <div className="item-filter-scroll item-filter-scroll--flex">
                            <FilterDnDOptionList
                              items={taskTypeDisplayKeys}
                              selectedKeys={taskFilterDraft.taskTypeKeys}
                              onToggle={(opt) =>
                                setTaskFilterDraft((d) => {
                                  const s = new Set(d.taskTypeKeys);
                                  if (s.has(opt)) s.delete(opt);
                                  else s.add(opt);
                                  return { ...d, taskTypeKeys: [...s] };
                                })
                              }
                              onReorderKeys={(orderedKeys) => setTaskFilterDraft((d) => ({ ...d, taskTypeKeyOrder: orderedKeys }))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className={`item-filter-section item-filter-section--grow${taskFilterColIdx.ch < 0 ? " item-filter-section--disabled" : ""}`}>
                      <div className="item-filter-h3-row">
                        <h3 className="item-filter-h3">任务链</h3>
                        {taskFilterColIdx.ch >= 0 ? (
                          <button
                            type="button"
                            className="btn btn-tiny"
                            onClick={() => setTaskFilterDraft((d) => ({ ...d, chainKeyOrder: null }))}
                          >
                            恢复默认排序
                          </button>
                        ) : null}
                      </div>
                      {taskFilterColIdx.ch < 0 ? (
                        <p className="help muted">当前表无「任务链」列，该条件不可用。</p>
                      ) : (
                        <div className="item-filter-scroll item-filter-scroll--flex">
                          <FilterDnDOptionList
                            items={taskChainDisplayKeys}
                            selectedKeys={taskFilterDraft.chainKeys}
                            onToggle={(opt) =>
                              setTaskFilterDraft((d) => {
                                const s = new Set(d.chainKeys);
                                if (s.has(opt)) s.delete(opt);
                                else s.add(opt);
                                return { ...d, chainKeys: [...s] };
                              })
                            }
                            onReorderKeys={(orderedKeys) => setTaskFilterDraft((d) => ({ ...d, chainKeyOrder: orderedKeys }))}
                          />
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
            <GoGmtModalView />
      <GmtLoginModal />
      <GtopLoginModal />

      <header className="topbar">
        <div className="topbar-left">
          <img className="topbar-logo" src="/app-icon.svg" alt="" width={26} height={26} />
          <h1>easydone</h1>
          {excelBackgroundBusy ? (
            <span className="topbar-excel-sync-hint muted" role="status">
              同步中…
            </span>
          ) : null}
          <button
            type="button"
            className="btn"
            disabled={wizardOpen || !config?.excelWorkspaceRoot?.trim() || excelBackgroundBusy}
            onClick={() => {
              if (!config?.excelWorkspaceRoot?.trim()) return;
              selectionByViewRef.current.delete("item");
              selectionByViewRef.current.delete("task");
              clearRowSelection();
              setItemLineQty({});
              void (async () => {
                const ok = await loadExcelData(config, "refresh");
                if (ok) push("已从磁盘重新加载表格");
              })();
            }}
          >
            刷新
          </button>
          <button
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
              清空全部筛选
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
        </div>
        {!wizardOpen ? (
          <div className="gmt-bar">
            <span className={`gmt-status${gmtLoggedIn ? " gmt-status--ok" : ""}`}>
              {gmtSessionChecking ? "GMT…" : gmtLoggedIn ? "GMT 已登录" : "GMT 未登录"}
            </span>
            <button type="button" className="btn btn-sm" disabled={gmtSessionChecking} onClick={() => void openGmtLoginWindow()}>
              {gmtLoggedIn ? "重新登录" : "登录"}
            </button>
            <span className="gmt-field">
              <span className="gmt-field-label">分支环境</span>
              <select
                className="gmt-select"
                disabled={!gmtLoggedIn || gmtEnvs.length === 0}
                value={config.gmtEnvId != null ? String(config.gmtEnvId) : ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (!Number.isFinite(id)) return;
                  const env = gmtEnvs.find((x) => x.id === id);
                  if (!env) return;
                  void persist({ ...config, gmtEnvId: env.id, gmtEnvName: env.name });
                }}
              >
                <option value="">请选择</option>
                {gmtEnvs.map((env) => (
                  <option key={env.id} value={String(env.id)}>
                    {formatBranchEnvOptionLabel(env.name, env.id, gmtEnvDisplayLabelMap)}
                  </option>
                ))}
              </select>
            </span>
            <span className="gmt-field">
              <span className="gmt-field-label">账号</span>
              <input
                className="gmt-input"
                type="text"
                placeholder="ID"
                value={gmtAccountIdDraft}
              onChange={(e) => setGmtAccountIdDraft(e.target.value)}
              onBlur={() => commitGmtAccountIdDraft()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              />
            </span>
            <label className="gmt-tradable">
              <input
                type="checkbox"
                checked={config.gmtTradable}
                onChange={(e) => void persist({ ...config, gmtTradable: e.target.checked })}
              />
              可交易
            </label>
            {isItemTableView ? (
              <span
                className={`gmt-send-hint${gmtItemSendReadiness.ready ? " gmt-send-hint--ok" : " gmt-send-hint--blocked"}`}
              >
                {gmtItemSendReadiness.message}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="topbar-right-actions" ref={logPanelRef}>
          <TopbarUpdateControls
            currentVersion={appUpdater.currentVersion}
            configured={appUpdater.configured}
            checking={appUpdater.checking}
            onCheck={async () => {
              const msg = await appUpdater.runCheck(false);
              if (msg) push(msg);
            }}
          />
          <button
            type="button"
            className={`btn${logPanelOpen ? " active" : ""}`}
            disabled={wizardOpen}
            onClick={(e) => {
              e.stopPropagation();
              setLogPanelOpen((o) => !o);
            }}
          >
            日志
          </button>
          {logPanelOpen ? (
            <OperationLogPanel entries={operationLogEntries} onClear={clearLog} />
          ) : null}
          <button type="button" className="btn" disabled={wizardOpen} onClick={() => setSettingsOpen(true)}>
            设置
          </button>
        </div>
      </header>

      <div className="body">
        <Sidebar
          config={config}
          activeView={activeView}
          filterSheetOpen={filterSheetOpen}
          onSelectItem={() => switchActiveView({ kind: "item" })}
          onSelectTask={() => switchActiveView({ kind: "task" })}
          onSelectTemplate={(id) => switchActiveView({ kind: "template", id })}
          onPersist={persist}
          onOpenHiddenPanel={(panel) => {
            setColumnHeaderMenu(null);
            setHiddenPanel(panel);
          }}
          onTemplateRename={(id, title) => {
            setTemplateRenameModal({ id, draft: title });
          }}
          onTemplateDelete={(id, title) => {
            setPendingDeleteTemplate({ id, title });
          }}
          onSendTemplateNow={(title, items) => void sendTemplateItemsNow(title, items)}
          onBatchSend={(templateId, title, items) =>
            setSendTemplateModal({
              templateId,
              title,
              draftItems: items.map((it) => ({ ...it })),
            })
          }
          onSendTemplateSelected={(templateId) => void sendTemplateSelectedRows(templateId)}
          onGlobalSendTemplate={(title, items) => openGlobalSendDialog(items, `模板「${title}」`)}
          onCompleteTaskFromTemplate={completeTaskFromTemplate}
          onAcceptTasksFromTemplate={acceptTasksFromTemplate}
          onCompleteNextTaskFromPinned={completeNextTaskFromPinned}
          serverWideSendEnabled={itemServerWideUi.entriesEnabled}
          addExpAccent={config ? sidebarAddExpDefaultColor(config) : DEFAULT_SIDEBAR_ADD_EXP_CARD_COLOR}
          onSelectAddExp={() => {
            if (filterSheetOpen) return;
            switchActiveView({ kind: "addExp" });
          }}
          addExpPresetBusy={addExpPresetBusy}
          onAddExpPresetMaxLevel={() => void runSidebarAddExpPreset(runAddExpPresetMaxLevel)}
          onAddExpPresetRich={() => void runSidebarAddExpPreset(runAddExpPresetRich)}
          onAddExpPresetRichAndMaxLevel={() =>
            void runSidebarAddExpPreset(runAddExpPresetRichAndMaxLevel)
          }
          onCloseMenus={() => closeCtx()}
          templateDropHoverId={templateDropHoverId}
          templateDropRejectId={templateDropRejectId}
        />
        <div className="main-column">
          {isItemTableView && config ? (
            <ItemFilterChipBar
              customKeywordSelected={activeItemFilterForChip.customKeywordKeys}
              customKeywordPinned={[...chipItemCustomKeywordPinned]}
              customKeywordMore={chipItemCustomKeywordMore}
              onToggleCustomKeyword={toggleItemFilterCustomKeywordKey}
              onReorderCustomKeywordPinned={(orderedKeys) =>
                updateItemFilterPersist((d) => ({
                  ...d,
                  chipBarCustomKeywordOrder: sanitizeChipBarOrder(orderedKeys, itemCustomKeywordAll),
                }))
              }
              onDemoteCustomKeyword={(key) =>
                updateItemFilterPersist((d) => ({
                  ...d,
                  chipBarCustomKeywordOrder: sanitizeChipBarOrder(
                    chipItemCustomKeywordPinned.filter((k) => k !== key),
                    itemCustomKeywordAll,
                  ),
                }))
              }
              onRemoveCustomKeyword={removeItemCustomKeyword}
              onClearCustomKeywords={clearItemFilterCustomKeywords}
              customKeywordClearDisabled={activeItemFilterForChip.customKeywordKeys.length === 0}
              typeRemarkSelected={chipTypeRemarkSelectedKeys}
              qualitySelected={activeItemFilterForChip.qualityKeys}
              typeRemarkPinned={[...chipTypeRemarkPinned]}
              typeRemarkMore={chipTypeRemarkMore}
              qualityBarKeys={chipQualityBarKeys}
              onReorderTypeRemark={(orderedKeys) =>
                updateItemFilterPersist((d) => ({
                  ...d,
                  chipBarTypeRemarkOrder: sanitizeChipBarOrder(orderedKeys, chipTypeRemarkBarValidKeys),
                }))
              }
              onDemoteTypeRemark={(key) =>
                updateItemFilterPersist((d) => ({
                  ...d,
                  chipBarTypeRemarkOrder: sanitizeChipBarOrder(
                    chipTypeRemarkPinned.filter((k) => k !== key),
                    chipTypeRemarkBarValidKeys,
                  ),
                }))
              }
              onReorderQuality={(orderedKeys) =>
                updateItemFilterPersist((d) => ({ ...d, chipBarQualityOrder: orderedKeys }))
              }
              onDemoteQuality={(key) =>
                updateItemFilterPersist((d) => ({
                  ...d,
                  chipBarQualityOrder: chipQualityBarKeys.filter((k) => k !== key),
                }))
              }
              showEmotePin={itemFilterColIdx.remark >= 0}
              showTypeRemarkPins={itemFilterColIdx.tr >= 0}
              showQualityRow={itemFilterColIdx.qual >= 0}
              showSeasonRow={itemFilterColIdx.season >= 0}
              onToggleTypeRemark={toggleItemFilterTypeRemarkChip}
              onToggleQuality={toggleItemFilterQualityKey}
              onClearTypeRemark={clearItemFilterTypeRemark}
              onClearQuality={clearItemFilterQuality}
              typeRemarkClearDisabled={
                activeItemFilterForChip.typeRemarkKeys.length === 0 &&
                !activeItemFilterForChip.seasonItemOnly
              }
              qualityClearDisabled={activeItemFilterForChip.qualityKeys.length === 0}
              typeRemarkLabelPrefix={typeRemarkLabelPrefix}
            />
          ) : null}
          {isTaskTableView && config ? (
            <TaskFilterChipBar
              onRestoreDefaultTaskCsv={() => void restoreDefaultTaskCsv()}
              restoreDefaultBusy={restoreDefaultTaskCsvBusy}
              customKeywordSelected={activeTaskFilterForChip.customKeywordKeys}
              customKeywordPinned={[...chipTaskCustomKeywordPinned]}
              customKeywordMore={chipTaskCustomKeywordMore}
              onToggleCustomKeyword={toggleTaskFilterCustomKeywordKey}
              onReorderCustomKeywordPinned={(orderedKeys) =>
                updateTaskFilterPersist((d) => ({
                  ...d,
                  chipBarCustomKeywordOrder: sanitizeChipBarOrder(orderedKeys, taskCustomKeywordAll),
                }))
              }
              onDemoteCustomKeyword={(key) =>
                updateTaskFilterPersist((d) => ({
                  ...d,
                  chipBarCustomKeywordOrder: sanitizeChipBarOrder(
                    chipTaskCustomKeywordPinned.filter((k) => k !== key),
                    taskCustomKeywordAll,
                  ),
                }))
              }
              onRemoveCustomKeyword={removeTaskCustomKeyword}
              onClearCustomKeywords={clearTaskFilterCustomKeywords}
              customKeywordClearDisabled={activeTaskFilterForChip.customKeywordKeys.length === 0}
              taskTypeSelected={activeTaskFilterForChip.taskTypeKeys}
              chainSelected={activeTaskFilterForChip.chainKeys}
              taskTypePinned={[...chipTaskTypePinned]}
              taskTypeMore={chipTaskTypeMore}
              chainPinned={[...chipChainPinned]}
              chainMore={chipChainMore}
              showTaskTypeRow={taskFilterColIdx.tt >= 0}
              showChainRow={taskFilterColIdx.ch >= 0}
              onToggleTaskType={toggleTaskFilterTaskTypeKey}
              onToggleChain={toggleTaskFilterChainKey}
              onReorderTaskTypePinned={(orderedKeys) =>
                updateTaskFilterPersist((d) => ({
                  ...d,
                  chipBarTaskTypeOrder: sanitizeChipBarOrder(orderedKeys, chipTaskTypeOptions),
                }))
              }
              onDemoteTaskType={(key) =>
                updateTaskFilterPersist((d) => ({
                  ...d,
                  chipBarTaskTypeOrder: sanitizeChipBarOrder(
                    chipTaskTypePinned.filter((k) => k !== key),
                    chipTaskTypeOptions,
                  ),
                }))
              }
              onReorderChainPinned={(orderedKeys) =>
                updateTaskFilterPersist((d) => ({
                  ...d,
                  chipBarChainOrder: sanitizeChipBarOrder(orderedKeys, chipChainOptions),
                }))
              }
              onDemoteChain={(key) =>
                updateTaskFilterPersist((d) => ({
                  ...d,
                  chipBarChainOrder: sanitizeChipBarOrder(
                    chipChainPinned.filter((k) => k !== key),
                    chipChainOptions,
                  ),
                }))
              }
              onClearTaskType={clearTaskFilterTaskType}
              onClearChain={clearTaskFilterChain}
              taskTypeClearDisabled={activeTaskFilterForChip.taskTypeKeys.length === 0}
              chainClearDisabled={activeTaskFilterForChip.chainKeys.length === 0}
            />
          ) : null}
          <main className="main">
          {loadError ? (
            <div className="error" style={{ marginBottom: "0.5rem" }}>
              {loadError}
            </div>
          ) : null}
          {activeView.kind === "addExp" && config ? (
            <AddExpPanel
              config={config}
              cumulativeByLevel={accountLevelByLevel}
              cumulativeLoadError={accountLevelParseError}
              gmtAccountIdDraft={gmtAccountIdDraft}
              setGmtAccountIdDraft={setGmtAccountIdDraft}
              commitGmtAccountIdDraft={commitGmtAccountIdDraft}
              ensureGmtLoggedIn={ensureGmtLoggedIn}
              logGmt={logGmt}
            />
          ) : !currentAoa ? (
            <div className="empty">
              {wizardOpen
                ? "请先完成设置向导"
                : !config.excelWorkspaceRoot?.trim()
                  ? "无数据"
                  : loadError
                    ? "暂无表格数据"
                    : itemAoa == null && taskAoa == null
                      ? excelLoadMessageModeRef.current === "refresh"
                        ? "无数据"
                        : "获取本地数据中…"
                      : "无数据"}
            </div>
          ) : (
            <>
              <div
                className="table-scroll-y"
                ref={tableScrollRef}
                onContextMenu={onTableContextMenu}
              >
              <div className="table-selection-meta-bar" ref={tableMetaBarRef} role="status">
                <div className="table-selection-meta-inner">
                  <span className="table-selection-meta-total">
                    合计：<strong>{visibleSelectedCount}</strong>行
                  </span>
                  <div className="table-selection-meta-actions">
                    <button
                      type="button"
                      className="btn btn-tiny"
                      disabled={selectableVisibleDataIdxs.length === 0}
                      onClick={() => toggleSelectAllVisible()}
                      aria-label={
                        selectableVisibleDataIdxs.length > 0
                          ? someVisibleSelected
                            ? `取消勾选当前可见行（已选 ${visibleSelectedCount}/${selectableVisibleDataIdxs.length}）`
                            : `全选当前 ${selectableVisibleDataIdxs.length} 行`
                          : "全选"
                      }
                    >
                      {someVisibleSelected
                        ? `取消勾选（${visibleSelectedCount}/${selectableVisibleDataIdxs.length}）`
                        : `全选（${selectableVisibleDataIdxs.length}）`}
                    </button>
                    <button
                      type="button"
                      className="btn btn-tiny"
                      disabled={visibleSelectedCount === 0}
                      onClick={() => clearRowSelection()}
                    >
                      重置已勾选
                    </button>
                    <button
                      type="button"
                      className="btn btn-tiny"
                      disabled={
                        (visibleSelectedCount === 0 && !pinActive) ||
                        !(isItemTableView || isTaskTableView)
                      }
                      onClick={() => handlePinButtonClick()}
                    >
                      {visibleSelectedCount > 0
                        ? "置顶已勾选"
                        : pinActive
                          ? "取消置顶"
                          : "置顶已勾选"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="table-scroll-viewport">
              <div
                className="table-scroll-body"
                ref={tableScrollBodyRef}
                onPointerDown={beginBoxSelect}
                onWheel={onTableBodyWheel}
              >
                <div
                  className="table-scroll-content"
                  ref={tableScrollContentRef}
                  style={{ marginLeft: -tableScrollLeft }}
                >
              <table
                ref={tableDataRef}
                className={`data${isItemTableView ? " data-item-qty" : ""}${freezeVisIdx >= 0 ? " data-col-freeze" : ""}`}
              >
                <thead>
                  <tr>
                    <th className="row-check">
                      <div className="row-check-inner">
                        <input
                          ref={selectAllCheckboxRef}
                          type="checkbox"
                          disabled={selectableVisibleDataIdxs.length === 0}
                          checked={allVisibleSelected}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleSelectAllVisible();
                          }}
                          aria-label={
                            selectableVisibleDataIdxs.length > 0
                              ? someVisibleSelected
                                ? `取消勾选当前可见行（已选 ${visibleSelectedCount}/${selectableVisibleDataIdxs.length}）`
                                : `全选当前 ${selectableVisibleDataIdxs.length} 行`
                              : "全选"
                          }
                        />
                        {isItemTableView ? <span className="item-qty-header-gap" aria-hidden /> : null}
                      </div>
                    </th>
                    <th
                      className="row-num"
                      style={
                        freezeVisIdx >= 0 && stickyCellLeftPx.length > 1
                          ? { left: stickyCellLeftPx[1] }
                          : undefined
                      }
                    >
                      #
                    </th>
                    {visibleColIndices.map((ci, visIdx) => {
                      const name = headers[ci] ?? "";
                      const cellIdx = 2 + visIdx;
                      const inFreeze =
                        freezeVisIdx >= 0 &&
                        visIdx <= freezeVisIdx &&
                        stickyCellLeftPx.length > cellIdx;
                      const leftPx = inFreeze ? stickyCellLeftPx[cellIdx]! : undefined;
                      const edge = inFreeze && visIdx === freezeVisIdx;
                      const freezeCn = inFreeze ? `col-freeze${edge ? " col-freeze-edge" : ""}` : undefined;
                      const sortBtns = (
                        <span className="th-sort-btns">
                          <button
                            type="button"
                            className={`th-sort-btn${tableSort?.colIndex === ci && tableSort.descending ? " active" : ""}`}
                            title="降序"
                            aria-label={`${name || `列${ci + 1}`} 降序`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTableSort({ colIndex: ci, descending: true });
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className={`th-sort-btn${tableSort?.colIndex === ci && !tableSort.descending ? " active" : ""}`}
                            title="升序"
                            aria-label={`${name || `列${ci + 1}`} 升序`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTableSort({ colIndex: ci, descending: false });
                            }}
                          >
                            ↑
                          </button>
                        </span>
                      );
                      return (
                        <th
                          key={ci}
                          className={freezeCn}
                          style={leftPx !== undefined ? { left: leftPx } : undefined}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCtxMenu(null);
                                                        setColumnHeaderMenu({ x: e.clientX, y: e.clientY, headerName: name });
                          }}
                        >
                          {activeView.kind === "template" || activeView.kind === "snapshot" ? (
                            <div className="th-inner">
                              <span>{name || `列${ci + 1}`}</span>
                              {sortBtns}
                            </div>
                          ) : (activeView.kind === "item" || activeView.kind === "task") &&
                            headerCannotHide(activeView.kind, name) ? (
                            <div className="th-inner">
                              <span>{name || `列${ci + 1}`}</span>
                              {sortBtns}
                            </div>
                          ) : (
                            <div className="th-inner">
                              <span>{name || `列${ci + 1}`}</span>
                              {sortBtns}
                              <span className="muted">隐藏</span>
                              <input
                                type="checkbox"
                                checked={hiddenSet.has(name)}
                                onChange={(e) => void toggleHideColumn(name, e.target.checked)}
                                title="隐藏此列"
                              />
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <DataTableBody
                  scrollRef={tableScrollBodyRef}
                  rows={displayBodyRows}
                  visibleColIndices={visibleColIndices}
                  isItemTableView={isItemTableView}
                  selectedRows={selectedRows}
                  itemLineQty={itemLineQty}
                  freezeVisIdx={freezeVisIdx}
                  stickyCellLeftPx={stickyCellLeftPx}
                  onToggleRow={toggleRow}
                  onBumpItemLineQty={bumpItemLineQty}
                  onSetItemLineQty={setItemLineQtyDirect}
                  showItemTypeInTable={Boolean(config?.showItemTypeInTable)}
                  itemIdColIndex={itemIdColIndex}
                  itemTypeColIndex={itemTypeColIndex}
                  itemSubTypeColIndex={itemSubTypeColIndex}
                  itemTypeLookupIndex={itemTypeLookupIndex}
                  rowTemplateDragEnabled={currentTableSource != null && !filterSheetOpen}
                  onRowPointerDown={onTableRowTemplateDragPointerDown}
                />
              </table>
                </div>
              </div>
              <div
                className={`table-scroll-x-bar${tableHasHorizontalOverflow ? " table-scroll-x-bar--active" : ""}`}
                ref={tableScrollXBarRef}
                onScroll={onHorizontalBarScroll}
                aria-hidden
              >
                <div className="table-scroll-x-spacer" ref={tableScrollSpacerRef} />
              </div>
              </div>
            </div>
            {boxSelect ? (
              <div
                className="table-box-select-rect"
                style={boxSelectOverlayStyleFixed(boxSelect)}
                aria-hidden
              />
            ) : null}
            {tableRowDragOverlay}
            <button
              type="button"
              className="table-scroll-top-fab"
              onClick={() => scrollTableToTop()}
              title="回到顶部"
              aria-label="回到顶部"
            >
              🚀
            </button>
            </>
          )}
          {isTaskTableView ? (
            <div
              className={`gmt-task-hint-dock gmt-send-hint${gmtTaskSendReadiness.ready ? " gmt-send-hint--ok" : " gmt-send-hint--blocked"}`}
            >
              {gmtTaskSendReadiness.message}
            </div>
          ) : null}
        </main>
        </div>
      </div>

      {ctxMenu ? (
        <div
          ref={ctxMenuRef}
          className="context-menu"
          style={{ left: (ctxMenuPos ?? ctxMenu).x, top: (ctxMenuPos ?? ctxMenu).y }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.dataIdx != null && isItemTableView ? (
            <>
              <button type="button" className="context-menu-item" onClick={() => void openItemPriceModalFromContext()}>
                修改价格…
              </button>
              <button
                type="button"
                className="context-menu-item"
                disabled={restoreItemPriceBusy}
                onClick={() => void restoreItemDefaultPricesFromContext()}
              >
                {restoreItemPriceBusy ? "还原中…" : "还原默认价格"}
              </button>
              <div role="separator" className="context-menu-sep" />
            </>
          ) : null}
          {ctxMenu.dataIdx != null && (isItemTableView || isTaskTableView) ? (
            <>
              <button type="button" className="context-menu-item" onClick={() => void copyContextRowId()}>
                {isItemTableView ? "复制物品 ID" : "复制任务 ID"}
              </button>
              <div role="separator" className="context-menu-sep" />
            </>
          ) : null}
          <button type="button" className="context-menu-item" onClick={() => openTemplateNameModal()}>
            保存为模板
          </button>
          {selectedRows.size > 0
            ? (() => {
                const tableSource =
                  getCurrentTableSource(activeView, config) ?? (isItemTableView ? "item" : "task");
                return config.savedTemplates
                  .filter((t) => t.source === tableSource)
                  .map((t) => {
                    const label = t.title.length > 22 ? `${t.title.slice(0, 20)}…` : t.title;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className="context-menu-item"
                        title={t.title}
                        onClick={() => void appendSelectedRowsToTemplate(t.id)}
                      >
                        添加到「{label}」
                      </button>
                    );
                  });
              })()
            : null}
          <div role="separator" className="context-menu-sep" />
          <button type="button" className="context-menu-item" onClick={() => void goGmtExecute()}>
            {(() => {
              const src =
                activeView.kind === "item"
                  ? "item"
                  : activeView.kind === "task"
                    ? "task"
                    : activeView.kind === "template" || activeView.kind === "snapshot"
                      ? (config.savedTemplates.find((t) => t.id === activeView.id)?.source ?? null)
                      : null;
              if (src === "item") return "发放道具";
              if (src === "task") return "完成已勾选";
              return "去 GMT 执行";
            })()}
          </button>
          {isTaskTableView && selectedRows.size > 0 ? (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                closeCtx();
                void acceptSelectedTasksViaGtop();
              }}
            >
              接取
            </button>
          ) : null}
          {selectedRows.size > 0 &&
          itemServerWideUi.entriesEnabled &&
          getCurrentTableSource(activeView, config) === "item" ? (
            <button type="button" className="context-menu-item" onClick={() => void openGlobalSendFromTableContext()}>
              全服发送
            </button>
          ) : null}
        </div>
      ) : null}

      {columnHeaderMenu ? (
        <div
          ref={columnHeaderMenuRef}
          className="context-menu"
          style={{
            left: (columnHeaderMenuPos ?? columnHeaderMenu).x,
            top: (columnHeaderMenuPos ?? columnHeaderMenu).y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="context-menu-item" onClick={() => void applyFreezeThrough(columnHeaderMenu.headerName)}>
            冻结此列
          </button>
          <button type="button" className="context-menu-item" onClick={() => void applyFreezeThrough(null)}>
            取消冻结
          </button>
        </div>
      ) : null}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
