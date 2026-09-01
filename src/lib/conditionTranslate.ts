import {
  CDT_ARRIVE_AT_LOC,
  CDT_ESCAPE,
  CDT_GET_ITEMS,
  CDT_INTERACTIVE,
  CDT_KILL,
  CDT_KILL_TEAM_SHARE,
  CDT_LOGIN,
  CDT_MATCH,
  CDT_MATCH_START,
  CDT_USE_ITEMS_IN_MATCH,
  CMP_EQUAL,
  PRE_CLASS_GROUP_ID,
  PRE_CLASS_ID,
  PRE_CLASS_TAG,
  PRE_GAME_MODE,
  PRE_GROUP_MODE,
  PRE_INTERACTOBJECT_TAG,
  PRE_ITERACTIVE_TYPE,
  PRE_MATCH_MODE,
  PRE_MONSTER_GROUP_ID,
  PRE_MONSTER_ID,
  PRE_MONSTER_TAG,
  PRE_MONSTER_TYPE,
  PRE_REFERENCE_ID,
  cdtTypeLabel,
  comparisonLabel,
  comparisonSymbol,
  gameModeLabel,
  groupModeLabel,
  isKillCdtType,
  matchModeLabel,
  preCdtRelationLabel,
  preCdtTypeLabel,
  preCdtValueMeaning,
} from "./conditionCatalog.ts";

export type ConditionPreSlot = {
  /** 1-based Excel slot; defaults to array index + 1 */
  slot?: number;
  type: number;
  comparison: number;
  value: number;
};

export type ConditionRowInput = {
  conditionId: string;
  cdtType: number;
  cdtValue: number;
  preConditions: ConditionPreSlot[];
  preCdtRelation?: number | string;
};

export type TranslatedField = {
  key: string;
  raw: string | number;
  meaning: string;
};

export type TranslatedCondition = {
  sentence: string;
  fields: TranslatedField[];
};

function filledPres(row: ConditionRowInput): Array<ConditionPreSlot & { slot: number }> {
  return row.preConditions
    .filter((p) => p.type)
    .map((p, i) => ({ ...p, slot: p.slot ?? i + 1 }));
}

function findPre(
  pres: Array<ConditionPreSlot & { slot: number }>,
  type: number,
): (ConditionPreSlot & { slot: number }) | undefined {
  return pres.find((p) => p.type === type);
}

function sceneParts(pres: Array<ConditionPreSlot & { slot: number }>): string[] {
  const parts: string[] = [];
  const game = findPre(pres, PRE_GAME_MODE);
  if (game) {
    const name = gameModeLabel(game.value);
    parts.push(`在${game.value}${name}地图`);
  }
  const match = findPre(pres, PRE_MATCH_MODE);
  if (match) {
    parts.push(`${matchModeLabel(match.value)}模式`);
  }
  const group = findPre(pres, PRE_GROUP_MODE);
  if (group) {
    parts.push(groupModeLabel(group.value));
  }
  return parts;
}

function killObjectNoun(pres: Array<ConditionPreSlot & { slot: number }>): string {
  if (findPre(pres, PRE_CLASS_GROUP_ID)) return "指定职业玩家";
  if (findPre(pres, PRE_CLASS_ID)) return "指定职业精通的玩家";
  if (findPre(pres, PRE_CLASS_TAG)) return "指定职业tag的玩家";
  if (findPre(pres, PRE_MONSTER_ID) || findPre(pres, PRE_MONSTER_TYPE) || findPre(pres, PRE_MONSTER_GROUP_ID) || findPre(pres, PRE_MONSTER_TAG)) {
    return "指定怪物";
  }
  return "";
}

function comparisonConstraint(pre: ConditionPreSlot, cdtType: number): string | null {
  if (pre.comparison === CMP_EQUAL) return null;
  const sym = comparisonSymbol(pre.comparison);
  if (isKillCdtType(cdtType) && (pre.type === PRE_CLASS_GROUP_ID || pre.type === PRE_CLASS_ID)) {
    return `被击杀的玩家职业id需要${sym}${pre.value}`;
  }
  const label = preCdtTypeLabel(pre.type, cdtType);
  return `${label}需要${sym}${pre.value}`;
}

