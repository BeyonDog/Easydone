import {
  BOOLEAN_CDT_TYPES,
  PRE_HEAD_SHOOT,
  REQUIRED_PRE_BY_CDT,
  cdtTypeLabel,
  isKnownCdtType,
  preCdtTypeLabel,
} from "./conditionCatalog.ts";
import type { ConditionPreSlot, ConditionRowInput } from "./conditionTranslate.ts";
import { isExcludedFromMapCheck } from "./taskMapTagCheck/constants.ts";
import type { TagCheckIssue, TagCheckIssueKind, TagCheckReport } from "./taskMapTagCheck/types.ts";
import { cellStr, resolveTaskIdColumnIndex, type SheetMatrix } from "./xlsxHelpers.ts";

export type HealthTaskRow = {
  taskId: string;
  taskName: string;
  conditionsRaw: string;
  relationRaw: string;
};

export type HealthPreSlot = ConditionPreSlot & { valueMissing?: boolean };

export type HealthConditionRow = ConditionRowInput & {
  remark?: string;
  preConditions: HealthPreSlot[];
};

function parseCsvLine(line: string): string[] {
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
    if (ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function cell(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parsePreSlotsFromCols(cols: string[], typeStart: number): HealthPreSlot[] {
  const pre: HealthPreSlot[] = [];
  for (let p = 0; p < 6; p++) {
    const base = typeStart + p * 3;
    const typeRaw = cols[base]?.trim() ?? "";
    const type = Number(typeRaw);
    if (!type) continue;
    const valueRaw = cols[base + 2]?.trim() ?? "";
    const value = Number(valueRaw);
    pre.push({
      slot: p + 1,
      type,
      comparison: Number(cols[base + 1] ?? 0) || 0,
      value: Number.isFinite(value) ? value : 0,
      valueMissing: valueRaw === "",
    });
  }
  return pre;
}

function parsePreSlotsFromAoaRow(row: unknown[], col: (name: string) => number): HealthPreSlot[] {
  const pre: HealthPreSlot[] = [];
  for (let p = 1; p <= 6; p++) {
    const typeCol = col(`PreCdtType${p}`);
    if (typeCol < 0) continue;
    const typeRaw = cell(row[typeCol]);
    const type = Number(typeRaw);
    if (!type) continue;
    const cmpCol = col(`Comparison${p}`);
    const valCol = col(`PreCdtValue${p}`);
    const valueRaw = valCol >= 0 ? cell(row[valCol]) : "";
    const value = Number(valueRaw);
    pre.push({
      slot: p,
      type,
      comparison: cmpCol >= 0 ? Number(cell(row[cmpCol])) || 0 : 0,
      value: Number.isFinite(value) ? value : 0,
      valueMissing: valueRaw === "",
    });
  }
  return pre;
}

export function parseConditionCsvAll(text: string): HealthConditionRow[] {
  const lines = text.trim().split(/\r?\n/);
  const out: HealthConditionRow[] = [];
  if (lines.length < 2) return out;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const id = cols[0]?.trim() ?? "";
    if (!/^\d+$/.test(id)) continue;
    const cdtType = Number(cols[5]);
    const cdtValue = Number(cols[6] ?? 0);
    const relationRaw = cols[25]?.trim() ?? "";
    out.push({
      conditionId: id,
      remark: cols[1]?.trim() ?? "",
      cdtType: Number.isFinite(cdtType) ? cdtType : 0,
      cdtValue: Number.isFinite(cdtValue) ? cdtValue : 0,
      preConditions: parsePreSlotsFromCols(cols, 7),
      preCdtRelation: relationRaw === "" ? undefined : relationRaw,
    });
  }
  return out;
}

export function parseTaskCsvAll(text: string): HealthTaskRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 3) return [];
  const header = parseCsvLine(lines[0]!);
  const taskIdIdx = header.findIndex((h) => h.trim().toLowerCase() === "taskid");
  const condIdx = header.findIndex((h) => {
    const k = h.trim().toLowerCase();
    return k === "conditions" || h.trim() === "完成条件";
  });
  const relIdx = header.findIndex((h) => {
    const k = h.trim().toLowerCase();
    return k === "conditionrelation" || h.trim() === "条件关系";
  });
  const nameIdx = 1;
  if (taskIdIdx < 0) return [];
  const out: HealthTaskRow[] = [];
  for (let i = 2; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const taskId = cols[taskIdIdx]?.trim() ?? "";
    if (!/^\d+$/.test(taskId)) continue;
    out.push({
      taskId,
      taskName: cols[nameIdx]?.trim() ?? taskId,
      conditionsRaw: condIdx >= 0 ? cols[condIdx]?.trim() ?? "" : "",
      relationRaw: relIdx >= 0 ? cols[relIdx]?.trim() ?? "" : "",
    });
  }
  return out;
}

