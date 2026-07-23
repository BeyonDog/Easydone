import { isIslandMapId, isWangchengMapId } from "./constants.ts";
import { getGameModePrecond, getMatchModePrecond } from "./parseConditions.ts";
import { variantMatchesGameMode, variantMatchesMatchMode } from "./resolveMapVariants.ts";
import type { MapVariant, TaskMapCondition } from "./types.ts";

export type MapScope =
  | { kind: "variants"; variants: MapVariant[] }
  | { kind: "unresolved"; reason: string };

export type TaskMeta = {
  taskChain?: number;
  taskName?: string;
};

export type MapScopeContext = {
  mainLevelById?: Map<number, { mapId: number; difficulty: number }>;
  indexIdToLevelId?: Record<number, number>;
  taskMetaById: Map<string, TaskMeta>;
  missionConditionTextById?: Map<string, string>;
  missionTaskTextById?: Map<string, string>;
};

/** TaskChain → 地图范围（可扩展） */
const TASK_CHAIN_SCOPE: Record<number, "gw" | "island"> = {
  300: "gw",
  309: "island",
};

export function isWangchengVariant(v: MapVariant): boolean {
  return isWangchengMapId(v.mapId);
}

export function isIslandVariant(v: MapVariant): boolean {
  return isIslandMapId(v.mapId);
}

export function filterVariantsByMapHint(
  variants: MapVariant[],
  hint: "gw" | "island" | number[],
): MapVariant[] {
  if (hint === "gw") {
    return variants.filter(isWangchengVariant);
  }
  if (hint === "island") {
    return variants.filter(isIslandVariant);
  }
  const ids = new Set(hint);
  return variants.filter((v) => ids.has(v.mapId));
}

/** 从任务/条件中文描述推断地图 */
export function inferMapHintFromText(text: string): "gw" | "island" | null {
  const t = text.trim();
  if (!t) return null;
  if (/洛萨王城|王城秘境|王城深处|王权/.test(t) || (/(^|[^大])王城/.test(t) && !/大墓地/.test(t))) {
    return "gw";
  }
  if (/黑帆窟港|海盗洞窟|海盗大事件|海盗图/.test(t)) return "island";
  return null;
}

function taskChainHint(chain: number): "gw" | "island" | null {
  return TASK_CHAIN_SCOPE[chain] ?? null;
}

function collectTextBlob(condition: TaskMapCondition, ctx: MapScopeContext): string {
  const parts: string[] = [];
  if (condition.remark) parts.push(condition.remark);
  const missionCond = ctx.missionConditionTextById?.get(condition.conditionId);
  if (missionCond) parts.push(missionCond);
  for (const name of condition.taskNames) {
    if (name) parts.push(name);
  }
  for (const taskId of condition.taskIds) {
    const meta = ctx.taskMetaById.get(taskId);
    if (meta?.taskName) parts.push(meta.taskName);
    const missionTask = ctx.missionTaskTextById?.get(taskId);
    if (missionTask) parts.push(missionTask);
  }
  return parts.join(" ");
}

/**
 * 解析条件应检查的地图变体；禁止在无 GameMode 时默认全图。
 * 优先级：GameMode → TaskChain → Mission/任务文案 → unresolved。
 */
export function resolveMapScopeForCondition(
  condition: TaskMapCondition,
  allVariants: MapVariant[],
  ctx: MapScopeContext,
): MapScope {
  const matchModePre = getMatchModePrecond(condition);
  const withMatchMode = (vs: MapVariant[]) =>
    vs.filter((v) => variantMatchesMatchMode(v, matchModePre));

  const gameModePre = getGameModePrecond(condition);
  if (gameModePre) {
    const filtered = withMatchMode(
      allVariants.filter((v) =>
        variantMatchesGameMode(v, gameModePre, {
          mainLevelById: ctx.mainLevelById,
          indexIdToLevelId: ctx.indexIdToLevelId,
        }),
      ),
    );
    if (filtered.length === 0) {
      return {
        kind: "unresolved",
        reason: `GameMode=${gameModePre.value} 未匹配到任何地图变体`,
      };
    }
    return { kind: "variants", variants: filtered };
  }

  for (const taskId of condition.taskIds) {
    const chain = ctx.taskMetaById.get(taskId)?.taskChain;
    if (chain == null || !Number.isFinite(chain)) continue;
    const hint = taskChainHint(chain);
    if (!hint) continue;
    const filtered = withMatchMode(filterVariantsByMapHint(allVariants, hint));
    if (filtered.length > 0) {
      return { kind: "variants", variants: filtered };
    }
  }

  const blob = collectTextBlob(condition, ctx);
  const textHint = inferMapHintFromText(blob);
  if (textHint) {
    const filtered = withMatchMode(filterVariantsByMapHint(allVariants, textHint));
    if (filtered.length > 0) {
      return { kind: "variants", variants: filtered };
    }
  }

  return {
    kind: "unresolved",
    reason: "任务/条件描述为地图内交互，但未配置 GameMode(49)，无法确定目标地图",
  };
}
