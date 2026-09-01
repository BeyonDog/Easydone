import * as XLSX from "xlsx";

export type SheetMatrix = unknown[][];

export function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function readOptionalSheetFromWorkbook(b64: string, sheetName: string): SheetMatrix | null {
  const data = base64ToUint8Array(b64);
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  if (!aoa.length) return null;
  return aoa;
}

export function readSheetFromWorkbook(b64: string, sheetName: string): SheetMatrix {
  const aoa = readOptionalSheetFromWorkbook(b64, sheetName);
  if (!aoa) {
    const data = base64ToUint8Array(b64);
    const wb = XLSX.read(data, { type: "array" });
    const names = wb.SheetNames.join(", ");
    throw new Error(`未找到工作表「${sheetName}」。已有表: ${names || "无"}`);
  }
  return aoa;
}

/** Prefer named sheet; otherwise first sheet in workbook. */
export function readPreferredOrFirstSheet(b64: string, preferredName: string): SheetMatrix | null {
  const preferred = readOptionalSheetFromWorkbook(b64, preferredName);
  if (preferred) return preferred;
  const data = base64ToUint8Array(b64);
  const wb = XLSX.read(data, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return null;
  return readOptionalSheetFromWorkbook(b64, first);
}

/** 与 Excel 表头完全一致；用于 AdminSendMail 物品 ID */
export const ITEM_ID_HEADER = "物品ID";

/** 与 Excel 表头完全一致；道具「类型备注」列 */
export const TYPE_REMARK_HEADER = "类型备注";

/** Chest 并入「全部道具」时写入的类型备注 */
export const CHEST_TYPE_REMARK = "chest";

/** Chest / Item 主键列别名（按优先级） */
export const ITEM_ID_ALIASES = [
  "物品ID",
  "ItemId",
  "ItemID",
  "ChestId",
  "ChestID",
  "chestId",
  "宝箱ID",
  "宝箱Id",
  "礼包ID",
  "礼包Id",
  "Id",
  "ID",
] as const;

export type AppendAlignedSheetOptions = {
  /** 写入「物品ID」时优先用解析到的源 ID 列（Chest） */
  preferResolvedIdColumn?: boolean;
  /** 跳过规范化后物品ID 为空的行；默认 true */
  skipEmptyId?: boolean;
  /** 追加行时强制写入「类型备注」 */
  typeRemarkOverride?: string;
};

/** Pure digit ID after normalize (rejects C+B / ChestID / 说明). */
export function isPureNumericId(v: unknown): boolean {
  return /^\d+$/.test(normalizeIdCell(v));
}

/** First body row index (≥1) whose idCol is a pure numeric ID; -1 if none. */
export function findFirstNumericIdRowIndex(aoa: SheetMatrix, idCol: number): number {
  if (idCol < 0 || aoa.length < 2) return -1;
  for (let r = 1; r < aoa.length; r++) {
    if (isPureNumericId(aoa[r]?.[idCol])) return r;
  }
  return -1;
}

export function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

/** Normalize ID cells for dedupe / exact match (integers without scientific tails). */
export function normalizeIdCell(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) {
    const t = Math.trunc(v);
    if (Math.abs(v - t) < 1e-9) return String(t);
    return String(v);
  }
  const s = cellStr(v).trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) return s;
  if (/e/i.test(s) || /^\d+\.0+$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) {
      const t = Math.trunc(n);
      if (Math.abs(n - t) < 1e-6) return String(t);
    }
  }
  return s;
}

function resolveHeaderAliasIndex(headers: string[], aliases: readonly string[]): number {
  for (const alias of aliases) {
    const i = headers.findIndex((h) => h === alias);
    if (i >= 0) return i;
  }
  const lower = aliases.map((a) => a.toLowerCase());
  for (let i = 0; i < headers.length; i++) {
    if (lower.includes(headers[i]!.toLowerCase())) return i;
  }
  return -1;
}

/** Prefer col0; else any column where ≥minRatio of non-empty cells are pure numeric IDs. */
export function inferNumericIdColumnIndex(aoa: SheetMatrix, minRatio = 0.8): number {
  if (!aoa.length || aoa.length < 2) return -1;
  const colCount = Math.max(...aoa.map((r) => r?.length ?? 0), 0);
  if (colCount <= 0) return -1;

  if (numericRatioForColumn(aoa, 0) >= minRatio) return 0;
  let best = -1;
  let bestRatio = 0;
  for (let c = 1; c < colCount; c++) {
    const ratio = numericRatioForColumn(aoa, c);
    if (ratio >= minRatio && ratio > bestRatio) {
      bestRatio = ratio;
      best = c;
    }
  }
  return best;
}

