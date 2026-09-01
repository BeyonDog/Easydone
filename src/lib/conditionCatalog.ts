/** Condition / PreCondition 中文对照（来源：策划中文对照表，不入库 xlsx）。 */

export const CDT_KILL = 1;
export const CDT_ARRIVE_AT_LOC = 2;
export const CDT_GET_ITEMS = 3;
export const CDT_INTERACTIVE = 4;
export const CDT_LOGIN = 5;
export const CDT_MATCH = 6;
export const CDT_LEVEL = 7;
export const CDT_LOOT_VALUE = 8;
export const CDT_ACCOUNT_BINDING = 9;
export const CDT_SUBMIT_ITEMS = 10;
export const CDT_STORE_SELL = 11;
export const CDT_TRADING_BANK_SELL = 12;
export const CDT_SELL = 13;
export const CDT_DAMAGE = 14;
export const CDT_RANK = 15;
export const CDT_COLLECTION = 16;
export const CDT_MAKE_ITEM = 17;
export const CDT_BUY_ITEM = 18;
export const CDT_BUY_ITEM_COST = 19;
export const CDT_TRADING_BANK_SUBMIT = 20;
export const CDT_TRADING_BANK_COST = 21;
export const CDT_USE_ITEMS_IN_MATCH = 22;
export const CDT_HEAL = 23;
export const CDT_KILL_TEAM_SHARE = 24;
export const CDT_USE_CLASS_EXP = 25;
export const CDT_UNLOCK_CLASSGROUP = 26;
export const CDT_ESCAPE = 27;
export const CDT_MATCH_START_SKILL = 28;
export const CDT_MATCH_START_MASTERY = 29;
export const CDT_MATCH_START = 30;
export const CDT_MATCH_START_ITEMS = 31;
export const CDT_CONTAINER_LEVEL = 32;
export const CDT_GET_COLLECTION_VALUE = 33;
export const CDT_COLLECTION_FINISH = 34;
export const CDT_JOIN_CLAN = 35;
export const CDT_FINISH_GOOGLE_RATING = 36;
export const CDT_COINS_IN_WALLET = 37;
export const CDT_ALCHEMY = 38;
export const CDT_EMERGENCY_EVENT = 39;
export const CDT_CONTINUOUS_ESCAPE = 40;
export const CDT_CAMP_LEVEL = 41;
export const CDT_COLLECTION_COUNT = 42;
export const CDT_RES_DOWNLOAD = 43;
export const CDT_HUNTER_ROAD_NODE = 44;
export const CDT_SURVIVAL_TIME = 45;

export const PRE_MONSTER_ID = 1;
export const PRE_MONSTER_TYPE = 2;
export const PRE_LOCATION_ID = 3;
export const PRE_ITEM_ID = 4;
export const PRE_ITEM_TYPE = 5;
export const PRE_ITEM_QUALITY = 6;
export const PRE_ITERACTIVE_ID = 7;
export const PRE_ITERACTIVE_TYPE = 8;
export const PRE_CLASS_ID = 9;
export const PRE_MONSTER_GROUP_ID = 10;
export const PRE_REFERENCE_ID = 11;
export const PRE_RANK_ID = 12;
export const PRE_COLLECTION_VALUE = 13;
export const PRE_IS_WIN = 14;
export const PRE_MATCH_MODE = 15;
export const PRE_HEAD_SHOOT = 16;
export const PRE_DISTANCE = 17;
export const PRE_IN_DOOR_TIME = 18;
export const PRE_EQUIPMENT_SCORE = 19;
export const PRE_STRENGTH = 20;
export const PRE_AGILITY = 21;
export const PRE_INTELLIGENCE = 22;
export const PRE_CONSTITUTION = 23;
export const PRE_WISDOM = 24;
export const PRE_ITEM_ID_MATCH_BEFORE = 25;
export const PRE_SKILL_ID = 26;
export const PRE_DAMAGE_TYPE = 27;
export const PRE_MONSTER_TAG = 28;
export const PRE_INTERACTOBJECT_TAG = 29;
export const PRE_CLASS_TAG = 30;
export const PRE_TEAM_PLAYER_COUNT = 31;
export const PRE_MAKEITEM_MAKEID = 32;
export const PRE_MERCHANT_SKU_ID = 33;
export const PRE_GROUP_MODE = 34;
export const PRE_ITEM_VALUE = 35;
export const PRE_MAKE_ITEM_SUB_TYPE = 36;
export const PRE_NEW_ITEMS_VALUE = 37;
export const PRE_LEVEL_ID = 38;
export const PRE_MASTERY_ID = 39;
export const PRE_ITEM_LOCATION = 40;
export const PRE_COLLECTION_ID = 41;
export const PRE_UNLOCKED_CLASSGROUP_ID = 42;
export const PRE_SELF_CLASS_ID = 43;
export const PRE_ALCHEMY_ID = 44;
export const PRE_IS_CALCULATE_RANKING_POINT = 45;
export const PRE_ITEM_SUB_TYPE = 46;
export const PRE_EMERGENCY_EVENT_ID = 47;
export const PRE_NOT_USE_MEDICINE = 48;
export const PRE_GAME_MODE = 49;
export const PRE_RESOURCE_DOWNLOAD_ID = 50;
export const PRE_HUNTER_ROAD_NODE_ID = 51;
export const PRE_CLASS_GROUP_ID = 52;
export const PRE_SELF_CLASS_GROUP_ID = 53;

