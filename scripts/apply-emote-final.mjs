/**
 * All Emote + send-template UI patches on clean App.tsx (UTF-8 safe).
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

function replaceIf(old, neu) {
  if (!s.includes(old)) return false;
  s = s.split(old).join(neu);
  return true;
}

// --- imports ---
if (!s.includes("isDaHongJianShiEmoteTypeRemark")) {
  if (s.includes("rowMatchesKeyword,")) {
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
      "import isDaHongJianShiEmoteTypeRemark (with rowMatchesKeyword)",
    );
  } else {
    mustReplace(
      `  ITEM_TYPE_REMARK_PRESET_EMOTE,
  rowMatchesEmotePreset,
  typeRemarkFilterKey,`,
      `  ITEM_TYPE_REMARK_PRESET_EMOTE,
  isDaHongJianShiEmoteTypeRemark,
  rowMatchesEmotePreset,
  typeRemarkFilterKey,`,
      "import isDaHongJianShiEmoteTypeRemark",
    );
  }
}

// --- fail-closed type remark filter ---
if (s.includes("if (trCol < 0 || typeRemarkKeys.length === 0) return true;")) {
  mustReplace(
    `function rowPassesTypeRemarkFilterKeys(row: unknown[], typeRemarkKeys: string[], trCol: number): boolean {
  if (trCol < 0 || typeRemarkKeys.length === 0) return true;
`,
    `function rowPassesTypeRemarkFilterKeys(row: unknown[], typeRemarkKeys: string[], trCol: number): boolean {
  if (typeRemarkKeys.length === 0) return true;
  if (trCol < 0) return false;
`,
    "rowPassesTypeRemarkFilterKeys fail-closed",
  );
}

// --- filter options exclude 大红检视 keys ---
if (s.includes('if (itemFilterColIdx.tr >= 0) typeSet.add(typeRemarkFilterKey(row[itemFilterColIdx.tr]));')) {
  mustReplace(
    `      if (itemFilterColIdx.tr >= 0) typeSet.add(typeRemarkFilterKey(row[itemFilterColIdx.tr]));`,
    `      if (itemFilterColIdx.tr >= 0) {
        const trKey = typeRemarkFilterKey(row[itemFilterColIdx.tr]);
        if (!isDaHongJianShiEmoteTypeRemark(trKey)) typeSet.add(trKey);
      }`,
    "filter typeRemark options",
  );
}

// --- commit Emote zero-match toast ---
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
      if (d.typeRemarkKeys.includes(ITEM_TYPE_REMARK_PRESET_EMOTE) && itemFilterColIdx.tr >= 0) {
        const emoteHits = baseBodyRows.filter(({ row }) => rowMatchesEmotePreset(row[itemFilterColIdx.tr])).length;
        if (emoteHits === 0) {
          push("无匹配的 Emote 行，请检查「类型备注」列是否含 Emote");
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

// --- emote help ---
const EMOTE_HELP =
  "预设「Emote」：保留「动作名+Emote」（如秀肌肉Emote、贵族礼仪Emote）；排除含「大红检视」的 Emote（如大红检视Emote…）。";
if (!s.includes("动作名+Emote")) {
  if (
    !replaceIf(
      "预设「Emote」：类型备注含 Emote 且不含「大红检视」（如秀肌肉Emote、贵族礼仪Emote；排除大红检视Emote 类）。",
      EMOTE_HELP,
    )
  ) {
    mustReplace(
      `                              )}
                            </div>
                            <div ref={itemFilterTypeRemarkScrollRef} className="item-filter-scroll item-filter-scroll--flex">`,
      `                              )}
                            </div>
                            <p className="help muted" style={{ marginBottom: "0.35rem" }}>
                              ${EMOTE_HELP}
                            </p>
                            <div ref={itemFilterTypeRemarkScrollRef} className="item-filter-scroll item-filter-scroll--flex">`,
      "emote help insert",
    );
  }
}

// --- send template minus ---
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

// remove resolveQuickFilterKey if still present
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
