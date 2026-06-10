import { parseCellAsInteger } from "./xlsxHelpers.ts";

export type ParsedTaskCsv = {
  delimiter: "," | "\t";
  rows: string[][];
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

export function resolveTaskCsvColumnIndex(headers: string[], candidates: string[]): number {
  const norm = headers.map(normalizeHeader);
  const want = candidates.map((c) => c.toLowerCase());
  for (const w of want) {
    const i = norm.indexOf(w);
    if (i >= 0) return i;
  }
  return -1;
}

/** 与 Mission 表任务 ID 对齐，用于匹配 task.csv 行 */
export function normalizeTaskIdFromCsvCell(v: string): string {
  const trimmed = v.trim();
  if (!trimmed) return "";
  const q = parseCellAsInteger(trimmed);
  if (q != null) return String(q);
  return trimmed;
}

function detectDelimiter(headerLine: string): "," | "\t" {
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

/** 解析单行 CSV/TSV（支持引号包裹字段） */
function parseCsvLine(line: string, delimiter: "," | "\t"): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function escapeCsvField(value: string, delimiter: "," | "\t"): string {
  const needsQuote =
    value.includes('"') || value.includes("\n") || value.includes("\r") || value.includes(delimiter);
  if (!needsQuote) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function serializeCsvLine(fields: string[], delimiter: "," | "\t"): string {
  return fields.map((f) => escapeCsvField(f, delimiter)).join(delimiter);
}

export function serializeParsedCsv(parsed: ParsedTaskCsv): string {
  return parsed.rows.map((r) => serializeCsvLine(r, parsed.delimiter)).join("\n");
}

export function parseTaskCsv(text: string): ParsedTaskCsv {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line, idx, arr) => {
    if (line.length > 0) return true;
    return idx < arr.length - 1;
  });
  if (lines.length === 0) {
    return { delimiter: ",", rows: [] };
  }
  const delimiter = detectDelimiter(lines[0]!);
  const rows = lines.map((line) => parseCsvLine(line, delimiter));
  return { delimiter, rows };
}

export type PatchTaskCsvResult =
  | { ok: true; text: string; clearedCount: number }
  | { ok: false; message: string };

/**
 * 对勾选任务 ID 对应行清空 PreTaskID，生成可上传的 CSV 文本（不修改本地源文件）。
 */
export function patchTaskCsvClearPreTaskIds(csvText: string, taskIds: Set<string>): PatchTaskCsvResult {
  const { delimiter, rows } = parseTaskCsv(csvText);
  if (rows.length === 0) {
    return { ok: false, message: "task.csv 为空" };
  }
  const headers = rows[0]!;
  const taskIdCol = resolveTaskCsvColumnIndex(headers, ["TaskID", "TaskId", "任务ID"]);
  if (taskIdCol < 0) {
    return { ok: false, message: "task.csv 中未找到 TaskID / 任务ID 列" };
  }
  const preTaskCol = resolveTaskCsvColumnIndex(headers, ["PreTaskID", "PreTaskId", "PreTask"]);
  if (preTaskCol < 0) {
    return { ok: false, message: "task.csv 中未找到 PreTaskID 列" };
  }

  let clearedCount = 0;
  const outRows = rows.map((row, rowIdx) => {
    if (rowIdx === 0) return row;
    const padded = [...row];
    while (padded.length < headers.length) padded.push("");
    if (padded.length > headers.length) padded.length = headers.length;

    const idCell = padded[taskIdCol] ?? "";
    const idKey = normalizeTaskIdFromCsvCell(idCell);
    if (idKey && taskIds.has(idKey)) {
      if ((padded[preTaskCol] ?? "").trim() !== "") clearedCount++;
      padded[preTaskCol] = "";
    }
    return padded;
  });

  const text = serializeParsedCsv({ delimiter, rows: outRows });
  return { ok: true, text, clearedCount };
}