export const CMP_EQUAL = 0;
export const CMP_GTE = 1;
export const CMP_LTE = 2;
export const CMP_NEQ = 3;

export const MATCH_CASUAL = 1;
export const MATCH_RANKING = 2;
export const MATCH_HELL = 3;

export const GAME_MODE_WANGCHENG = 101;
export const GAME_MODE_ISLAND = 201;
export const GAME_MODE_ARENA = 1001;

/** 是否类 CdtType：不强制 CdtValue > 0 */
export const BOOLEAN_CDT_TYPES = new Set<number>([
  CDT_ACCOUNT_BINDING,
  CDT_RANK,
  CDT_COLLECTION,
  CDT_UNLOCK_CLASSGROUP,
  CDT_COLLECTION_FINISH,
  CDT_JOIN_CLAN,
  CDT_FINISH_GOOGLE_RATING,
]);

/** 类型 → 必需的 PreCdtType（缺则报 missing_field） */
export const REQUIRED_PRE_BY_CDT: Record<number, number> = {
  [CDT_ARRIVE_AT_LOC]: PRE_LOCATION_ID,
  [CDT_RANK]: PRE_RANK_ID,
  [CDT_COLLECTION]: PRE_COLLECTION_VALUE,
  [CDT_UNLOCK_CLASSGROUP]: PRE_UNLOCKED_CLASSGROUP_ID,
  [CDT_MATCH_START_SKILL]: PRE_SKILL_ID,
  [CDT_MATCH_START_MASTERY]: PRE_MASTERY_ID,
  [CDT_COLLECTION_FINISH]: PRE_COLLECTION_ID,
  [CDT_RES_DOWNLOAD]: PRE_RESOURCE_DOWNLOAD_ID,
  [CDT_HUNTER_ROAD_NODE]: PRE_HUNTER_ROAD_NODE_ID,
};

const CDT_TYPE_LABELS: Record<number, string> = {
  [CDT_KILL]: "击杀",
  [CDT_ARRIVE_AT_LOC]: "到达位置",
  [CDT_GET_ITEMS]: "带出物品",
  [CDT_INTERACTIVE]: "交互",
  [CDT_LOGIN]: "登录",
  [CDT_MATCH]: "对局",
  [CDT_LEVEL]: "达到账号等级",
  [CDT_LOOT_VALUE]: "带出价值",
  [CDT_ACCOUNT_BINDING]: "账号绑定",
  [CDT_SUBMIT_ITEMS]: "提交物品",
  [CDT_STORE_SELL]: "商店出售获得金币",
  [CDT_TRADING_BANK_SELL]: "交易行出售获得金币",
  [CDT_SELL]: "出售获得金币",
  [CDT_DAMAGE]: "造成伤害",
  [CDT_RANK]: "是否达到段位",
  [CDT_COLLECTION]: "是否达到收藏品总价值",
  [CDT_MAKE_ITEM]: "打造",
  [CDT_BUY_ITEM]: "商店购买",
  [CDT_BUY_ITEM_COST]: "商店购买消耗金币",
  [CDT_TRADING_BANK_SUBMIT]: "交易行上架",
  [CDT_TRADING_BANK_COST]: "交易行购买消耗金币",
  [CDT_USE_ITEMS_IN_MATCH]: "局内消耗",
  [CDT_HEAL]: "产生治疗量",
  [CDT_KILL_TEAM_SHARE]: "组队共享击杀",
  [CDT_USE_CLASS_EXP]: "成长之路消耗经验",
  [CDT_UNLOCK_CLASSGROUP]: "职业解锁",
  [CDT_ESCAPE]: "对局完成",
  [CDT_MATCH_START_SKILL]: "进局时携带技能",
  [CDT_MATCH_START_MASTERY]: "进局时携带精通",
  [CDT_MATCH_START]: "进局",
  [CDT_MATCH_START_ITEMS]: "进局携带物品",
  [CDT_CONTAINER_LEVEL]: "容器等级",
  [CDT_GET_COLLECTION_VALUE]: "收藏品进度累积变化",
  [CDT_COLLECTION_FINISH]: "收藏品套装完成",
  [CDT_JOIN_CLAN]: "加入公会",
  [CDT_FINISH_GOOGLE_RATING]: "谷歌评分",
  [CDT_COINS_IN_WALLET]: "账户当前持有金币",
  [CDT_ALCHEMY]: "炼金工坊炼制",
  [CDT_EMERGENCY_EVENT]: "完成局内紧急任务",
  [CDT_CONTINUOUS_ESCAPE]: "连续胜利",
  [CDT_CAMP_LEVEL]: "营地等级",
  [CDT_COLLECTION_COUNT]: "收藏品套装数量",
  [CDT_RES_DOWNLOAD]: "小迅雷下载项",
  [CDT_HUNTER_ROAD_NODE]: "猎人天赋节点",
  [CDT_SURVIVAL_TIME]: "局内存活",
};

