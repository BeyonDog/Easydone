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

const REMARK_CANDIDATES = ["物品备注", "ItemRemark", "itemRemark", "备注"];

/** 与 Excel 表头完全一致；用于 AdminSendMail 物品 ID */
const ITEM_ID_HEADER = "物品ID";

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

const TYPE_REMARK_HEADER = "类型备注";
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

export function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

/** N/A、#N/A、na 等视为与空单元格同类（用于类型备注 / 品质桶等） */
export function isNaLikeCell(v: unknown): boolean {
  const t = cellStr(v).toLowerCase();
  return t === "n/a" || t === "#n/a" || t === "na";
}

/** 筛选/选项展示：空或 null 或 N/A 类显示为「空」 */
export function typeRemarkFilterKey(v: unknown): string {
  const s = cellStr(v);
  if (s === "" || isNaLikeCell(v)) return "空";
  return s;
}

/** 道具筛选「类型备注」预设项：固定显示为 Emote */
export const ITEM_TYPE_REMARK_PRESET_EMOTE = "Emote";

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

/** 行内任意单元格包含关键字（不区分大小写） */
export function rowMatchesKeyword(row: unknown[], keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return row.some((cell) => cellStr(cell).toLowerCase().includes(q));
}

/** 备注列含 Emote 且不含「大红检视」（预设 Emote 筛选用） */
export function rowMatchesEmotePreset(remarkCell: unknown): boolean {
  const s = normalizeTypeRemarkForMatch(cellStr(remarkCell));
  if (!s.includes("Emote")) return false;
  if (isDaHongJianShiEmoteTypeRemark(s)) return false;
  return true;
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