function numericRatioForColumn(aoa: SheetMatrix, c: number): number {
  let nonEmpty = 0;
  let numeric = 0;
  for (let r = 1; r < aoa.length; r++) {
    const s = normalizeIdCell(aoa[r]?.[c]);
    if (!s) continue;
    nonEmpty++;
    if (/^\d+$/.test(s)) numeric++;
  }
  return nonEmpty === 0 ? 0 : numeric / nonEmpty;
}

function findHeaderAliasIndex(headers: string[], alias: string): number {
  const exact = headers.findIndex((h) => h === alias);
  if (exact >= 0) return exact;
  const lower = alias.toLowerCase();
  return headers.findIndex((h) => h.toLowerCase() === lower);
}

function resolveExtraIdColumn(
  extra: SheetMatrix,
  extraHeaders: string[],
  aliases: readonly string[],
  pickBestNumeric = false,
): number {
  if (pickBestNumeric) {
    let best = -1;
    let bestRatio = -1;
    const seen = new Set<number>();
    for (const alias of aliases) {
      const i = findHeaderAliasIndex(extraHeaders, alias);
      if (i < 0 || seen.has(i)) continue;
      seen.add(i);
      const ratio = numericRatioForColumn(extra, i);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = i;
      }
    }
    if (best >= 0 && bestRatio >= 0.5) return best;
    const inferred = inferNumericIdColumnIndex(extra);
    if (inferred >= 0) return inferred;
    return best;
  }
  const byAlias = resolveHeaderAliasIndex(extraHeaders, aliases);
  if (byAlias >= 0) return byAlias;
  return inferNumericIdColumnIndex(extra);
}

/**
 * Append extra sheet body rows onto base, aligning by header name.
 * Extra-only columns are dropped. ID column may use aliases (e.g. ChestId → 物品ID).
 */
export function appendAlignedSheetRows(
  base: SheetMatrix,
  extra: SheetMatrix | null | undefined,
  idHeader: string = ITEM_ID_HEADER,
  idAliases: readonly string[] = ITEM_ID_ALIASES,
  options?: AppendAlignedSheetOptions,
): SheetMatrix {
  if (!base.length || !extra?.length) return base;
  const baseHeaders = (base[0] ?? []).map((h) => cellStr(h).trim());
  const extraHeaders = (extra[0] ?? []).map((h) => cellStr(h).trim());
  if (!baseHeaders.length) return base;

  const preferResolvedId = options?.preferResolvedIdColumn === true;
  const skipEmptyId = options?.skipEmptyId !== false;
  const typeRemarkOverride = options?.typeRemarkOverride;

  const extraColByName = new Map<string, number>();
  for (let i = 0; i < extraHeaders.length; i++) {
    const name = extraHeaders[i]!;
    if (name && !extraColByName.has(name)) extraColByName.set(name, i);
  }

  const baseIdCol = baseHeaders.findIndex((h) => h === idHeader);
  const aliases = idAliases.length > 0 ? idAliases : [idHeader];
  const extraIdCol = resolveExtraIdColumn(extra, extraHeaders, aliases, preferResolvedId);
  const existingIds = new Set<string>();
  if (baseIdCol >= 0) {
    for (let r = 1; r < base.length; r++) {
      const id = normalizeIdCell(base[r]?.[baseIdCol]);
      if (id) existingIds.add(id);
    }
  }

  const appended: unknown[][] = [];
  for (let r = 1; r < extra.length; r++) {
    const src = extra[r] ?? [];
    const row: unknown[] = baseHeaders.map((name) => {
      if (name === idHeader) {
        if (preferResolvedId && extraIdCol >= 0) {
          return src[extraIdCol] ?? "";
        }
        const sameCi = extraColByName.get(name);
        let val: unknown = sameCi != null ? src[sameCi] : "";
        if (!normalizeIdCell(val) && extraIdCol >= 0) {
          val = src[extraIdCol] ?? "";
        }
        return val ?? "";
      }
      if (typeRemarkOverride != null && name === TYPE_REMARK_HEADER) {
        return typeRemarkOverride;
      }
      const ci = extraColByName.get(name);
      return ci == null ? "" : (src[ci] ?? "");
    });

    if (baseIdCol >= 0) {
      const id = normalizeIdCell(row[baseIdCol]);
      if (!id) {
        if (skipEmptyId) continue;
      } else {
        if (existingIds.has(id)) continue;
        existingIds.add(id);
      }
    }
    appended.push(row);
  }
  if (appended.length === 0) return base;
  return [base[0]!, ...base.slice(1), ...appended];
}