const PRE_TYPE_LABELS: Record<number, string> = {
  [PRE_MONSTER_ID]: "击杀指定怪物",
  [PRE_MONSTER_TYPE]: "击杀指定类型怪物",
  [PRE_LOCATION_ID]: "指定位置",
  [PRE_ITEM_ID]: "指定物品",
  [PRE_ITEM_TYPE]: "指定物品类型",
  [PRE_ITEM_QUALITY]: "指定物品品质",
  [PRE_ITERACTIVE_ID]: "指定交互物id",
  [PRE_ITERACTIVE_TYPE]: "指定交互行为",
  [PRE_CLASS_ID]: "使用某职业精通",
  [PRE_MONSTER_GROUP_ID]: "击杀指定大类怪物",
  [PRE_REFERENCE_ID]: "指定宝箱类型",
  [PRE_RANK_ID]: "指定段位",
  [PRE_COLLECTION_VALUE]: "指定价值量",
  [PRE_IS_WIN]: "是否成功撤离",
  [PRE_MATCH_MODE]: "对局模式",
  [PRE_HEAD_SHOOT]: "爆头击杀",
  [PRE_DISTANCE]: "间距",
  [PRE_IN_DOOR_TIME]: "入局时间限制",
  [PRE_EQUIPMENT_SCORE]: "装备分限制",
  [PRE_STRENGTH]: "玩家进局属性力量",
  [PRE_AGILITY]: "玩家进局属性敏捷",
  [PRE_INTELLIGENCE]: "玩家进局属性智力",
  [PRE_CONSTITUTION]: "玩家进局属性体质",
  [PRE_WISDOM]: "玩家进局属性感知",
  [PRE_ITEM_ID_MATCH_BEFORE]: "携带了某id物品",
  [PRE_SKILL_ID]: "技能",
  [PRE_DAMAGE_TYPE]: "伤害类型",
  [PRE_MONSTER_TAG]: "击杀指定Tag怪物",
  [PRE_INTERACTOBJECT_TAG]: "指定Tag交互物",
  [PRE_CLASS_TAG]: "击杀指定职业tag的玩家",
  [PRE_TEAM_PLAYER_COUNT]: "进局队伍状态",
  [PRE_MAKEITEM_MAKEID]: "指定配方ID",
  [PRE_MERCHANT_SKU_ID]: "指定商品ID",
  [PRE_GROUP_MODE]: "进局前大厅队伍状态",
  [PRE_ITEM_VALUE]: "带出物品价值",
  [PRE_MAKE_ITEM_SUB_TYPE]: "指定配方子类型",
  [PRE_NEW_ITEMS_VALUE]: "带出价值",
  [PRE_LEVEL_ID]: "撤离地图",
  [PRE_MASTERY_ID]: "装备精通",
  [PRE_ITEM_LOCATION]: "容器类型",
  [PRE_COLLECTION_ID]: "套装id",
  [PRE_UNLOCKED_CLASSGROUP_ID]: "指定职业",
  [PRE_SELF_CLASS_ID]: "使用某职业精通",
  [PRE_ALCHEMY_ID]: "炼制配方ID",
  [PRE_IS_CALCULATE_RANKING_POINT]: "是否开启排位",
  [PRE_ITEM_SUB_TYPE]: "指定物品子类型",
  [PRE_EMERGENCY_EVENT_ID]: "紧急事件ID",
  [PRE_NOT_USE_MEDICINE]: "不使用药品",
  [PRE_GAME_MODE]: "游戏模式（地图）",
  [PRE_RESOURCE_DOWNLOAD_ID]: "小迅雷下载项",
  [PRE_HUNTER_ROAD_NODE_ID]: "猎人天赋节点ID",
  [PRE_CLASS_GROUP_ID]: "使用某职业",
  [PRE_SELF_CLASS_GROUP_ID]: "使用某职业",
};

const COMPARISON_LABELS: Record<number, string> = {
  [CMP_EQUAL]: "等于",
  [CMP_GTE]: "大于等于",
  [CMP_LTE]: "小于等于",
  [CMP_NEQ]: "不等于",
};

