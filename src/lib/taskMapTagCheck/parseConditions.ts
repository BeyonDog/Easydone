import {
  CDT_ARRIVE_AT_LOC,
  CDT_INTERACTIVE,
  CDT_KILL,
  CDT_KILL_TEAM_SHARE,
  CDT_MATCH_START_MASTERY,
  CDT_MATCH_START_SKILL,
  PRE_GAME_MODE,
  PRE_INTERACTOBJECT_TAG,
  PRE_ITERACTIVE_TYPE,
  PRE_LOCATION_ID,
  PRE_MASTERY_ID,
  PRE_MATCH_MODE,
  PRE_MONSTER_GROUP_ID,
  PRE_MONSTER_ID,
  PRE_MONSTER_TAG,
  PRE_MONSTER_TYPE,
  PRE_REFERENCE_ID,
  PRE_SKILL_ID,
  TASK_TYPE_MAIN,
  isExcludedFromMapCheck,
} from "./constants.ts";
import type {
  ConfigCheckTarget,
  TaskMapCondition,
  TaskMapConditionKind,
  TaskMapPreCondition,
} from "./types.ts";

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

function parsePreConditions(cols: string[]): TaskMapPreCondition[] {
  const pre: TaskMapPreCondition[] = [];
  for (let p = 0; p < 6; p++) {
    const base = 7 + p * 3;
    const type = Number(cols[base]);
    if (!type) continue;
    const value = Number(cols[base + 2] ?? 0);
    if (!Number.isFinite(value)) continue;
    pre.push({
      type,
      comparison: Number(cols[base + 1] ?? 0),
      value,
    });
  }
  return pre;
}

function collectConfigTargets(cdtType: number, cdtValue: number, pre: TaskMapPreCondition[]): ConfigCheckTarget[] {
  const out: ConfigCheckTarget[] = [];
  const push = (kind: ConfigCheckTarget["kind"], value: number) => {
    if (!value || !Number.isFinite(value)) return;
    if (!out.some((t) => t.kind === kind && t.value === value)) {
      out.push({ kind, value });
    }
  };

  for (const p of pre) {
    if (p.type === PRE_MONSTER_ID) push("monster_id", p.value);
    if (p.type === PRE_MONSTER_TYPE) push("monster_type", p.value);
    if (p.type === PRE_MONSTER_GROUP_ID) push("monster_group", p.value);
    if (p.type === PRE_MONSTER_TAG) push("monster_tag", p.value);
    if (p.type === PRE_SKILL_ID) push("skill_id", p.value);
    if (p.type === PRE_MASTERY_ID) push("mastery_id", p.value);
  }

  if (cdtType === CDT_MATCH_START_SKILL) push("skill_id", cdtValue);
  if (cdtType === CDT_MATCH_START_MASTERY) push("mastery_id", cdtValue);

  return out;
}

export function detectKind(cdtType: number, pre: TaskMapPreCondition[]): TaskMapConditionKind | null {
  if (cdtType === CDT_INTERACTIVE && pre.some((p) => p.type === PRE_INTERACTOBJECT_TAG)) {
    return "chest_tag";
  }
  if (cdtType === CDT_ARRIVE_AT_LOC && pre.some((p) => p.type === PRE_LOCATION_ID)) {
    return "arrive";
  }
  if (cdtType === CDT_INTERACTIVE && pre.some((p) => p.type === PRE_REFERENCE_ID)) {
    return "interact_ref";
  }
  if (cdtType === CDT_INTERACTIVE && pre.some((p) => p.type === PRE_ITERACTIVE_TYPE)) {
    return "interact_type";
  }
  if (
    (cdtType === CDT_KILL || cdtType === CDT_KILL_TEAM_SHARE) &&
    pre.some(
      (p) =>
        p.type === PRE_MONSTER_ID ||
        p.type === PRE_MONSTER_TYPE ||
        p.type === PRE_MONSTER_GROUP_ID ||
        p.type === PRE_MONSTER_TAG,
    )
  ) {
    return "kill";
  }
  if (
    cdtType === CDT_MATCH_START_SKILL ||
    cdtType === CDT_MATCH_START_MASTERY ||
    pre.some((p) => p.type === PRE_SKILL_ID || p.type === PRE_MASTERY_ID)
  ) {
    return "skill_or_mastery";
  }
  return null;
}

function extractTargetTag(kind: TaskMapConditionKind, pre: TaskMapPreCondition[], cdtValue: number): number {
  if (kind === "chest_tag") {
    return pre.find((p) => p.type === PRE_INTERACTOBJECT_TAG)?.value ?? 0;
  }
  if (kind === "arrive") {
    return pre.find((p) => p.type === PRE_LOCATION_ID)?.value ?? 0;
  }
  if (kind === "interact_ref") {
    return pre.find((p) => p.type === PRE_REFERENCE_ID)?.value ?? 0;
  }
  if (kind === "interact_type") {
    return pre.find((p) => p.type === PRE_ITERACTIVE_TYPE)?.value ?? 0;
  }
  if (kind === "skill_or_mastery") {
    return (
      pre.find((p) => p.type === PRE_SKILL_ID || p.type === PRE_MASTERY_ID)?.value ??
      cdtValue ??
      0
    );
  }
  if (kind === "kill") {
    return (
      pre.find(
        (p) =>
          p.type === PRE_MONSTER_ID ||
          p.type === PRE_MONSTER_TAG ||
          p.type === PRE_MONSTER_GROUP_ID ||
          p.type === PRE_MONSTER_TYPE,
      )?.value ?? 0
    );
  }
  return 0;
}