/** Merge one Chest/Bundle-like sheet into Item：跳过元数据行；已有 ID 盖 chest；缺失则追加. */
export function mergeChestSheetIntoItem(
  item: SheetMatrix,
  chest: SheetMatrix | null | undefined,
): { aoa: SheetMatrix; appended: number; stamped: number } {
  if (!item.length || !chest?.length) return { aoa: item, appended: 0, stamped: 0 };

  const baseHeaders = (item[0] ?? []).map((h) => cellStr(h).trim());
  const extraHeaders = (chest[0] ?? []).map((h) => cellStr(h).trim());
  if (!baseHeaders.length) return { aoa: item, appended: 0, stamped: 0 };

  const baseIdCol = baseHeaders.findIndex((h) => h === ITEM_ID_HEADER);
  const typeRemarkCol = baseHeaders.findIndex((h) => h === TYPE_REMARK_HEADER);
  const extraIdCol = resolveExtraIdColumn(chest, extraHeaders, ITEM_ID_ALIASES, true);
  if (baseIdCol < 0 || extraIdCol < 0) return { aoa: item, appended: 0, stamped: 0 };

  const dataStart = findFirstNumericIdRowIndex(chest, extraIdCol);
  if (dataStart < 0) return { aoa: item, appended: 0, stamped: 0 };

  const extraColByName = new Map<string, number>();
  for (let i = 0; i < extraHeaders.length; i++) {
    const name = extraHeaders[i]!;
    if (name && !extraColByName.has(name)) extraColByName.set(name, i);
  }

  const chestIds: string[] = [];
  const chestRowsById = new Map<string, unknown[]>();
  for (let r = dataStart; r < chest.length; r++) {
    const src = chest[r] ?? [];
    const id = normalizeIdCell(src[extraIdCol]);
    if (!/^\d+$/.test(id) || chestRowsById.has(id)) continue;
    chestIds.push(id);
    chestRowsById.set(id, src);
  }
  if (chestIds.length === 0) return { aoa: item, appended: 0, stamped: 0 };

  const chestIdSet = new Set(chestIds);
  const header = item[0]!;
  const body = item.slice(1).map((row) => [...(row ?? [])]);
  let stamped = 0;
  const existingIds = new Set<string>();

  for (const row of body) {
    const id = normalizeIdCell(row[baseIdCol]);
    if (!id) continue;
    existingIds.add(id);
    if (typeRemarkCol >= 0 && chestIdSet.has(id) && row[typeRemarkCol] !== CHEST_TYPE_REMARK) {
      row[typeRemarkCol] = CHEST_TYPE_REMARK;
      stamped++;
    }
  }

  const appendedRows: unknown[][] = [];
  for (const id of chestIds) {
    if (existingIds.has(id)) continue;
    const src = chestRowsById.get(id) ?? [];
    const row: unknown[] = baseHeaders.map((name) => {
      if (name === ITEM_ID_HEADER) return src[extraIdCol] ?? id;
      if (name === TYPE_REMARK_HEADER) return CHEST_TYPE_REMARK;
      const ci = extraColByName.get(name);
      return ci == null ? "" : (src[ci] ?? "");
    });
    appendedRows.push(row);
    existingIds.add(id);
  }

  if (stamped === 0 && appendedRows.length === 0) return { aoa: item, appended: 0, stamped: 0 };
  return {
    aoa: [header, ...body, ...appendedRows],
    appended: appendedRows.length,
    stamped,
  };
}

/** Merge Chest.xlsx rows into Item sheet（兼容单表调用）. */
export function appendChestRowsToItemSheet(item: SheetMatrix, chest: SheetMatrix | null | undefined): SheetMatrix {
  return mergeChestSheetIntoItem(item, chest).aoa;
}

/** All non-empty sheets in a workbook (AOA). */
export function listWorkbookSheetMatrices(b64: string): SheetMatrix[] {
  const data = base64ToUint8Array(b64);
  const wb = XLSX.read(data, { type: "array" });
  const out: SheetMatrix[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
    if (aoa.length) out.push(aoa);
  }
  return out;
}

