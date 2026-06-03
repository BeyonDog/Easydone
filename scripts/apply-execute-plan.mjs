/**
 * UTF-8 safe batch patch for execute-plan (filter fix, template merge, imports).
 */
import fs from "node:fs";
import path from "node:path";

const appPath = path.join(process.cwd(), "src", "App.tsx");
let s = fs.readFileSync(appPath, "utf8");

function mustInclude(needle, label) {
  if (!s.includes(needle)) throw new Error(`Missing: ${label}`);
}

function replaceOne(from, to, label) {
  if (!s.includes(from)) throw new Error(`replaceOne missing: ${label}`);
  s = s.replace(from, to);
}

// --- imports ---
replaceOne(
  `import type {
  ActiveView,
  AppConfig,
  ItemTableFilter,
  SavedSendTemplate,
  SavedSnapshot,
  SendTemplateItem,
  TaskTableFilter,
} from "./types";`,
  `import type {
  ActiveView,
  AppConfig,
  ItemTableFilter,
  SavedTemplate,
  SendTemplateItem,
  TaskTableFilter,
} from "./types";`,
  "types import",
);

if (!s.includes('from "./lib/itemTableFilter"')) {
  replaceOne(
    `import { buildSendItemsFromSelection, execAdminSendMailItems, mergeSendTemplateItems } from "./lib/sendTemplate";`,
    `import { rowPassesItemTableFilter } from "./lib/itemTableFilter";
import { migrateConfigTemplates } from "./lib/templateMigrate";
import { buildSendItemsFromSelection, execAdminSendMailItems, mergeSendTemplateItems } from "./lib/sendTemplate";`,
    "itemTableFilter import",
  );
}

replaceOne(
  `const MAX_SEND_TEMPLATES = 50;

const GMT_COMMAND_LIST_URL =`,
  `const MAX_TEMPLATES = 50;

const GMT_COMMAND_LIST_URL =`,
  "MAX_TEMPLATES",
);

replaceOne(
  `const MAX_SNAPSHOTS = 50;

/** 不可隐藏的 Excel 表头`,
  `/** 不可隐藏的 Excel 表头`,
  "remove MAX_SNAPSHOTS",
);

// --- remove inline filter functions ---
const filterFnStart = s.indexOf("function rowPassesTypeRemarkFilterKeys(");
const filterFnEnd = s.indexOf("function normalizeStringArray(raw: unknown)");
if (filterFnStart < 0 || filterFnEnd < 0) throw new Error("filter fn block");
s = s.slice(0, filterFnStart) + s.slice(filterFnEnd);

// --- chip bar order in filter helpers ---
replaceOne(
  `    sectionOrder: normalizeItemSectionOrderFromDisk((o as ItemTableFilter).sectionOrder),
    rowKeyword: typeof o.rowKeyword === "string" && o.rowKeyword.trim() ? o.rowKeyword.trim() : null,
  };`,
  `    sectionOrder: normalizeItemSectionOrderFromDisk((o as ItemTableFilter).sectionOrder),
    chipBarTypeRemarkOrder: normalizeKeyOrderField(o.chipBarTypeRemarkOrder),
    chipBarQualityOrder: normalizeKeyOrderField(o.chipBarQualityOrder),
    rowKeyword: typeof o.rowKeyword === "string" && o.rowKeyword.trim() ? o.rowKeyword.trim() : null,
  };`,
  "normalize chip bar order",
);

replaceOne(
  `    sectionOrder: f.sectionOrder?.length ? [...f.sectionOrder] : null,
    rowKeyword: f.rowKeyword?.trim() ? f.rowKeyword.trim() : null,
  };
}

function itemTableFilterIsInactive`,
  `    sectionOrder: f.sectionOrder?.length ? [...f.sectionOrder] : null,
    chipBarTypeRemarkOrder: f.chipBarTypeRemarkOrder?.length ? [...f.chipBarTypeRemarkOrder] : null,
    chipBarQualityOrder: f.chipBarQualityOrder?.length ? [...f.chipBarQualityOrder] : null,
    rowKeyword: f.rowKeyword?.trim() ? f.rowKeyword.trim() : null,
  };
}

function itemTableFilterIsInactive`,
  "clone chip bar order",
);