export function isMapConditionKind(kind: TaskMapConditionKind): boolean {
  return kind === "chest_tag" || kind === "arrive";
}

export function parseConditionCsv(text: string): TaskMapCondition[] {
  const lines = text.trim().split(/\r?\n/);
  const out: TaskMapCondition[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const id = cols[0]?.trim() ?? "";
    if (!/^\d+$/.test(id)) continue;
    const cdtType = Number(cols[5]);
    const cdtValue = Number(cols[6] ?? 0);
    const pre = parsePreConditions(cols);
    const kind = detectKind(cdtType, pre);
    if (!kind) continue;
    if (kind === "interact_ref" || kind === "interact_type") continue;
    const configTargets = collectConfigTargets(cdtType, cdtValue, pre);
    const targetTag = extractTargetTag(kind, pre, cdtValue);
    if (isMapConditionKind(kind) && !targetTag) continue;
    if (kind === "kill" && configTargets.filter((t) => t.kind.startsWith("monster")).length === 0) continue;
    if (kind === "skill_or_mastery" && configTargets.filter((t) => t.kind === "skill_id" || t.kind === "mastery_id").length === 0) {
      continue;
    }
    out.push({
      conditionId: id,
      remark: cols[1]?.trim() ?? "",
      kind,
      cdtType,
      cdtValue: Number.isFinite(cdtValue) ? cdtValue : 0,
      targetTag,
      preConditions: pre,
      configTargets,
      taskIds: [],
      taskNames: [],
    });
  }
  return out;
}

export type TaskCsvMeta = {
  taskChain?: number;
  taskName: string;
};

/** TaskID → TaskChain / 任务名（供地图范围解析） */
export function parseTaskMetaById(text: string): Map<string, TaskCsvMeta> {
  const lines = text.trim().split(/\r?\n/);
  const map = new Map<string, TaskCsvMeta>();
  if (lines.length < 3) return map;
  const header = parseCsvLine(lines[0]!);
  const taskIdIdx = header.findIndex((h) => h.trim().toLowerCase() === "taskid");
  const typeIdx = header.findIndex((h) => h.trim().toLowerCase() === "tasktype");
  const chainIdx = header.findIndex((h) => h.trim().toLowerCase() === "taskchain");
  const nameIdx = 1;
  if (taskIdIdx < 0) return map;

  for (let i = 2; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const taskId = cols[taskIdIdx]?.trim() ?? "";
    if (!/^\d+$/.test(taskId)) continue;
    if (typeIdx >= 0) {
      const taskType = Number(cols[typeIdx]);
      if (taskType !== TASK_TYPE_MAIN) continue;
    }
    if (isExcludedFromMapCheck(taskId)) continue;
    const taskName = cols[nameIdx]?.trim() ?? taskId;
    const chainRaw = chainIdx >= 0 ? cols[chainIdx]?.trim() ?? "" : "";
    const taskChain = /^\d+$/.test(chainRaw) ? Number(chainRaw) : undefined;
    map.set(taskId, { taskName, taskChain });
  }
  return map;
}

export function parseTaskCsvForConditions(text: string): Map<string, { taskIds: string[]; taskNames: string[] }> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 3) return new Map();
  const header = parseCsvLine(lines[0]!);
  const taskIdIdx = header.findIndex((h) => h.trim().toLowerCase() === "taskid");
  const typeIdx = header.findIndex((h) => h.trim().toLowerCase() === "tasktype");
  const condIdx = header.findIndex((h) => h.trim().toLowerCase() === "conditions");
  const nameIdx = 1;
  const map = new Map<string, { taskIds: string[]; taskNames: string[] }>();
  if (taskIdIdx < 0 || condIdx < 0) return map;

  for (let i = 2; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const taskId = cols[taskIdIdx]?.trim() ?? "";
    if (!/^\d+$/.test(taskId)) continue;
    if (typeIdx >= 0) {
      const taskType = Number(cols[typeIdx]);
      if (taskType !== TASK_TYPE_MAIN) continue;
    }
    if (isExcludedFromMapCheck(taskId)) continue;
    const taskName = cols[nameIdx]?.trim() ?? taskId;
    const condRaw = cols[condIdx]?.trim() ?? "";
    if (!condRaw) continue;
    for (const cid of condRaw.split(";")) {
      const conditionId = cid.trim();
      if (!conditionId) continue;
      const entry = map.get(conditionId) ?? { taskIds: [], taskNames: [] };
      if (!entry.taskIds.includes(taskId)) {
        entry.taskIds.push(taskId);
        entry.taskNames.push(taskName);
      }
      map.set(conditionId, entry);
    }
  }
  return map;
}

export function attachTasksToConditions(
  conditions: TaskMapCondition[],
  taskMap: Map<string, { taskIds: string[]; taskNames: string[] }>,
): TaskMapCondition[] {
  return conditions
    .map((c) => {
      const link = taskMap.get(c.conditionId);
      return {
        ...c,
        taskIds: link?.taskIds ?? [],
        taskNames: link?.taskNames ?? [],
      };
    })
    .filter((c) => c.taskIds.length > 0);
}

export function getGameModePrecond(condition: TaskMapCondition): TaskMapPreCondition | undefined {
  return condition.preConditions.find((p) => p.type === PRE_GAME_MODE);
}

export function getMatchModePrecond(condition: TaskMapCondition): TaskMapPreCondition | undefined {
  return condition.preConditions.find((p) => p.type === PRE_MATCH_MODE);
}