function normHeader(h: string): string {
  return h.trim().toLowerCase();
}

export function parseConditionAoaAll(aoa: unknown[][]): HealthConditionRow[] {
  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(aoa.length, 12); i++) {
    const row = (aoa[i] ?? []).map((c) => cell(c));
    if (row.some((c) => normHeader(c) === "cdttype")) {
      headerIdx = i;
      headers = row;
      break;
    }
  }
  if (headerIdx < 0) return [];
  const col = (name: string): number => headers.findIndex((h) => normHeader(h) === name.toLowerCase());
  const idCol = ["ID", "Id", "条件ID"].reduce((found, name) => (found >= 0 ? found : col(name)), -1);
  const typeCol = col("CdtType");
  const valueCol = col("CdtValue");
  const remarkCol = col("Remark") >= 0 ? col("Remark") : 1;
  const relCol = col("PreCdtRelation");
  if (idCol < 0 || typeCol < 0) return [];
  const out: HealthConditionRow[] = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row) continue;
    const id = cell(row[idCol]);
    if (!/^\d+$/.test(id)) continue;
    const cdtType = Number(cell(row[typeCol]));
    const cdtValue = Number(cell(row[valueCol]));
    const relationRaw = relCol >= 0 ? cell(row[relCol]) : "";
    out.push({
      conditionId: id,
      remark: cell(row[remarkCol]),
      cdtType: Number.isFinite(cdtType) ? cdtType : 0,
      cdtValue: Number.isFinite(cdtValue) ? cdtValue : 0,
      preConditions: parsePreSlotsFromAoaRow(row, col),
      preCdtRelation: relationRaw === "" ? undefined : relationRaw,
    });
  }
  return out;
}