replaceOne(
  `function hasCustomItemKeyOrder(f: ItemTableFilter): boolean {
  return (
    (f.typeRemarkKeyOrder?.length ?? 0) > 0 ||
    (f.qualityKeyOrder?.length ?? 0) > 0 ||
    (f.sectionOrder != null && f.sectionOrder.length > 0)
  );
}`,
  `function hasCustomItemKeyOrder(f: ItemTableFilter): boolean {
  return (
    (f.typeRemarkKeyOrder?.length ?? 0) > 0 ||
    (f.qualityKeyOrder?.length ?? 0) > 0 ||
    (f.chipBarTypeRemarkOrder?.length ?? 0) > 0 ||
    (f.chipBarQualityOrder?.length ?? 0) > 0 ||
    (f.sectionOrder != null && f.sectionOrder.length > 0)
  );
}`,
  "hasCustomItemKeyOrder",
);

// --- getCurrentTableSource ---
replaceOne(
  `  if (activeView.kind === "snapshot") {
    return config.savedSnapshots.find((s) => s.id === activeView.id)?.source ?? null;
  }`,
  `  if (activeView.kind === "template" || activeView.kind === "snapshot") {
    const id = activeView.id;
    return config.savedTemplates.find((t) => t.id === id)?.source ?? null;
  }`,
  "getCurrentTableSource",
);

// --- defaultConfig ---
replaceOne(
  `  savedSnapshots: [],
  sendTemplates: [],`,
  `  savedSnapshots: [],
  sendTemplates: [],
  savedTemplates: [],`,
  "defaultConfig savedTemplates",
);

// --- loadConfig migrate ---
replaceOne(
  `    setConfig({
      ...defaultConfig(),
      ...c,
      freezeThroughItemHeader: (c as AppConfig).freezeThroughItemHeader ?? null,
      freezeThroughTaskHeader: (c as AppConfig).freezeThroughTaskHeader ?? null,
      itemTableFilter: normalizeItemTableFilterFromDisk((c as AppConfig).itemTableFilter),
      taskTableFilter: normalizeTaskTableFilterFromDisk((c as AppConfig).taskTableFilter),
      savedSnapshots: rawSnaps.map((s) => ({ ...s, freezeThroughHeader: s.freezeThroughHeader ?? null })),`,
  `    const merged = migrateConfigTemplates({
      ...defaultConfig(),
      ...c,
      freezeThroughItemHeader: (c as AppConfig).freezeThroughItemHeader ?? null,
      freezeThroughTaskHeader: (c as AppConfig).freezeThroughTaskHeader ?? null,
      itemTableFilter: normalizeItemTableFilterFromDisk((c as AppConfig).itemTableFilter),
      taskTableFilter: normalizeTaskTableFilterFromDisk((c as AppConfig).taskTableFilter),
      savedSnapshots: rawSnaps.map((s) => ({ ...s, freezeThroughHeader: s.freezeThroughHeader ?? null })),
      savedTemplates: Array.isArray((c as AppConfig).savedTemplates) ? (c as AppConfig).savedTemplates : [],
      sendTemplates: Array.isArray((c as AppConfig).sendTemplates) ? (c as AppConfig).sendTemplates : [],`,
  "loadConfig start",
);

replaceOne(
  `      sendTemplates: Array.isArray((c as AppConfig).sendTemplates) ? (c as AppConfig).sendTemplates : [],
      themeAccentHex:`,
  `      sendTemplates: Array.isArray((c as AppConfig).sendTemplates) ? (c as AppConfig).sendTemplates : [],
    });
    setConfig({
      ...merged,
      themeAccentHex:`,
  "loadConfig merge close",
);

