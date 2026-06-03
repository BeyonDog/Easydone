/**
 * Emote preset reads 备注 column; other typeRemark keys read 类型备注.
 * Run after: node scripts/apply-ui-fixes.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src/App.tsx");
let s = fs.readFileSync(appPath, "utf8");

function mustReplace(old, neu, label) {
  if (!s.includes(old)) {
    console.error(`MISSING [${label}]`);
    process.exit(1);
  }
  s = s.split(old).join(neu);
}

// --- imports ---
if (!s.includes("isDaHongJianShiEmoteTypeRemark")) {
  mustReplace(
    `  ITEM_TYPE_REMARK_PRESET_EMOTE,
  rowMatchesEmotePreset,
  rowMatchesKeyword,
  typeRemarkFilterKey,`,
    `  ITEM_TYPE_REMARK_PRESET_EMOTE,
  isDaHongJianShiEmoteTypeRemark,
  rowMatchesEmotePreset,
  rowMatchesKeyword,
  typeRemarkFilterKey,`,
    "import isDaHongJianShiEmoteTypeRemark",
  );
}

// --- rowPasses: Emote → remark col, others → tr col ---
mustReplace(
  `function rowPassesTypeRemarkFilterKeys(row: unknown[], typeRemarkKeys: string[], trCol: number): boolean {
  if (trCol < 0 || typeRemarkKeys.length === 0) return true;
  for (const key of typeRemarkKeys) {
    if (key === ITEM_TYPE_REMARK_PRESET_EMOTE) {
      if (rowMatchesEmotePreset(row[trCol])) return true;
    } else if (key === typeRemarkFilterKey(row[trCol])) {
      return true;
    }
  }
  return false;
}

function rowPassesItemTableFilter(
  row: unknown[],
  f: ItemTableFilter,
  col: { tr: number; def: number; qual: number },
): boolean {
  if (f.rowKeyword?.trim() && !rowMatchesKeyword(row, f.rowKeyword)) return false;
  if (col.tr >= 0 && f.typeRemarkKeys.length > 0) {
    if (!rowPassesTypeRemarkFilterKeys(row, f.typeRemarkKeys, col.tr)) return false;
  }`,
  `function rowPassesTypeRemarkFilterKeys(
  row: unknown[],
  typeRemarkKeys: string[],
  trCol: number,
  remarkCol: number,
): boolean {
  if (typeRemarkKeys.length === 0) return true;
  for (const key of typeRemarkKeys) {
    if (key === ITEM_TYPE_REMARK_PRESET_EMOTE) {
      if (remarkCol < 0) return false;
      if (rowMatchesEmotePreset(row[remarkCol])) return true;
    } else {
      if (trCol < 0) return false;
      if (key === typeRemarkFilterKey(row[trCol])) return true;
    }
  }
  return false;
}

function rowPassesItemTableFilter(
  row: unknown[],
  f: ItemTableFilter,
  col: { tr: number; def: number; qual: number; remark: number },
): boolean {
  if (f.rowKeyword?.trim() && !rowMatchesKeyword(row, f.rowKeyword)) return false;
  if (f.typeRemarkKeys.length > 0) {
    if (!rowPassesTypeRemarkFilterKeys(row, f.typeRemarkKeys, col.tr, col.remark)) return false;
  }`,
  "rowPasses remark split",
);

// --- itemFilterColIdx.remark ---
mustReplace(
  `  const itemFilterColIdx = useMemo(() => {
    if (!isItemTableView || !headers.length) return { tr: -1, def: -1, qual: -1 };
    return {
      tr: resolveTypeRemarkColumnIndex(headers),
      def: resolveDefenseValueColumnIndex(headers),
      qual: resolveItemQualityColumnIndex(headers),
    };
  }, [isItemTableView, headers]);`,
  `  const itemFilterColIdx = useMemo(() => {
    if (!isItemTableView || !headers.length) return { tr: -1, def: -1, qual: -1, remark: -1 };
    return {
      tr: resolveTypeRemarkColumnIndex(headers),
      def: resolveDefenseValueColumnIndex(headers),
      qual: resolveItemQualityColumnIndex(headers),
      remark: resolveRemarkColumnIndex(headers, config?.itemRemarkColumn ?? null),
    };
  }, [isItemTableView, headers, config?.itemRemarkColumn]);`,
  "itemFilterColIdx remark",
);

// --- filter options exclude 大红检视 in 类型备注 list ---
if (s.includes("if (itemFilterColIdx.tr >= 0) typeSet.add(typeRemarkFilterKey(row[itemFilterColIdx.tr]));")) {
  mustReplace(
    `      if (itemFilterColIdx.tr >= 0) typeSet.add(typeRemarkFilterKey(row[itemFilterColIdx.tr]));`,
    `      if (itemFilterColIdx.tr >= 0) {
        const trKey = typeRemarkFilterKey(row[itemFilterColIdx.tr]);
        if (!isDaHongJianShiEmoteTypeRemark(trKey)) typeSet.add(trKey);
      }`,
    "filter typeRemark options",
  );
}

// --- itemTypeRemarkDisplayKeys ---
mustReplace(
  `  const itemTypeRemarkDisplayKeys = useMemo(() => {
    const merged = mergeKeyOrder(itemFilterOptions.typeRemark, itemFilterDraft.typeRemarkKeyOrder ?? null, sortTypeRemarkRest);
    const rest = merged.filter((k) => k !== ITEM_TYPE_REMARK_PRESET_EMOTE);
    return [ITEM_TYPE_REMARK_PRESET_EMOTE, ...rest];
  }, [itemFilterOptions.typeRemark, itemFilterDraft.typeRemarkKeyOrder]);`,
  `  const itemTypeRemarkDisplayKeys = useMemo(() => {
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
  }, [itemFilterOptions.typeRemark, itemFilterDraft.typeRemarkKeyOrder, itemFilterColIdx.tr, itemFilterColIdx.remark]);`,
  "itemTypeRemarkDisplayKeys",
);

// --- commit Emote zero-match toast (备注列) ---
if (!s.includes("无匹配的 Emote 行")) {
  mustReplace(
    `      }
      const nextFilter = itemTableFilterIsInactive(d) && !hasCustomItemKeyOrder(d) ? null : d;
      const visible =
        nextFilter == null
          ? new Set(baseBodyRows.map((r) => r.dataIdx))
          : new Set(
              baseBodyRows
                .filter(({ row }) => rowPassesItemTableFilter(row, nextFilter, itemFilterColIdx))
                .map((r) => r.dataIdx),
            );
      if (!opts?.keepModalOpen) setItemFilterModalOpen(false);`,
    `      }
      if (d.typeRemarkKeys.includes(ITEM_TYPE_REMARK_PRESET_EMOTE) && itemFilterColIdx.remark >= 0) {
        const emoteHits = baseBodyRows.filter(({ row }) => rowMatchesEmotePreset(row[itemFilterColIdx.remark])).length;
        if (emoteHits === 0) {
          push("无匹配的 Emote 行，请检查「备注」列是否含 Emote");
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
      if (!opts?.keepModalOpen) setItemFilterModalOpen(false);`,
    "commit emote toast",
  );
}

const EMOTE_HELP =
  "预设「Emote」按「备注」列匹配：保留「动作名+Emote」（如秀肌肉Emote、贵族礼仪Emote）；排除含「大红检视」的 Emote（如大红检视Emote…）。其它选项仍按「类型备注」列。";

mustReplace(
  `                  if (id === "typeRemark") {
                    return (
                      <div className={\`item-filter-section item-filter-section--grow\${itemFilterColIdx.tr < 0 ? " item-filter-section--disabled" : ""}\`}>
                        <div className="item-filter-h3-row">
                          <h3 className="item-filter-h3">类型备注</h3>
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
                        {itemFilterColIdx.tr < 0 ? (
                          <p className="help muted">当前表无「类型备注」列，该条件不可用。</p>
                        ) : (
                          <>
                            <div className="filter-selection-summary" role="status">
                              <span className="filter-selection-summary-label">当前选择</span>
                              {itemFilterDraft.typeRemarkKeys[0] ? (
                                <span className="filter-selection-summary-value">
                                  {typeRemarkLabelPrefix(itemFilterDraft.typeRemarkKeys[0])}
                                  <span>{itemFilterDraft.typeRemarkKeys[0]}</span>
                                </span>
                              ) : (
                                <span className="filter-selection-summary-empty">（未选择）</span>
                              )}
                            </div>
                            <div ref={itemFilterTypeRemarkScrollRef} className="item-filter-scroll item-filter-scroll--flex">
                              <FilterDnDOptionList`,
  `                  if (id === "typeRemark") {
                    const typeRemarkSectionDisabled =
                      itemFilterColIdx.tr < 0 && itemFilterColIdx.remark < 0;
                    const typeRemarkOnlyEmote =
                      itemFilterColIdx.tr < 0 && itemFilterColIdx.remark >= 0;
                    return (
                      <div className={\`item-filter-section item-filter-section--grow\${typeRemarkSectionDisabled ? " item-filter-section--disabled" : ""}\`}>
                        <div className="item-filter-h3-row">
                          <h3 className="item-filter-h3">类型备注</h3>
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
                          <p className="help muted">当前表无「类型备注」与「备注」列，该条件不可用。</p>
                        ) : (
                          <>
                            {typeRemarkOnlyEmote ? (
                              <p className="help muted" style={{ marginBottom: "0.35rem" }}>
                                当前表无「类型备注」列，仅可使用预设 Emote（按「备注」列筛选）。
                              </p>
                            ) : null}
                            <div className="filter-selection-summary" role="status">
                              <span className="filter-selection-summary-label">当前选择</span>
                              {itemFilterDraft.typeRemarkKeys[0] ? (
                                <span className="filter-selection-summary-value">
                                  {typeRemarkLabelPrefix(itemFilterDraft.typeRemarkKeys[0])}
                                  <span>{itemFilterDraft.typeRemarkKeys[0]}</span>
                                </span>
                              ) : (
                                <span className="filter-selection-summary-empty">（未选择）</span>
                              )}
                            </div>
                            <p className="help muted" style={{ marginBottom: "0.35rem" }}>
                              ${EMOTE_HELP}
                            </p>
                            <div ref={itemFilterTypeRemarkScrollRef} className="item-filter-scroll item-filter-scroll--flex">
                              <FilterDnDOptionList`,
  "typeRemark UI section",
);

// --- send template minus ---
if (s.includes("send-template-qty-btns") && s.includes("?\n                        </button>")) {
  mustReplace(
    `                        >
                          ?
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
                          +`,
    `                        >
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
                          +`,
    "send template minus",
  );
}

const rqStart = s.indexOf("function resolveQuickFilterKey(");
const rqEnd = s.indexOf("function rowPassesItemTableFilter(", rqStart);
if (rqStart >= 0 && rqEnd > rqStart) {
  s = s.slice(0, rqStart) + s.slice(rqEnd);
}

fs.writeFileSync(appPath, s, "utf8");
const rem = (s.match(/\?\?\?/g) || []).length;
console.log("remaining ???", rem);
if (rem) process.exit(1);
console.log("OK");
