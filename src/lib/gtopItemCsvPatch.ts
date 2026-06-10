import { parseCellAsInteger } from "./xlsxHelpers.ts";
import {
  normalizeTaskIdFromCsvCell,
  parseTaskCsv,
  resolveTaskCsvColumnIndex,
  serializeParsedCsv,
} from "./gtopTaskCsvPatch.ts";

export type ItemPricePatch = {
  baseValue?: number;
  stdPrice?: number;
};

export type PatchItemCsvPricesResult =
  | {
      ok: true;
      text: string;
      oldBaseValue?: string;
      newBaseValue?: string;
      oldStdPrice?: string;
      newStdPrice?: string;
    }
  | { ok: false; message: string };

function normalizeItemIdFromCsvCell(v: string): string {
  return normalizeTaskIdFromCsvCell(v);
}

function resolveItemIdColumn(headers: string[]): number {
  return resolveTaskCsvColumnIndex(headers, ["ItemID", "ItemId", "物品ID"]);
}

function resolveBaseValueColumn(headers: string[]): number {
  return resolveTaskCsvColumnIndex(headers, ["BaseValue", "基础价值"]);
}

function resolveStdPriceColumn(headers: string[]): number {
  return resolveTaskCsvColumnIndex(headers, ["StdPrice", "标准价格"]);
}

function validatePrice(n: number | undefined, label: string): string | null {
  if (n === undefined) return null;
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return `${label} 须为非负整数`;
  }
  return null;
}

/**
 * 修改 Item.csv 中指定物品的价格字段，生成可上传文本（不修改本地源文件）。
 */
export function patchItemCsvPrices(
  csvText: string,
  itemId: string,
  changes: ItemPricePatch,
): PatchItemCsvPricesResult {
  const idKey = itemId.trim();
  if (!idKey) return { ok: false, message: "物品 ID 为空" };

  const baseErr = validatePrice(changes.baseValue, "BaseValue");
  if (baseErr) return { ok: false, message: baseErr };
  const stdErr = validatePrice(changes.stdPrice, "StdPrice");
  if (stdErr) return { ok: false, message: stdErr };
  if (changes.baseValue === undefined && changes.stdPrice === undefined) {
    return { ok: false, message: "请至少填写 BaseValue 或 StdPrice" };
  }

  const parsed = parseTaskCsv(csvText);
  if (parsed.rows.length === 0) {
    return { ok: false, message: "Item.csv 为空" };
  }

  const headers = parsed.rows[0]!;
  const itemIdCol = resolveItemIdColumn(headers);
  if (itemIdCol < 0) {
    return { ok: false, message: "Item.csv 中未找到 ItemID / 物品ID 列" };
  }

  const baseCol = changes.baseValue !== undefined ? resolveBaseValueColumn(headers) : -1;
  if (changes.baseValue !== undefined && baseCol < 0) {
    return { ok: false, message: "Item.csv 中未找到 BaseValue 列" };
  }
  const stdCol = changes.stdPrice !== undefined ? resolveStdPriceColumn(headers) : -1;
  if (changes.stdPrice !== undefined && stdCol < 0) {
    return { ok: false, message: "Item.csv 中未找到 StdPrice 列" };
  }

  let matched = false;
  let oldBaseValue: string | undefined;
  let newBaseValue: string | undefined;
  let oldStdPrice: string | undefined;
  let newStdPrice: string | undefined;

  const outRows = parsed.rows.map((row, rowIdx) => {
    if (rowIdx === 0) return row;
    const padded = [...row];
    while (padded.length < headers.length) padded.push("");
    if (padded.length > headers.length) padded.length = headers.length;

    const rowId = normalizeItemIdFromCsvCell(padded[itemIdCol] ?? "");
    if (!rowId || rowId !== idKey) return padded;

    matched = true;
    if (changes.baseValue !== undefined && baseCol >= 0) {
      oldBaseValue = (padded[baseCol] ?? "").trim();
      newBaseValue = String(changes.baseValue);
      padded[baseCol] = newBaseValue;
    }
    if (changes.stdPrice !== undefined && stdCol >= 0) {
      oldStdPrice = (padded[stdCol] ?? "").trim();
      newStdPrice = String(changes.stdPrice);
      padded[stdCol] = newStdPrice;
    }
    return padded;
  });

  if (!matched) {
    return { ok: false, message: `Item.csv 中未找到物品 ID ${idKey}` };
  }

  return {
    ok: true,
    text: serializeParsedCsv({ delimiter: parsed.delimiter, rows: outRows }),
    oldBaseValue,
    newBaseValue,
    oldStdPrice,
    newStdPrice,
  };
}

/** 将 Item.csv 单元格解析为还原用的非负整数；空串视为 0 */
export function parseItemPriceCell(
  raw: string,
  label: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: 0 };
  const n = parseCellAsInteger(t);
  if (n == null || n < 0 || !Number.isInteger(n)) {
    return { ok: false, message: `${label} 默认值「${t}」不是有效非负整数` };
  }
  return { ok: true, value: n };
}

/** 从 Item.csv 文本读取指定物品的 BaseValue / StdPrice（用于弹窗预填） */
export function readItemPricesFromCsv(
  csvText: string,
  itemId: string,
): { baseValue: string; stdPrice: string } | null {
  const idKey = itemId.trim();
  if (!idKey) return null;
  const parsed = parseTaskCsv(csvText);
  if (parsed.rows.length < 2) return null;
  const headers = parsed.rows[0]!;
  const itemIdCol = resolveItemIdColumn(headers);
  if (itemIdCol < 0) return null;
  const baseCol = resolveBaseValueColumn(headers);
  const stdCol = resolveStdPriceColumn(headers);

  for (let i = 1; i < parsed.rows.length; i++) {
    const row = parsed.rows[i]!;
    const rowId = normalizeItemIdFromCsvCell(row[itemIdCol] ?? "");
    if (rowId !== idKey) continue;
    return {
      baseValue: baseCol >= 0 ? (row[baseCol] ?? "").trim() : "",
      stdPrice: stdCol >= 0 ? (row[stdCol] ?? "").trim() : "",
    };
  }
  return null;
}

/** 从道具表表头解析 BaseValue / StdPrice 列索引（Excel 展示用） */
export function resolveItemBaseValueColumnIndex(headers: string[]): number {
  return resolveTaskCsvColumnIndex(headers, ["BaseValue", "基础价值"]);
}

export function resolveItemStdPriceColumnIndex(headers: string[]): number {
  return resolveTaskCsvColumnIndex(headers, ["StdPrice", "标准价格"]);
}

export function readItemPricesFromTableRow(
  aoa: unknown[][],
  dataIdx: number,
): { baseValue: string; stdPrice: string } {
  const headers = aoa[0]?.map((h) => String(h ?? "").trim()) ?? [];
  const row = aoa[dataIdx + 1];
  const empty = { baseValue: "", stdPrice: "" };
  if (!row) return empty;
  const baseCol = resolveItemBaseValueColumnIndex(headers);
  const stdCol = resolveItemStdPriceColumnIndex(headers);
  const cellStr = (v: unknown) => {
    const q = parseCellAsInteger(v);
    return q != null ? String(q) : String(v ?? "").trim();
  };
  return {
    baseValue: baseCol >= 0 ? cellStr(row[baseCol]) : "",
    stdPrice: stdCol >= 0 ? cellStr(row[stdCol]) : "",
  };
}