// Fix duplicate - the original had sendTemplates line after savedSnapshots
if (s.includes("sendTemplates: Array.isArray((c as AppConfig).sendTemplates) ? (c as AppConfig).sendTemplates : [],\n      sendTemplates:")) {
  s = s.replace(
    `      sendTemplates: Array.isArray((c as AppConfig).sendTemplates) ? (c as AppConfig).sendTemplates : [],
      sendTemplates: Array.isArray((c as AppConfig).sendTemplates) ? (c as AppConfig).sendTemplates : [],`,
    `      sendTemplates: Array.isArray((c as AppConfig).sendTemplates) ? (c as AppConfig).sendTemplates : [],`,
  );
}

// --- savedTemplateIds effect ---
replaceOne(
  `  const savedSnapshotIds = useMemo(
    () => (config?.savedSnapshots ?? []).map((s) => s.id).join("\\0"),
    [config?.savedSnapshots],
  );

  useEffect(() => {
    if (!config) return;
    if (activeView.kind !== "snapshot") return;
    const exists = config.savedSnapshots.some((s) => s.id === activeView.id);
    if (!exists) setActiveView({ kind: "item" });
  }, [config, activeView, savedSnapshotIds]);`,
  `  const savedTemplateIds = useMemo(
    () => (config?.savedTemplates ?? []).map((t) => t.id).join("\\0"),
    [config?.savedTemplates],
  );

  useEffect(() => {
    if (!config) return;
    if (activeView.kind !== "template" && activeView.kind !== "snapshot") return;
    const id = activeView.id;
    const exists = config.savedTemplates.some((t) => t.id === id);
    if (!exists) setActiveView({ kind: "item" });
    else if (activeView.kind === "snapshot") setActiveView({ kind: "template", id });
  }, [config, activeView, savedTemplateIds]);`,
  "savedTemplateIds effect",
);

// --- currentAoa / isItem / isTask / hidden ---
replaceOne(
  `    if (activeView.kind === "snapshot") {
      const snap = config.savedSnapshots.find((s) => s.id === activeView.id);
      return snap?.aoa ?? null;
    }`,
  `    if (activeView.kind === "template" || activeView.kind === "snapshot") {
      const tpl = config.savedTemplates.find((t) => t.id === activeView.id);
      return tpl?.aoa ?? null;
    }`,
  "currentAoa template",
);

replaceOne(
  `    return config.savedSnapshots.find((s) => s.id === activeView.id)?.source === "item";
  }, [activeView, config]);

  const isTaskTableView = useMemo(() => {
    if (activeView.kind === "task") return true;
    if (activeView.kind === "item") return false;
    if (!config) return false;
    return config.savedSnapshots.find((s) => s.id === activeView.id)?.source === "task";`,
  `    return config.savedTemplates.find((t) => t.id === activeView.id)?.source === "item";
  }, [activeView, config]);

  const isTaskTableView = useMemo(() => {
    if (activeView.kind === "task") return true;
    if (activeView.kind === "item") return false;
    if (!config) return false;
    return config.savedTemplates.find((t) => t.id === activeView.id)?.source === "task";`,
  "isItem isTask template",
);

replaceOne(
  `    if (activeView.kind === "snapshot") return new Set<string>();`,
  `    if (activeView.kind === "template" || activeView.kind === "snapshot") return new Set<string>();`,
  "hiddenSet template",
);

