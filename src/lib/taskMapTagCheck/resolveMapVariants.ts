import {
  BEGINNER_DIFFICULTIES,
  DIFFICULTY_CASUAL,
  DIFFICULTY_HARD,
  DIFFICULTY_HELL,
  GAME_MODE_NORMAL,
  GAME_MODE_TKV,
  isBeginnerScene,
  isCheckableMapId,
  isIslandMapId,
  isWangchengMapId,
  displayMapName,
  MATCH_CASUAL,
  MATCH_HELL,
  MATCH_RANKING,
  TEST_SCENE_SUFFIXES,
} from "./constants.ts";
import type { MapMatchTier, MapPlayerMode, MapTerrain, MapVariant } from "./types.ts";

export interface MatchMapConfigEntry {
  MapId: number;
  MapName: string;
  ScenePath: Array<{
    Mode: string;
    Difficulty: number;
    ConfigPath: string;
    IfOnline?: number;
  }>;
}

export function parseMatchMapConfigJson(text: string): MatchMapConfigEntry[] {
  const parsed = JSON.parse(text) as { Data?: MatchMapConfigEntry[] };
  return parsed.Data ?? [];
}

export function sceneBaseFromConfigPath(configPath: string): string {
  const file = configPath.split("/").pop() ?? configPath;
  return file.replace(/\.unity$/i, "");
}

export function variantSuffixFromSceneBase(sceneBase: string): string {
  const m = sceneBase.match(/^Map\d+_(.+)$/);
  return m?.[1] ?? sceneBase;
}

export function classifyTerrain(sceneBase: string): MapTerrain {
  return /Fire/i.test(sceneBase) ? "fire" : "ice";
}

export function classifyPlayerMode(sceneBase: string, modeLabel: string): MapPlayerMode {
  if (/Singlemode|单人/i.test(sceneBase) || /单人/i.test(modeLabel)) return "solo";
  return "multi";
}

export function classifyMatchTier(difficulty: number): MapMatchTier {
  if (DIFFICULTY_CASUAL.has(difficulty)) return "casual";
  if (DIFFICULTY_HARD.has(difficulty)) return "hard";
  if (DIFFICULTY_HELL.has(difficulty)) return "hell";
  return "other";
}

/** 全局排除：新手关、非王城火图（仅王城有冰/火双版本） */
export function isVariantExcludedFromCheck(variant: {
  mapId: number;
  sceneBase: string;
  difficulty: number;
  modeLabel: string;
  terrain: MapTerrain;
}): boolean {
  if (isBeginnerScene(variant.sceneBase, variant.modeLabel)) return true;
  if (BEGINNER_DIFFICULTIES.has(variant.difficulty)) return true;
  if (variant.terrain === "fire" && !isWangchengMapId(variant.mapId)) return true;
  return false;
}

export function buildMapVariants(entries: MatchMapConfigEntry[]): MapVariant[] {
  const variants: MapVariant[] = [];
  for (const entry of entries) {
    if (!isCheckableMapId(entry.MapId)) continue;
    for (const sp of entry.ScenePath ?? []) {
      const sceneBase = sceneBaseFromConfigPath(sp.ConfigPath);
      if (TEST_SCENE_SUFFIXES.test(sceneBase)) continue;
      const terrain = classifyTerrain(sceneBase);
      const modeLabel = sp.Mode;
      if (
        isVariantExcludedFromCheck({
          mapId: entry.MapId,
          sceneBase,
          difficulty: sp.Difficulty,
          modeLabel,
          terrain,
        })
      ) {
        continue;
      }
      variants.push({
        mapId: entry.MapId,
        mapName: displayMapName(entry.MapId, entry.MapName),
        sceneBase,
        variantSuffix: variantSuffixFromSceneBase(sceneBase),
        difficulty: sp.Difficulty,
        modeLabel,
        terrain,
        playerMode: classifyPlayerMode(sceneBase, sp.Mode),
        matchTier: classifyMatchTier(sp.Difficulty),
        mapDataFileName: `${sceneBase}_MapData.asset`,
        sceneRelativePath: sp.ConfigPath,
        ifOnline: sp.IfOnline ?? 0,
      });
    }
  }
  return variants;
}

export function variantMatchesMatchMode(
  variant: MapVariant,
  matchModePre?: { comparison: number; value: number },
): boolean {
  if (!matchModePre) return true;
  const tierRank = (t: MapMatchTier): number => {
    if (t === "casual") return 1;
    if (t === "hard") return 2;
    if (t === "hell") return 3;
    return 0;
  };
  const v = tierRank(variant.matchTier);
  if (v === 0) return false;
  if (matchModePre.comparison === 0) {
    if (matchModePre.value === MATCH_CASUAL) return variant.matchTier === "casual";
    if (matchModePre.value === MATCH_RANKING) return variant.matchTier === "hard";
    if (matchModePre.value === MATCH_HELL) return variant.matchTier === "hell";
    return v === matchModePre.value;
  }
  if (matchModePre.comparison === 1) {
    return v >= matchModePre.value;
  }
  return true;
}

export function parseMainLevelCsv(text: string): Map<number, { mapId: number; difficulty: number }> {
  const lines = text.trim().split(/\r?\n/);
  const map = new Map<number, { mapId: number; difficulty: number }>();
  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    const levelId = Number(cols[0]);
    const mapId = Number(cols[1]);
    const difficulty = Number(cols[2]);
    if (!levelId || !mapId || !difficulty) continue;
    map.set(levelId, { mapId, difficulty });
  }
  return map;
}

export function variantMatchesGameMode(
  variant: MapVariant,
  gameModePre?: { comparison: number; value: number },
  opts?: {
    mainLevelById?: Map<number, { mapId: number; difficulty: number }>;
    indexIdToLevelId?: Record<number, number>;
  },
): boolean {
  if (!gameModePre) return true;
  const gm = gameModePre.value;
  if (gm === GAME_MODE_NORMAL) {
    return isWangchengMapId(variant.mapId);
  }
  if (gm === GAME_MODE_TKV) {
    return isIslandMapId(variant.mapId);
  }
  const levelId = opts?.indexIdToLevelId?.[gm];
  if (levelId != null && opts?.mainLevelById) {
    const row = opts.mainLevelById.get(levelId);
    if (row) {
      return variant.mapId === row.mapId && variant.difficulty === row.difficulty;
    }
  }
  if (opts?.mainLevelById?.has(gm)) {
    const row = opts.mainLevelById.get(gm)!;
    return variant.mapId === row.mapId && variant.difficulty === row.difficulty;
  }
  return false;
}

export interface VariantLayerGroup {
  variantSuffix: string;
  terrain: MapTerrain;
  playerMode: MapPlayerMode;
  matchTier: MapMatchTier;
  modeLabel: string;
  layers: MapVariant[];
}

export function groupVariantsByLayer(variants: MapVariant[]): VariantLayerGroup[] {
  const map = new Map<string, VariantLayerGroup>();
  for (const v of variants) {
    const key = `${v.variantSuffix}|${v.terrain}|${v.playerMode}|${v.matchTier}`;
    const existing = map.get(key);
    if (existing) {
      existing.layers.push(v);
    } else {
      map.set(key, {
        variantSuffix: v.variantSuffix,
        terrain: v.terrain,
        playerMode: v.playerMode,
        matchTier: v.matchTier,
        modeLabel: v.modeLabel,
        layers: [v],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.variantSuffix.localeCompare(b.variantSuffix));
}