const CHEST_WORKBOOK_SHEETS = ["Chest", "Bundle"] as const;

/** Catalog column: which Chest.xlsx sheet the row came from */
export const CHEST_SOURCE_SHEET_HEADER = "来源表";

const ITEM_ID_ALIAS_LOWER = new Set(ITEM_ID_ALIASES.map((a) => a.toLowerCase()));

function isChestIdAliasHeader(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  if (t === ITEM_ID_HEADER || t === TYPE_REMARK_HEADER || t === CHEST_SOURCE_SHEET_HEADER) return true;
  return ITEM_ID_ALIAS_LOWER.has(t.toLowerCase());
}

function resolveChestCatalogIdColumn(aoa: SheetMatrix, headers: string[]): number {
  const preferAliases = [
    "礼包ID",
    "礼包Id",
    "ChestId",
    "ChestID",
    "chestId",
    "BundleId",
    "BundleID",
    "宝箱ID",
    "宝箱Id",
    ...ITEM_ID_ALIASES,
  ] as const;
  const seen = new Set<number>();
  for (const alias of preferAliases) {
    const i = findHeaderAliasIndex(headers, alias);
    if (i < 0 || seen.has(i)) continue;
    seen.add(i);
    if (findFirstNumericIdRowIndex(aoa, i) >= 0) return i;
  }
  return resolveExtraIdColumn(aoa, headers, ITEM_ID_ALIASES, true);
}

/**
 * Build a catalog matrix from Chest/Bundle sheets (for「全部宝箱/礼包」).
 * Skips multi-row meta headers; first col is 物品ID; stamps 类型备注=chest; adds 来源表.
 */
export function buildChestCatalogFromSheets(
  sheets: readonly { name: string; aoa: SheetMatrix }[],
): SheetMatrix | null {
  const usable = sheets.filter((s) => s.aoa?.length);
  if (!usable.length) return null;

  const otherHeaders: string[] = [];
  const otherHeaderSet = new Set<string>();
  for (const { aoa } of usable) {
    const headers = (aoa[0] ?? []).map((h) => cellStr(h).trim());
    const idCol = resolveChestCatalogIdColumn(aoa, headers);
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]!;
      if (!h || i === idCol || isChestIdAliasHeader(h)) continue;
      if (otherHeaderSet.has(h)) continue;
      otherHeaderSet.add(h);
      otherHeaders.push(h);
    }
  }

  const outHeaders = [ITEM_ID_HEADER, TYPE_REMARK_HEADER, CHEST_SOURCE_SHEET_HEADER, ...otherHeaders];
  const seenIds = new Set<string>();
  const body: unknown[][] = [];

  for (const { name, aoa } of usable) {
    const headers = (aoa[0] ?? []).map((h) => cellStr(h).trim());
    const idCol = resolveChestCatalogIdColumn(aoa, headers);
    if (idCol < 0) continue;
    const dataStart = findFirstNumericIdRowIndex(aoa, idCol);
    if (dataStart < 0) continue;

    const colByName = new Map<string, number>();
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]!;
      if (h && !colByName.has(h)) colByName.set(h, i);
    }

    for (let r = dataStart; r < aoa.length; r++) {
      const src = aoa[r] ?? [];
      const id = normalizeIdCell(src[idCol]);
      if (!/^\d+$/.test(id) || seenIds.has(id)) continue;
      seenIds.add(id);
      body.push(
        outHeaders.map((h) => {
          if (h === ITEM_ID_HEADER) return src[idCol] ?? id;
          if (h === TYPE_REMARK_HEADER) return CHEST_TYPE_REMARK;
          if (h === CHEST_SOURCE_SHEET_HEADER) return name;
          const ci = colByName.get(h);
          return ci == null ? "" : (src[ci] ?? "");
        }),
      );
    }
  }

  return [outHeaders, ...body];
}

/** Read Chest.xlsx and build catalog AOA for「全部宝箱/礼包」. */
export function buildChestCatalogAoa(chestB64: string): SheetMatrix | null {
  const sheets: { name: string; aoa: SheetMatrix }[] = [];
  for (const name of CHEST_WORKBOOK_SHEETS) {
    const aoa = readOptionalSheetFromWorkbook(chestB64, name);
    if (aoa) sheets.push({ name, aoa });
  }
  return buildChestCatalogFromSheets(sheets);
}