// --- chip pinned order ---
replaceOne(
  `  const chipTypeRemarkPinned = useMemo(() => {
    return TYPE_REMARK_PINNED_KEYS.filter((k) => {
      if (k === ITEM_TYPE_REMARK_PRESET_EMOTE) return itemFilterColIdx.remark >= 0;
      return itemFilterColIdx.tr >= 0;
    });
  }, [itemFilterColIdx.tr, itemFilterColIdx.remark]);`,
  `  const chipTypeRemarkPinnedBase = useMemo(() => {
    return TYPE_REMARK_PINNED_KEYS.filter((k) => {
      if (k === ITEM_TYPE_REMARK_PRESET_EMOTE) return itemFilterColIdx.remark >= 0;
      return itemFilterColIdx.tr >= 0;
    });
  }, [itemFilterColIdx.tr, itemFilterColIdx.remark]);

  const chipTypeRemarkPinned = useMemo(
    () =>
      mergeKeyOrder(
        chipTypeRemarkPinnedBase,
        config?.itemTableFilter?.chipBarTypeRemarkOrder ?? null,
        sortTypeRemarkRest,
      ),
    [chipTypeRemarkPinnedBase, config?.itemTableFilter?.chipBarTypeRemarkOrder],
  );

  const chipQualityOptions = useMemo(
    () =>
      mergeKeyOrder(
        itemQualityAllKeys,
        config?.itemTableFilter?.chipBarQualityOrder ?? null,
        sortQualityRest,
      ),
    [itemQualityAllKeys, config?.itemTableFilter?.chipBarQualityOrder],
  );`,
  "chip order",
);

// --- updateItemFilterPersist ---
replaceOne(
  `  const updateItemFilterPersist = useCallback(
    (updater: (prev: ItemTableFilter) => ItemTableFilter) => {
      if (!config) return;
      const base = config.itemTableFilter ? cloneItemTableFilter(config.itemTableFilter) : emptyItemTableFilter();
      const next = updater(base);
      if (itemFilterModalOpen) setItemFilterDraft(next);
      commitItemFilterSave(next, { keepModalOpen: itemFilterModalOpen });
    },
    [config, itemFilterModalOpen, commitItemFilterSave],
  );`,
  `  const updateItemFilterPersist = useCallback(
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
          const emoteHits = baseBodyRows.filter(({ row }) =>
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
            ? new Set(baseBodyRows.map((r) => r.dataIdx))
            : new Set(
                baseBodyRows
                  .filter(({ row }) => rowPassesItemTableFilter(row, nextFilter, itemFilterColIdx))
                  .map((r) => r.dataIdx),
              );
        queueMicrotask(() => {
          void saveItemTableFilterToDisk(nextFilter).catch((e) => push(\`筛选保存失败: \${e}\`));
        });
        startTransition(() => {
          setSelectedRows((prev) => new Set([...prev].filter((di) => visible.has(di))));
        });
        return { ...c, itemTableFilter: nextFilter };
      });
    },
    [itemFilterModalOpen, baseBodyRows, itemFilterColIdx, saveItemTableFilterToDisk, push],
  );`,
  "updateItemFilterPersist",
);

// ItemFilterChipBar qualityOptions
replaceOne(
  `              qualityOptions={itemQualityAllKeys}`,
  `              qualityOptions={chipQualityOptions}
              onReorderTypeRemark={(orderedKeys) =>
                updateItemFilterPersist((d) => ({ ...d, chipBarTypeRemarkOrder: orderedKeys }))
              }
              onReorderQuality={(orderedKeys) =>
                updateItemFilterPersist((d) => ({ ...d, chipBarQualityOrder: orderedKeys }))
              }`,
  "chip bar props",
);

// sidebarCards
replaceOne(
  `  const sidebarCards = useMemo(() => {
    if (!config) return [] as Array<
      | { kind: "snapshot"; createdAt: number; snap: SavedSnapshot }
      | { kind: "template"; createdAt: number; tpl: SavedSendTemplate }
    >;
    const snaps = config.savedSnapshots.map((snap) => ({
      kind: "snapshot" as const,
      createdAt: snap.createdAt,
      snap,
    }));
    const temps = config.sendTemplates.map((tpl) => ({
      kind: "template" as const,
      createdAt: tpl.createdAt,
      tpl,
    }));
    return [...snaps, ...temps].sort((a, b) => b.createdAt - a.createdAt);
  }, [config]);`,
  `  const sidebarTemplates = useMemo(() => {
    if (!config) return [] as SavedTemplate[];
    return [...config.savedTemplates].sort((a, b) => b.createdAt - a.createdAt);
  }, [config]);`,
  "sidebarTemplates",
);

fs.writeFileSync(appPath, s, "utf8");
console.log("apply-execute-plan.mjs: phase 1 OK");
