import { cellStr, parseCellAsInteger, type SheetMatrix } from "./xlsxHelpers.ts";

/** 升到该等级所需的累计经验值（整张表）；key 为等级 */
export type AccountLevelCumulativeMap = Map<number, number>;

const HEADER_SCAN_MAX_ROWS = 12;

const LEVEL_HEADER_PRIMARY = "等级";
const LEVEL_HEADER_ALTS = [
  "Lv",
  "LV",
  "Level",
  "level",
  "級別",
  "等級",
  "级别",
  "層級",
  "角色等级",
  "帐号等级",
  "账号等级",
  "AccountLevel",
  "account_level",
];

/** 表头需包含此子串的首选列（累计升到该等级的总经验） */
const CUMULATIVE_HEADER_NEEDLE = "升到该等级所需的累计经验值";

const CUMULATIVE_HEADER_FALLBACKS = ["累计经验", "升到该等级", "所需累计"];

export type ParseAccountLevelSheetResult =
  | { ok: true; byLevel: AccountLevelCumulativeMap }
  | { ok: false; error: string };

/** 表头单元格：去 BOM、trim、全角空格 */
export function normalizeHeaderCell(v: unknown): string {
  let s = cellStr(v).replace(/^\ufeff/, "").trim();
  return s.replace(/\u3000/g, " ");
}

function headerCompareKey(s: string): string {
  return normalizeHeaderCell(s).toLowerCase().replace(/\s+/g, "");
}

function rowToHeaders(row: unknown[]): string[] {
  return row.map((c) => normalizeHeaderCell(c));
}

function isCumulativeLikeHeader(header: string): boolean {
  const n = normalizeHeaderCell(header);
  if (!n) return false;
  const key = headerCompareKey(n);
  if (key === "totalexp") return true;
  if (n.includes("累计")) return true;
  if (n.includes(CUMULATIVE_HEADER_NEEDLE)) return true;
  for (const fb of CUMULATIVE_HEADER_FALLBACKS) {
    if (n.includes(fb)) return true;
  }
  return false;
}

function resolveLevelColumnIndex(headers: string[]): number {
  const norm = headers.map((h) => normalizeHeaderCell(h));

  const primaryIdx = norm.findIndex((h) => h === LEVEL_HEADER_PRIMARY && !isCumulativeLikeHeader(h));
  if (primaryIdx >= 0) return primaryIdx;

  for (const alt of LEVEL_HEADER_ALTS) {
    const altKey = headerCompareKey(alt);
    const idx = norm.findIndex((h) => headerCompareKey(h) === altKey && !isCumulativeLikeHeader(h));
    if (idx >= 0) return idx;
  }

  let fuzzyIdx = -1;
  let fuzzyLen = Number.POSITIVE_INFINITY;
  for (let i = 0; i < norm.length; i++) {
    const h = norm[i]!;
    if (!h || isCumulativeLikeHeader(h)) continue;
    const key = headerCompareKey(h);
    const looseCn = h.includes("等级") || h.includes("级别");
    const looseEn = key === "level" || key === "lv";
    if (!looseCn && !looseEn) continue;
    if (h.length < fuzzyLen) {
      fuzzyLen = h.length;
      fuzzyIdx = i;
    }
  }
  return fuzzyIdx;
}

function resolveCumulativeColumnIndex(headers: string[]): number {
  const norm = headers.map((h) => normalizeHeaderCell(h));

  const totalExpIdx = norm.findIndex((h) => headerCompareKey(h) === "totalexp");
  if (totalExpIdx >= 0) return totalExpIdx;

  const needleIdx = norm.findIndex((h) => h.includes(CUMULATIVE_HEADER_NEEDLE));
  if (needleIdx >= 0) return needleIdx;

  for (const fb of CUMULATIVE_HEADER_FALLBACKS) {
    const idx = norm.findIndex((h) => h.includes(fb));
    if (idx >= 0) return idx;
  }
  return -1;
}

/** 在前若干行中定位同时含等级列与累计列的表头行 */
export function findHeaderRowIndex(aoa: SheetMatrix, maxScan = HEADER_SCAN_MAX_ROWS): number {
  const limit = Math.min(maxScan, aoa.length);
  for (let ri = 0; ri < limit; ri++) {
    const row = aoa[ri];
    if (!row?.length) continue;
    const headers = rowToHeaders(row);
    if (resolveLevelColumnIndex(headers) >= 0 && resolveCumulativeColumnIndex(headers) >= 0) {
      return ri;
    }
  }
  return -1;
}