/**
 * Merge Chest.xlsx into Item：依次合并 Chest、Bundle；
 * 已有 ID 就地标记类型备注 chest；缺失 ID 追加到末尾。
 */
export function appendChestWorkbookToItemSheet(
  item: SheetMatrix,
  chestB64: string,
): { aoa: SheetMatrix; appended: number; stamped: number } {
  let aoa = item;
  let appended = 0;
  let stamped = 0;
  for (const name of CHEST_WORKBOOK_SHEETS) {
    const sheet = readOptionalSheetFromWorkbook(chestB64, name);
    if (!sheet) continue;
    const result = mergeChestSheetIntoItem(aoa, sheet);
    aoa = result.aoa;
    appended += result.appended;
    stamped += result.stamped;
  }
  return { aoa, appended, stamped };
}

const REMARK_CANDIDATES = ["物品备注", "ItemRemark", "itemRemark", "备注"];

/** 与 Excel 表头完全一致；用于「去 GMT」道具备注同名时按品质着色 */
const ITEM_QUALITY_HEADER = "物品品质";

export function resolveItemIdColumnIndex(headers: string[]): number {
  return headers.findIndex((h) => String(h).trim() === ITEM_ID_HEADER);
}

/** 与 Excel 表头完全一致；用于 AdminFinishTask */
const TASK_ID_HEADER = "任务ID";

export function resolveTaskIdColumnIndex(headers: string[]): number {
  return headers.findIndex((h) => String(h).trim() === TASK_ID_HEADER);
}

const QUALITY_INT_TO_LABEL: Record<number, string> = {
  4: "绿",
  5: "蓝",
  6: "紫",
  7: "金",
  8: "红",
};