function actionPhrase(
  cdtType: number,
  cdtValue: number,
  pres: Array<ConditionPreSlot & { slot: number }>,
): { action: string; extras: string[] } {
  const extras: string[] = [];
  for (const pre of pres) {
    if (pre.type === PRE_GAME_MODE || pre.type === PRE_MATCH_MODE || pre.type === PRE_GROUP_MODE) continue;
    const extra = comparisonConstraint(pre, cdtType);
    if (extra) extras.push(extra);
  }

  if (cdtType === CDT_KILL || cdtType === CDT_KILL_TEAM_SHARE) {
    const noun = killObjectNoun(pres);
    const verb = cdtType === CDT_KILL_TEAM_SHARE ? "组队共享击杀" : "击杀";
    const action = noun ? `${verb}${cdtValue}个${noun}` : `${verb}${cdtValue}个`;
    return { action, extras };
  }

  if (cdtType === CDT_ARRIVE_AT_LOC) {
    return { action: cdtValue > 1 ? `到达指定位置${cdtValue}次` : "到达指定位置", extras };
  }
  if (cdtType === CDT_GET_ITEMS || cdtType === CDT_USE_ITEMS_IN_MATCH) {
    return { action: `${cdtTypeLabel(cdtType)}${cdtValue}个`, extras };
  }
  if (cdtType === CDT_INTERACTIVE) {
    const tag = findPre(pres, PRE_INTERACTOBJECT_TAG);
    const ref = findPre(pres, PRE_REFERENCE_ID);
    const itype = findPre(pres, PRE_ITERACTIVE_TYPE);
    let object = "";
    if (tag) object = "指定Tag交互物";
    else if (ref) object = "指定宝箱类型";
    else if (itype) object = "指定交互行为";
    return { action: object ? `交互${cdtValue}次${object}` : `交互${cdtValue}次`, extras };
  }
  if (cdtType === CDT_LOGIN) {
    return { action: cdtValue > 1 ? `登录${cdtValue}次` : "登录", extras };
  }
  if (cdtType === CDT_MATCH || cdtType === CDT_MATCH_START || cdtType === CDT_ESCAPE) {
    return { action: `${cdtTypeLabel(cdtType)}${cdtValue > 1 ? `${cdtValue}次` : ""}`, extras };
  }

  const label = cdtTypeLabel(cdtType);
  if (cdtValue) return { action: `${label}${cdtValue}`, extras };
  return { action: label, extras };
}

function buildSentence(row: ConditionRowInput, pres: Array<ConditionPreSlot & { slot: number }>): string {
  const scene = sceneParts(pres);
  const { action, extras } = actionPhrase(row.cdtType, row.cdtValue, pres);
  const chunks = [...scene, action, ...extras].filter(Boolean);
  const rel = row.preCdtRelation;
  if (rel !== undefined && rel !== "" && Number(rel) === 1 && extras.length > 1) {
    // 多约束为「或」时，动作后的约束用「或」连接
    const head = [...scene, action].filter(Boolean).join("，");
    return `${head}，${extras.join("，或")}`;
  }
  return chunks.join("，");
}

export function translateCondition(row: ConditionRowInput): TranslatedCondition {
  const pres = filledPres(row);
  const fields: TranslatedField[] = [
    { key: "CdtType", raw: row.cdtType, meaning: cdtTypeLabel(row.cdtType) },
    { key: "CdtValue", raw: row.cdtValue, meaning: `数量 ${row.cdtValue}` },
  ];
  for (const pre of pres) {
    fields.push({
      key: `PreCdtType${pre.slot}`,
      raw: pre.type,
      meaning: preCdtTypeLabel(pre.type, row.cdtType),
    });
    fields.push({
      key: `Comparison${pre.slot}`,
      raw: pre.comparison,
      meaning: comparisonLabel(pre.comparison),
    });
    fields.push({
      key: `PreCdtValue${pre.slot}`,
      raw: pre.value,
      meaning: preCdtValueMeaning(pre.type, pre.value, row.cdtType),
    });
  }
  if (row.preCdtRelation !== undefined && row.preCdtRelation !== "") {
    fields.push({
      key: "PreCdtRelation",
      raw: row.preCdtRelation,
      meaning: preCdtRelationLabel(row.preCdtRelation),
    });
  }
  return {
    sentence: buildSentence(row, pres),
    fields,
  };
}

export function formatTranslatedFieldLine(field: TranslatedField): string {
  return `${field.key} = ${field.raw} → ${field.meaning}`;
}

/** 任务挂多条条件时，块与块之间的连接词（任务表 ConditionRelation，不是 PreCdtRelation） */
export function taskConditionRelationLabel(raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return "且";
  const n = Number(raw);
  if (n === 0) return "且";
  if (n === 1) return "且（须同一局完成，否则进度重置）";
  return String(raw);
}

export type TranslateTaskConditionsResult = {
  relationRaw: string;
  relationLabel: string;
  blocks: Array<{ conditionId: string; translation: TranslatedCondition; missing: boolean }>;
};

export function translateTaskConditionIds(
  conditionIds: string[],
  byId: Map<string, ConditionRowInput>,
  relationRaw?: unknown,
): TranslateTaskConditionsResult {
  const raw = relationRaw == null ? "" : String(relationRaw);
  const relationLabel = taskConditionRelationLabel(raw);
  const blocks = conditionIds.map((conditionId) => {
    const row = byId.get(conditionId);
    if (!row) {
      return {
        conditionId,
        missing: true,
        translation: {
          sentence: `未找到条件 ${conditionId}`,
          fields: [],
        },
      };
    }
    return { conditionId, missing: false, translation: translateCondition(row) };
  });
  return { relationRaw: raw, relationLabel, blocks };
}