const GAME_MODE_LABELS: Record<number, string> = {
  [GAME_MODE_WANGCHENG]: "王城",
  [GAME_MODE_ISLAND]: "海岛",
  [GAME_MODE_ARENA]: "竞技场",
};

const MATCH_MODE_LABELS: Record<number, string> = {
  [MATCH_CASUAL]: "普通",
  [MATCH_RANKING]: "挑战",
  [MATCH_HELL]: "地狱",
};

const GROUP_MODE_LABELS: Record<number, string> = {
  1: "单人队",
  3: "3人队",
};

const DAMAGE_TYPE_LABELS: Record<number, string> = {
  0: "物理伤害",
  1: "魔法伤害",
  2: "真实伤害",
  3: "毒圈伤害",
};

const ITEM_LOCATION_LABELS: Record<number, string> = {
  1: "仓库",
  3: "背包",
};

function unknownLabel(id: number): string {
  return `未知类型(${id})`;
}

export function isKnownCdtType(id: number): boolean {
  return Object.prototype.hasOwnProperty.call(CDT_TYPE_LABELS, id);
}

export function isKnownPreCdtType(id: number): boolean {
  return Object.prototype.hasOwnProperty.call(PRE_TYPE_LABELS, id);
}

export function cdtTypeLabel(id: number): string {
  return CDT_TYPE_LABELS[id] ?? unknownLabel(id);
}

export function isKillCdtType(cdtType: number): boolean {
  return cdtType === CDT_KILL || cdtType === CDT_KILL_TEAM_SHARE;
}

export function preCdtTypeLabel(id: number, cdtType?: number): string {
  if (id === PRE_CLASS_GROUP_ID) {
    return isKillCdtType(cdtType ?? 0) ? "击杀指定职业玩家" : "使用某职业";
  }
  if (id === PRE_CLASS_ID) {
    return isKillCdtType(cdtType ?? 0) ? "击杀指定职业精通的玩家" : "使用某职业精通";
  }
  return PRE_TYPE_LABELS[id] ?? unknownLabel(id);
}

export function comparisonLabel(id: number): string {
  return COMPARISON_LABELS[id] ?? unknownLabel(id);
}

export function comparisonSymbol(id: number): string {
  if (id === CMP_GTE) return "≥";
  if (id === CMP_LTE) return "≤";
  if (id === CMP_NEQ) return "≠";
  if (id === CMP_EQUAL) return "=";
  return String(id);
}

export function gameModeLabel(id: number): string {
  return GAME_MODE_LABELS[id] ?? unknownLabel(id);
}

export function matchModeLabel(id: number): string {
  return MATCH_MODE_LABELS[id] ?? unknownLabel(id);
}

export function groupModeLabel(id: number): string {
  return GROUP_MODE_LABELS[id] ?? unknownLabel(id);
}

export function preCdtRelationLabel(raw: number | string): string {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 1) return "或";
  if (n === 0 || raw === "" || raw === undefined) return "且";
  return String(raw);
}

export function preCdtValueMeaning(preType: number, value: number, _cdtType?: number): string {
  if (preType === PRE_GAME_MODE) return gameModeLabel(value);
  if (preType === PRE_MATCH_MODE) return matchModeLabel(value);
  if (preType === PRE_GROUP_MODE) return groupModeLabel(value);
  if (preType === PRE_DAMAGE_TYPE) return DAMAGE_TYPE_LABELS[value] ?? unknownLabel(value);
  if (preType === PRE_ITEM_LOCATION) return ITEM_LOCATION_LABELS[value] ?? unknownLabel(value);
  if (preType === PRE_IS_CALCULATE_RANKING_POINT) return value === 1 ? "开启" : "不开启";
  if (preType === PRE_HEAD_SHOOT) return "爆头";
  if (preType === PRE_NOT_USE_MEDICINE) return "不使用药品";
  if (preType === PRE_CLASS_GROUP_ID || preType === PRE_SELF_CLASS_GROUP_ID || preType === PRE_UNLOCKED_CLASSGROUP_ID) {
    return `职业 ID ${value}`;
  }
  if (preType === PRE_CLASS_ID || preType === PRE_SELF_CLASS_ID) {
    return `职业精通 ID ${value}`;
  }
  if (preType === PRE_MONSTER_ID) return `怪物 ID ${value}`;
  if (preType === PRE_SKILL_ID) return `技能 ID ${value}`;
  if (preType === PRE_MASTERY_ID) return `精通 ID ${value}`;
  if (preType === PRE_ITEM_ID || preType === PRE_ITEM_ID_MATCH_BEFORE) return `物品 ID ${value}`;
  if (preType === PRE_LOCATION_ID) return `位置 ID ${value}`;
  if (!isKnownPreCdtType(preType)) return unknownLabel(value);
  return String(value);
}