function formatHeaderScanPreview(aoa: SheetMatrix, maxRows = 5): string {
  const limit = Math.min(maxRows, aoa.length);
  const parts: string[] = [];
  for (let ri = 0; ri < limit; ri++) {
    const row = aoa[ri];
    if (!row?.length) {
      parts.push(`第${ri + 1}行: （空）`);
      continue;
    }
    const labels = rowToHeaders(row).filter(Boolean);
    parts.push(`第${ri + 1}行: ${labels.length ? labels.join(" | ") : "（无字段名）"}`);
  }
  return parts.join("；");
}

function parseFailureMessage(aoa: SheetMatrix, detail: string): string {
  return `${detail}。已扫描前 ${Math.min(HEADER_SCAN_MAX_ROWS, aoa.length)} 行：${formatHeaderScanPreview(aoa)}`;
}

export function parseAccountLevelSheet(aoa: SheetMatrix): ParseAccountLevelSheetResult {
  if (!aoa.length) {
    return { ok: false, error: "AccountLevel 表为空" };
  }

  const headerRowIdx = findHeaderRowIndex(aoa);
  if (headerRowIdx < 0) {
    return {
      ok: false,
      error: parseFailureMessage(
        aoa,
        "未找到表头行（需同时含等级列如 Level/等级 与累计列如 TotalExp/升到该等级所需的累计经验值）",
      ),
    };
  }

  const headers = rowToHeaders(aoa[headerRowIdx]!);
  const levelCol = resolveLevelColumnIndex(headers);
  const cumCol = resolveCumulativeColumnIndex(headers);

  if (levelCol < 0) {
    return {
      ok: false,
      error: parseFailureMessage(
        aoa,
        `第 ${headerRowIdx + 1} 行表头缺少等级列（支持 Level、等级、角色等级 等，且非累计列）`,
      ),
    };
  }
  if (cumCol < 0) {
    return {
      ok: false,
      error: parseFailureMessage(
        aoa,
        `第 ${headerRowIdx + 1} 行表头缺少累计经验列（支持 TotalExp、「${CUMULATIVE_HEADER_NEEDLE}」等）`,
      ),
    };
  }

  const byLevel: AccountLevelCumulativeMap = new Map();
  for (let ri = headerRowIdx + 1; ri < aoa.length; ri++) {
    const row = aoa[ri];
    if (!row) continue;
    const lvl = parseCellAsInteger(row[levelCol]);
    const cum = parseCellAsInteger(row[cumCol]);
    if (lvl == null || cum == null || lvl < 1) continue;
    byLevel.set(lvl, cum);
  }
  if (byLevel.size === 0) {
    return { ok: false, error: "AccountLevel 表无有效等级行" };
  }
  return { ok: true, byLevel };
}

export function formatExpAmountForApi(n: number): string {
  return String(Math.trunc(Math.max(1, Math.min(n, 9_999_999_999))));
}

/** 「升到目标等级」模式：先加固定探针，再根据返回的 exp_after 算第二次应加值 */
export const ADD_EXP_LEVEL_PROBE = 10;

export type SecondBatchAfterProbeResult =
  | { ok: true; secondExp: number; cumulativeTarget: number; tableMismatchWarning?: string }
  | { ok: false; error: string };

/**
 * 按服返回的 `exp_after` 作为角色累计总经验，与表中目标等级的累计列做差。
 * 表仅用于查目标等级累计值；若 exp_after 低于表中当前等级 floor，仍继续计算并附带警告。
 */
export function secondBatchExpAfterProbe(
  byLevel: AccountLevelCumulativeMap,
  targetLevel: number,
  levelAfter: number,
  expAfter: number,
): SecondBatchAfterProbeResult {
  if (!Number.isInteger(targetLevel) || targetLevel < 3) {
    return { ok: false, error: "目标等级须为不小于 3 的整数" };
  }
  const cumulativeTarget = byLevel.get(targetLevel);
  if (cumulativeTarget == null) {
    return { ok: false, error: `表中缺少等级 ${targetLevel} 的累计经验行` };
  }
  const secondExp = cumulativeTarget - expAfter;
  if (!Number.isFinite(secondExp)) {
    return { ok: false, error: "第二次经验计算结果无效" };
  }

  const floorAtLevel = byLevel.get(levelAfter);
  let tableMismatchWarning: string | undefined;
  if (floorAtLevel != null && expAfter < floorAtLevel) {
    tableMismatchWarning =
      `AccountLevel 表与当前服可能不一致：角色 Lv.${levelAfter}，exp_after=${expAfter}，` +
      `但表中 Lv.${levelAfter} 累计为 ${floorAtLevel}。已按 exp_after 作为累计经验继续计算第二次加成；` +
      `若结果不准请核对工作区 Account.xlsx。`;
  }

  return {
    ok: true,
    secondExp,
    cumulativeTarget,
    ...(tableMismatchWarning ? { tableMismatchWarning } : {}),
  };
}