function splitConditionIds(raw: string): string[] {
  return raw
    .split(/[;；,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function fieldIssue(partial: Partial<TagCheckIssue> & { kind: TagCheckIssueKind; message: string }): TagCheckIssue {
  return {
    severity: "error",
    taskId: "",
    taskName: "",
    conditionId: "",
    conditionRemark: "",
    targetTag: 0,
    mapId: 0,
    mapName: "",
    variantLabel: "",
    terrain: "ice",
    playerMode: "multi",
    matchTier: "other",
    variantSuffix: "",
    mapDataFile: "",
    layerFilesChecked: [],
    highValueZone: "unknown",
    ...partial,
  };
}

function validateCondition(cond: HealthConditionRow, task: HealthTaskRow): TagCheckIssue[] {
  const issues: TagCheckIssue[] = [];
  const base = {
    taskId: task.taskId,
    taskName: task.taskName,
    conditionId: cond.conditionId,
    conditionRemark: cond.remark ?? "",
  };
  if (!cond.cdtType || !isKnownCdtType(cond.cdtType)) {
    issues.push(
      fieldIssue({
        ...base,
        kind: "unknown_cdt_type",
        message: `未知 CdtType ${cond.cdtType || "空"}（${cdtTypeLabel(cond.cdtType)}）`,
      }),
    );
    return issues;
  }
  if (!BOOLEAN_CDT_TYPES.has(cond.cdtType)) {
    if (!Number.isInteger(cond.cdtValue) || cond.cdtValue <= 0) {
      issues.push(
        fieldIssue({
          ...base,
          kind: "missing_field",
          message: `条件 ${cond.conditionId} 缺少有效 CdtValue`,
        }),
      );
    }
  }
  for (const pre of cond.preConditions) {
    if (pre.valueMissing && pre.type !== PRE_HEAD_SHOOT) {
      issues.push(
        fieldIssue({
          ...base,
          kind: "missing_field",
          message: `条件 ${cond.conditionId} 的 ${preCdtTypeLabel(pre.type, cond.cdtType)} 未填 PreCdtValue`,
        }),
      );
    }
  }
  const requiredPre = REQUIRED_PRE_BY_CDT[cond.cdtType];
  if (requiredPre && !cond.preConditions.some((p) => p.type === requiredPre)) {
    issues.push(
      fieldIssue({
        ...base,
        kind: "missing_field",
        message: `条件 ${cond.conditionId} 缺少前置 ${preCdtTypeLabel(requiredPre, cond.cdtType)}`,
      }),
    );
  }
  return issues;
}

export function collectFieldIssues(tasks: HealthTaskRow[], conditions: HealthConditionRow[]): TagCheckIssue[] {
  const byId = new Map(conditions.map((c) => [c.conditionId, c]));
  const issues: TagCheckIssue[] = [];
  const validated = new Set<string>();

  for (const task of tasks) {
    if (isExcludedFromMapCheck(task.taskId)) continue;
    const ids = splitConditionIds(task.conditionsRaw);
    if (ids.length === 0) {
      issues.push(
        fieldIssue({
          kind: "empty_conditions",
          taskId: task.taskId,
          taskName: task.taskName,
          message: `任务 ${task.taskId} 未配置完成条件`,
        }),
      );
      continue;
    }
    for (const conditionId of ids) {
      const cond = byId.get(conditionId);
      if (!cond) {
        issues.push(
          fieldIssue({
            kind: "dangling_condition",
            taskId: task.taskId,
            taskName: task.taskName,
            conditionId,
            message: `任务 ${task.taskId} 引用了不存在的条件 ${conditionId}`,
          }),
        );
        continue;
      }
      if (validated.has(conditionId)) continue;
      validated.add(conditionId);
      issues.push(...validateCondition(cond, task));
    }
  }
  return issues;
}

export function mergeHealthReport(report: TagCheckReport, fieldIssues: TagCheckIssue[]): TagCheckReport {
  const issues = [...report.issues, ...fieldIssues];
  return {
    ...report,
    issues,
    summary: {
      ...report.summary,
      errorCount: issues.filter((i) => i.severity === "error").length,
      warnCount: issues.filter((i) => i.severity === "warn").length,
    },
  };
}

export function conditionRowsToMap(rows: HealthConditionRow[]): Map<string, ConditionRowInput> {
  return new Map(rows.map((r) => [r.conditionId, r]));
}

export function parseTaskConditionRefs(
  aoa: SheetMatrix,
  dataIdx: number,
): { taskId: string; conditionIds: string[]; relationRaw: string } | null {
  const headers = (aoa[0] ?? []).map((h) => cellStr(h));
  const idCol = resolveTaskIdColumnIndex(headers);
  if (idCol < 0) return null;
  const row = aoa[dataIdx + 1];
  if (!row) return null;
  const taskId = cellStr(row[idCol]).trim();
  if (!taskId) return null;
  const condCol = headers.findIndex((h) => {
    const k = h.trim().toLowerCase();
    return k === "conditions" || h.trim() === "完成条件" || h.trim() === "条件";
  });
  const relCol = headers.findIndex((h) => {
    const k = h.trim().toLowerCase();
    return k === "conditionrelation" || h.trim() === "条件关系";
  });
  return {
    taskId,
    conditionIds: splitConditionIds(condCol >= 0 ? cellStr(row[condCol]) : ""),
    relationRaw: relCol >= 0 ? cellStr(row[relCol]) : "",
  };
}

export function mergeTaskConditionRefsWithCsv(
  sheetRefs: { taskId: string; conditionIds: string[]; relationRaw: string },
  csvTasks: HealthTaskRow[],
): { taskId: string; conditionIds: string[]; relationRaw: string } {
  if (sheetRefs.conditionIds.length > 0) return sheetRefs;
  const hit = csvTasks.find((t) => t.taskId === sheetRefs.taskId);
  if (!hit) return sheetRefs;
  return {
    taskId: sheetRefs.taskId,
    conditionIds: splitConditionIds(hit.conditionsRaw),
    relationRaw: sheetRefs.relationRaw || hit.relationRaw,
  };
}
