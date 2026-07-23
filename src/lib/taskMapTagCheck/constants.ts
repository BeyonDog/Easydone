/** ConditionType */
export const CDT_KILL = 1;
export const CDT_ARRIVE_AT_LOC = 2;
export const CDT_GET_ITEMS = 3;
export const CDT_INTERACTIVE = 4;
export const CDT_KILL_TEAM_SHARE = 24;
export const CDT_ESCAPE = 27;
export const CDT_MATCH_START_SKILL = 28;
export const CDT_MATCH_START_MASTERY = 29;
export const CDT_HUNTER_ROAD_NODE = 44;

/** PreConditionType */
export const PRE_MONSTER_ID = 1;
export const PRE_MONSTER_TYPE = 2;
export const PRE_LOCATION_ID = 3;
export const PRE_ITERACTIVE_ID = 7;
export const PRE_ITERACTIVE_TYPE = 8;
export const PRE_MONSTER_GROUP_ID = 10;
export const PRE_REFERENCE_ID = 11;
export const PRE_MATCH_MODE = 15;
export const PRE_SKILL_ID = 26;
export const PRE_MONSTER_TAG = 28;
export const PRE_INTERACTOBJECT_TAG = 29;
export const PRE_MASTERY_ID = 39;
export const PRE_GAME_MODE = 49;

/** ComparisonType */
export const CMP_EQUAL = 0;
export const CMP_GTE = 1;
export const CMP_LTE = 2;

/** MatchMode (EMatch) */
export const MATCH_CASUAL = 1;
export const MATCH_RANKING = 2;
export const MATCH_HELL = 3;

/** GameMode_NORMAL — 洛萨王城 */
export const GAME_MODE_NORMAL = 101;

/** GameMode_TKV — 黑帆窟港（海岛） */
export const GAME_MODE_TKV = 201;

/** TaskType：仅主线进入检查范围 */
export const TASK_TYPE_MAIN = 3;

/** 新手/测试向 TaskID（与正式剧情 3000xxx 区分），不参与地图检查 */
export const EXCLUDED_MAP_CHECK_TASK_ID_MIN = 30000;
export const EXCLUDED_MAP_CHECK_TASK_ID_MAX = 30035;
export const EXCLUDED_MAP_CHECK_TASK_IDS = new Set<number>([9000001]);

export function isExcludedFromMapCheck(taskId: string | number): boolean {
  const n = typeof taskId === "number" ? taskId : Number(taskId);
  if (!Number.isFinite(n)) return false;
  if (n >= EXCLUDED_MAP_CHECK_TASK_ID_MIN && n <= EXCLUDED_MAP_CHECK_TASK_ID_MAX) return true;
  return EXCLUDED_MAP_CHECK_TASK_IDS.has(n);
}

/** Difficulty → match tier */
export const DIFFICULTY_CASUAL = new Set([2001, 2003]);
export const DIFFICULTY_HARD = new Set([2002, 2004, 2012, 2014]);
export const DIFFICULTY_HELL = new Set([2005, 2015]);

export const TEST_SCENE_SUFFIXES = /(?:AITest|forFGD|Normal_1\.|_test|BR$)/i;

/** 新手关场景名（Beginner / BeginnerWarm） */
export const BEGINNER_SCENE_SUFFIXES = /Beginner(?:Warm)?/i;

/** 新手关 Difficulty（MatchMapConfig 新手图02–新手关03 等） */
export const BEGINNER_DIFFICULTIES = new Set([9002, 9003, 9004, 9005, 9006]);

/** 洛萨王城 live/legacy 分层 MapId */
export const WANGCHENG_MAP_IDS = new Set([202, 203, 204]);

/** 黑帆窟港（海岛）MapId */
export const ISLAND_MAP_IDS = new Set([401, 402]);

/** 任务地图检查白名单：王城 + 黑帆窟港 */
export const CHECKABLE_MAP_IDS = new Set([...WANGCHENG_MAP_IDS, ...ISLAND_MAP_IDS]);

export function isWangchengMapId(mapId: number): boolean {
  return WANGCHENG_MAP_IDS.has(mapId);
}

export function isIslandMapId(mapId: number): boolean {
  return ISLAND_MAP_IDS.has(mapId);
}

export function isCheckableMapId(mapId: number): boolean {
  return CHECKABLE_MAP_IDS.has(mapId);
}

/** MatchMapConfig MapName 历史命名 → 结果展示用友好名 */
export function displayMapName(mapId: number, configName: string): string {
  if (isWangchengMapId(mapId)) return "洛萨王城";
  if (isIslandMapId(mapId)) return "黑帆窟港";
  return configName;
}

export function isBeginnerScene(sceneBase: string, modeLabel?: string): boolean {
  if (BEGINNER_SCENE_SUFFIXES.test(sceneBase)) return true;
  if (modeLabel && /新手/.test(modeLabel)) return true;
  return false;
}
