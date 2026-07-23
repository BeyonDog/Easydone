export type TaskMapConditionKind =
  | "chest_tag"
  | "arrive"
  | "interact_ref"
  | "interact_type"
  | "kill"
  | "skill_or_mastery";

/** @deprecated use chest_tag */
export type LegacyChestKind = "chest";

export interface TaskMapPreCondition {
  type: number;
  comparison: number;
  value: number;
}

export type ConfigTargetKind =
  | "monster_id"
  | "monster_type"
  | "monster_group"
  | "monster_tag"
  | "skill_id"
  | "mastery_id";

export interface ConfigCheckTarget {
  kind: ConfigTargetKind;
  value: number;
}

export interface TaskMapCondition {
  conditionId: string;
  remark: string;
  kind: TaskMapConditionKind;
  cdtType: number;
  cdtValue: number;
  /** MapData Tag / Location / primary numeric target */
  targetTag: number;
  preConditions: TaskMapPreCondition[];
  configTargets: ConfigCheckTarget[];
  taskIds: string[];
  taskNames: string[];
}

export type MapTerrain = "ice" | "fire";
export type MapPlayerMode = "solo" | "multi";
export type MapMatchTier = "casual" | "hard" | "hell" | "other";
export type HighValueZone = "in" | "out" | "unknown";

export interface MapVariant {
  mapId: number;
  mapName: string;
  sceneBase: string;
  variantSuffix: string;
  difficulty: number;
  modeLabel: string;
  terrain: MapTerrain;
  playerMode: MapPlayerMode;
  matchTier: MapMatchTier;
  mapDataFileName: string;
  sceneRelativePath: string;
  ifOnline: number;
}

export interface MapTaggedRecord {
  tags: number[];
  position?: { x: number; y: number; z: number };
  recordKind: "chest" | "loot" | "trigger";
}

export interface ParsedMapData {
  sceneBase: string;
  chestRecords: MapTaggedRecord[];
  lootRecords: MapTaggedRecord[];
  triggerRecords: MapTaggedRecord[];
  roomLvlUpInfosEmpty: boolean;
}

export type TagCheckIssueKind =
  | "missing_tag"
  | "file_missing"
  | "csv_xlsx_mismatch"
  | "tag_count_mismatch"
  | "live_layer_missing"
  | "config_missing"
  | "scope_unresolved";

export interface TagCheckIssue {
  severity: "error" | "warn";
  kind: TagCheckIssueKind;
  conditionKind?: TaskMapConditionKind;
  taskId: string;
  taskName: string;
  conditionId: string;
  conditionRemark: string;
  targetTag: number;
  mapId: number;
  mapName: string;
  variantLabel: string;
  terrain: MapTerrain;
  playerMode: MapPlayerMode;
  matchTier: MapMatchTier;
  variantSuffix: string;
  mapDataFile: string;
  layerFilesChecked: string[];
  sceneFile?: string;
  editorObjectName?: string;
  position?: { x: number; y: number; z: number };
  recordKind?: "chest" | "loot" | "trigger";
  highValueZone?: HighValueZone;
  message: string;
}

export interface TagCheckSummary {
  conditionCount: number;
  taskCount: number;
  variantGroupCount: number;
  errorCount: number;
  warnCount: number;
  checkedAt: number;
}

export interface TagCheckReport {
  conditions: TaskMapCondition[];
  issues: TagCheckIssue[];
  summary: TagCheckSummary;
}

export interface MonsterCatalog {
  ids: Set<number>;
  types: Set<number>;
  groups: Set<number>;
  /** numeric tokens found in TagGroup */
  tags: Set<number>;
}

export interface RunTagCheckInput {
  conditionCsvText: string;
  taskCsvText: string;
  matchMapConfigJson: string;
  mapDataByFileName: Record<string, string>;
  missionConditionRows?: Array<{ id: string; remark: string; targetTag?: number }>;
  /** Mission.xlsx Condition 描述文案（条件 ID → 文本） */
  missionConditionTextById?: Record<string, string>;
  /** Mission.xlsx Task 任务名（任务 ID → 文本） */
  missionTaskTextById?: Record<string, string>;
  mainLevelCsvText?: string;
  indexIdToLevelId?: Record<number, number>;
  monsterCatalog?: MonsterCatalog;
  skillIds?: Set<number>;
  masteryIds?: Set<number>;
}