/** 将单元格解析为有限整数；非数字或非整数返回 null */
export function parseCellAsInteger(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    if (!Number.isInteger(v)) return null;
    return v;
  }
  const s = String(v == null ? "" : v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

/** 品质为整数 4–8 时返回对应颜色字；小于 4、非数字、超出 8 返回空串 */
export function itemQualityPrefixFromCell(qualityCell: unknown): string {
  const q = parseCellAsInteger(qualityCell);
  if (q == null || q < 4) return "";
  return QUALITY_INT_TO_LABEL[q] ?? "";
}

export function resolveItemQualityColumnIndex(headers: string[]): number {
  return headers.findIndex((h) => h === ITEM_QUALITY_HEADER);
}

const DEFENSE_HEADER = "防护值";

export function resolveTypeRemarkColumnIndex(headers: string[]): number {
  return headers.findIndex((h) => cellStr(h) === TYPE_REMARK_HEADER);
}

export function resolveDefenseValueColumnIndex(headers: string[]): number {
  return headers.findIndex((h) => cellStr(h) === DEFENSE_HEADER);
}

const SEASON_ITEM_HEADER_CANDIDATES = ["赛季物品", "SeasonItem"];

export function resolveSeasonItemColumnIndex(headers: string[]): number {
  const norm = headers.map((h) => cellStr(h).toLowerCase());
  for (const c of SEASON_ITEM_HEADER_CANDIDATES) {
    const i = norm.indexOf(c.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

/** 赛季物品列：1 表示赛季物品 */
export function isSeasonItemCell(v: unknown): boolean {
  return parseCellAsInteger(v) === 1;
}

export function resolveRemarkColumnIndex(headers: string[], saved: string | null | undefined): number {
  const hs = headers.map((h) => String(h).trim());
  if (saved) {
    const i = hs.findIndex((h) => h === saved.trim());
    if (i >= 0) return i;
  }
  for (const c of REMARK_CANDIDATES) {
    const idx = hs.findIndex((h) => h === c);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** N/A、#N/A、na、null 等视为与空单元格同类（用于类型备注 / 品质桶 / 粘贴丢弃） */
export function isNaLikeCell(v: unknown): boolean {
  const t = cellStr(v).toLowerCase();
  return t === "n/a" || t === "#n/a" || t === "na" || t === "null";
}

/** 筛选/选项展示：空或 null 或 N/A 类显示为「空」 */
export function typeRemarkFilterKey(v: unknown): string {
  const s = cellStr(v);
  if (s === "" || isNaLikeCell(v)) return "空";
  return s;
}

/** 道具筛选「类型备注」预设项：固定显示为 Emote */
export const ITEM_TYPE_REMARK_PRESET_EMOTE = "Emote";

/** 道具筛选「类型备注」预设项：试衣间皮肤（Type 100/200） */
export const ITEM_TYPE_REMARK_PRESET_FITTING_ROOM = "试衣间皮肤";

export const ITEM_TYPE_WEAPON_SKIN = 100;
export const ITEM_TYPE_ARMOR_SKIN = 200;
export const ITEM_SUBTYPE_ARMOR_SKIN = 2000000;

const DA_HONG_JIAN_SHI = "大红检视";

/** 去除零宽/BOM/NBSP，避免 Excel 复制导致子串匹配失败 */
export function normalizeTypeRemarkForMatch(s: string): string {
  return s
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/\u00A0/g, " ");
}

/** 备注/类型备注单元格为「大红检视」类 Emote（含 Emote 且含大红检视） */
export function isDaHongJianShiEmoteTypeRemark(cell: unknown): boolean {
  const s = normalizeTypeRemarkForMatch(cellStr(cell));
  return s.includes("Emote") && s.includes(DA_HONG_JIAN_SHI);
}

/** 剪贴板原文长度上限（超出截断后再解析） */
export const MAX_FILTER_PASTE_CHARS = 200_000;
/** 去重后最多保留的关键字数 */
export const MAX_FILTER_PASTE_TOKENS = 5_000;
/** 无 tab/换行时，超过该长度视为会撑爆输入框 */
export const FILTER_PASTE_BULKY_CHAR_THRESHOLD = 80;
export const FILTER_PASTE_DISPLAY_FAIL = "识别失败";
/** @deprecated 请用 formatRecognizedIdLabel(n)；保留兼容旧 Chip */
export const FILTER_PASTE_DISPLAY_OK = "已识别id";
const FILTER_PASTE_OK_RE = /^已识别id · \d+(\/\d+)?$/;
const FILTER_CHIP_TITLE_PREVIEW = 8;

export function formatRecognizedIdLabel(count: number): string {
  return `已识别id · ${count}`;
}

export function formatRecognizedIdRatioLabel(matched: number, total: number): string {
  return `已识别id · ${matched}/${total}`;
}

/**
 * 规范化粘贴单元格：去引号、剥离「物品ID(类型名)」展示后缀，便于纯数字 ID 精确匹配。
 */
export function canonicalizeFilterToken(raw: string): string {
  let s = raw.replace(/^\uFEFF/, "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  // 11010016(武器) / 11010016（武器）— 表格「ID旁显示类型名」复制结果
  const labeled = s.match(/^(\d+)\s*[(\uFF08].*$/);
  if (labeled) return labeled[1]!;
  return s;
}

/**
 * 按 Excel 剪贴板拆分：行（换行）→ 列（Tab）；单元格内空格不拆。
 * 去空、保序去重，并受长度/条数上限约束。
 */
export function parseFilterKeywordTokens(raw: string): string[] {
  const clipped =
    raw.length > MAX_FILTER_PASTE_CHARS ? raw.slice(0, MAX_FILTER_PASTE_CHARS) : raw;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of clipped.split(/\r?\n/)) {
    for (const cell of line.split("\t")) {
      const t = canonicalizeFilterToken(cell);
      if (!t || isNaLikeCell(t) || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= MAX_FILTER_PASTE_TOKENS) return out;
    }
  }
  return out;
}

/** 持久化 / 匹配用的规范化关键字（多 token 用换行连接） */
export function normalizeFilterKeywordForStorage(raw: string): string {
  return parseFilterKeywordTokens(raw).join("\n");
}

/** 粘贴内容是否会撑爆搜索框（应压缩显示） */
export function isBulkyFilterPaste(raw: string): boolean {
  if (/[\t\r\n]/.test(raw)) return true;
  if (raw.length > FILTER_PASTE_BULKY_CHAR_THRESHOLD) return true;
  return parseFilterKeywordTokens(raw).length >= 2;
}

export function isFilterPasteSuccessDisplay(s: string): boolean {
  return FILTER_PASTE_OK_RE.test(s) || s === FILTER_PASTE_DISPLAY_OK;
}

export function isFilterPasteDisplayPlaceholder(s: string): boolean {
  return s === FILTER_PASTE_DISPLAY_FAIL || isFilterPasteSuccessDisplay(s);
}

export type FilterPasteMatchStats = {
  tokens: string[];
  matched: string[];
  unmatched: string[];
};

/** Per-token hit stats against table rows (early-stop per token). */
export function analyzeFilterPasteMatches(
  rows: Iterable<unknown[]>,
  keyword: string,
  idCol = -1,
): FilterPasteMatchStats {
  const tokens = parseFilterKeywordTokens(keyword);
  const matched: string[] = [];
  const unmatched: string[] = [];
  const rowList = Array.isArray(rows) ? rows : [...rows];
  for (const t of tokens) {
    if (rowHasAnyKeywordHit(rowList, t, idCol)) matched.push(t);
    else unmatched.push(t);
  }
  return { tokens, matched, unmatched };
}

/**
 * 超框粘贴时的输入框文案；非超框返回 null（继续显示原文）。
 * matched/total：表内命中 token 数 / 粘贴 token 数。
 */
export function formatFilterPasteInputDisplay(
  raw: string,
  matchedCount: number,
  totalTokens?: number,
): string | null {
  if (!isBulkyFilterPaste(raw)) return null;
  const total = totalTokens ?? parseFilterKeywordTokens(raw).length;
  if (total === 0 || matchedCount <= 0) return FILTER_PASTE_DISPLAY_FAIL;
  return formatRecognizedIdRatioLabel(matchedCount, total);
}

export function formatUnmatchedFilterTokensHint(unmatched: string[], cap = 8): string {
  if (unmatched.length === 0) return "";
  const shown = unmatched.slice(0, cap);
  const more = unmatched.length > cap ? ` 等 ${unmatched.length} 个` : "";
  return `未找到：${shown.join("、")}${more}`;
}

export function formatCustomKeywordChipLabel(key: string): string {
  const tokens = parseFilterKeywordTokens(key);
  return tokens.length >= 2 ? formatRecognizedIdLabel(tokens.length) : key;
}

export function formatCustomKeywordChipTitle(key: string): string {
  const tokens = parseFilterKeywordTokens(key);
  if (tokens.length < 2) return key;
  const preview = tokens.slice(0, FILTER_CHIP_TITLE_PREVIEW).join(", ");
  const ellipsis = tokens.length > FILTER_CHIP_TITLE_PREVIEW ? " …" : "";
  return `${preview}${ellipsis}（共 ${tokens.length} 项）`;
}

export function isNumericIdToken(s: string): boolean {
  return /^\d+$/.test(s);
}

/**
 * 行匹配关键字：
 * - 0 token → true
 * - 纯数字且 idCol>=0 → 仅 ID 列精确相等
 * - 1 个非数字 token → 任意列子串（不区分大小写）
 * - ≥2 token → 数字走 ID 列 Set；非数字走任意列精确 Set（OR）
 * - idCol<0 时数字回退为全列匹配（与旧行为一致）
 */
export function rowMatchesKeyword(row: unknown[], keyword: string, idCol = -1): boolean {
  const tokens = parseFilterKeywordTokens(keyword);
  if (tokens.length === 0) return true;

  if (tokens.length === 1) {
    const t = tokens[0]!;
    if (isNumericIdToken(t) && idCol >= 0) {
      return normalizeIdCell(row[idCol]) === t;
    }
    if (isNumericIdToken(t) && idCol < 0) {
      return row.some((cell) => normalizeIdCell(cell) === t);
    }
    const q = t.toLowerCase();
    return row.some((cell) => cellStr(cell).toLowerCase().includes(q));
  }

  const digitTokens: string[] = [];
  const textTokens: string[] = [];
  for (const t of tokens) {
    if (isNumericIdToken(t)) digitTokens.push(t);
    else textTokens.push(t.toLowerCase());
  }

  if (digitTokens.length > 0) {
    if (idCol >= 0) {
      const id = normalizeIdCell(row[idCol]);
      if (new Set(digitTokens).has(id)) return true;
    } else {
      const set = new Set(digitTokens);
      if (row.some((cell) => set.has(normalizeIdCell(cell)))) return true;
    }
  }

  if (textTokens.length > 0) {
    const set = new Set(textTokens);
    if (row.some((cell) => set.has(cellStr(cell).trim().toLowerCase()))) return true;
  }

  return false;
}

/** 表内是否存在命中行（早停） */
export function rowHasAnyKeywordHit(rows: Iterable<unknown[]>, keyword: string, idCol = -1): boolean {
  for (const row of rows) {
    if (rowMatchesKeyword(row, keyword, idCol)) return true;
  }
  return false;
}

/** 备注列含 Emote 且不含「大红检视」（预设 Emote 筛选用） */
export function rowMatchesEmotePreset(remarkCell: unknown): boolean {
  const s = normalizeTypeRemarkForMatch(cellStr(remarkCell));
  if (!s.includes("Emote")) return false;
  if (isDaHongJianShiEmoteTypeRemark(s)) return false;
  return true;
}

/** 试衣间皮肤：Type 100/200 或 SubType 2000000（防具皮肤） */
export function rowMatchesFittingRoomSkinPreset(
  row: unknown[],
  typeCol: number,
  subCol: number,
): boolean {
  if (typeCol >= 0) {
    const t = parseCellAsInteger(row[typeCol]);
    if (t === ITEM_TYPE_WEAPON_SKIN || t === ITEM_TYPE_ARMOR_SKIN) return true;
  }
  if (subCol >= 0) {
    const sub = parseCellAsInteger(row[subCol]);
    if (sub === ITEM_SUBTYPE_ARMOR_SKIN) return true;
  }
  return false;
}

/** 无防护值：null、空串、仅空白（数值 0 不算空） */
export function defenseCellIsEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string" && v.trim() === "") return true;
  return false;
}

/** 用于防护值范围比较；无法解析为有限数字返回 null */
export function parseCellAsFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v == null ? "" : v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 道具筛选品质桶：品质整数小于 4 为低品质；4–8 为颜色字；其余可解析整数为数字串；N/A 与不可解析为「空」 */
export function itemQualityFilterBucket(v: unknown): string {
  const q = parseCellAsInteger(v);
  if (q == null) return "空";
  if (q < 4) return "低品质";
  if (q >= 4 && q <= 8) return QUALITY_INT_TO_LABEL[q] ?? "空";
  return String(q);
}

const TASK_TYPE_HEADER = "TaskType";
const TASK_CHAIN_HEADER = "任务链";

export function resolveTaskTypeColumnIndex(headers: string[]): number {
  const hs = headers.map((h) => cellStr(h));
  let i = hs.findIndex((h) => h.toLowerCase() === TASK_TYPE_HEADER.toLowerCase());
  if (i >= 0) return i;
  return hs.findIndex((h) => h === "任务类型");
}

export function resolveTaskChainColumnIndex(headers: string[]): number {
  return headers.findIndex((h) => String(h).trim() === TASK_CHAIN_HEADER);
}

/** 任务类型筛选项固定标签的展示顺序（用于 UI 排序；与 taskTypeFilterKey 返回值一致） */
export const TASK_TYPE_LABEL_SORT_ORDER: readonly string[] = [
  "日常",
  "周常",
  "主线",
  "特殊任务账号绑定",
  "运营活动",
  "日常首胜",
  "活动任务",
  "当期BP任务",
];

function taskTypeFilterKeyFromInteger(q: number): string {
  if (q >= 2000 && q <= 3000) return "当期BP任务";
  if (q > 1000) return "活动任务";
  switch (q) {
    case 1:
      return "日常";
    case 2:
      return "周常";
    case 3:
      return "主线";
    case 4:
      return "特殊任务账号绑定";
    case 5:
      return "运营活动";
    case 6:
      return "日常首胜";
    default:
      return String(q);
  }
}

const TASK_TYPE_LABEL_SET = new Set<string>(TASK_TYPE_LABEL_SORT_ORDER);

/**
 * 任务类型筛选展示键：与 Excel TaskType 列一致（选项、行匹配、持久化均用此字符串）。
 * 整数按约定映射为标签；Excel 直接存中文标签或未知文案则保留原文字符串；空/N/A → 空。
 */
export function taskTypeFilterKey(v: unknown): string {
  if (isNaLikeCell(v)) return "空";
  const s = cellStr(v);
  if (s === "") return "空";

  const q = parseCellAsInteger(v);
  if (q != null) return taskTypeFilterKeyFromInteger(q);

  if (TASK_TYPE_LABEL_SET.has(s)) return s;
  return s;
}

/** 任务链筛选项：仅整数列参与；非整数或空返回 null（不出现在选项列表，筛选激活时该行不匹配任何链键） */
export function taskChainFilterKey(v: unknown): string | null {
  const q = parseCellAsInteger(v);
  if (q == null) return null;
  return String(q);
}

export function buildXlsxBase64(headers: string[], rows: unknown[][]): string {
  const aoa: unknown[][] = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  let binary = "";
  for (let i = 0; i < out.length; i++) binary += String.fromCharCode(out[i]!);
  return btoa(binary);
}
