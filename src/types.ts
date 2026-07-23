import type { SheetMatrix } from "./lib/xlsxHelpers";

/** 道具表行筛选（持久化）；各轴空数组且防护未勾选表示该轴不限制 */
export interface ItemTableFilter {
  /** 选中的类型备注展示键（含「空」） */
  typeRemarkKeys: string[];
  /** 选中的品质桶（低品质 / 绿… / 空 / 其它整数字符串） */
  qualityKeys: string[];
  defenseNone: boolean;
  defenseRange: boolean;
  defenseMin: number | null;
  defenseMax: number | null;
  /** 仅显示「赛季物品」列为 1 的行 */
  seasonItemOnly?: boolean;
  /** 类型备注选项展示顺序；null 表示按默认规则 */
  typeRemarkKeyOrder?: string[] | null;
  /** 物品品质选项展示顺序 */
  qualityKeyOrder?: string[] | null;
  /** 顶栏 Chip 条：类型备注固定区顺序 */
  chipBarTypeRemarkOrder?: string[] | null;
  /** 顶栏 Chip 条：物品品质顺序 */
  chipBarQualityOrder?: string[] | null;
  /** 弹窗内区块顺序：类型 / 物品品质 / 防护值；null 为默认 typeRemark→quality→defense（赛季物品在类型区块内） */
  sectionOrder?: ("typeRemark" | "quality" | "defense" | "seasonItem")[] | null;
  /** Ctrl+F / 快捷框：任一格包含子串（不区分大小写）；与其它轴为且 */
  rowKeyword?: string | null;
  /** 用户保存的自定义关键字筛选项（顶栏 Chip） */
  savedCustomKeywords?: string[] | null;
  /** 当前选中的自定义关键字（同列多选为且） */
  customKeywordKeys: string[];
  /** 顶栏 Chip：自定义关键字钉在主条的顺序 */
  chipBarCustomKeywordOrder?: string[] | null;
  /** 列筛选：稳定列键 → 选中展示值（同列或、多列且） */
  columnValueFilters?: Record<string, string[]>;
}

/** 任务主表与任务快照共用 */
export interface TaskTableFilter {
  taskTypeKeys: string[];
  chainKeys: string[];
  taskTypeKeyOrder?: string[] | null;
  chainKeyOrder?: string[] | null;
  /** 顶栏 Chip 条：任务类型固定区顺序 */
  chipBarTaskTypeOrder?: string[] | null;
  /** 顶栏 Chip 条：任务链固定区顺序 */
  chipBarChainOrder?: string[] | null;
  /** 弹窗内区块顺序：任务类型 / 任务链；null 为 default taskType→chain */
  sectionOrder?: ("taskType" | "chain")[] | null;
  /** Ctrl+F / 快捷框：任一格包含子串（不区分大小写）；与其它轴为且 */
  rowKeyword?: string | null;
  savedCustomKeywords?: string[] | null;
  /** 当前选中的自定义关键字（同列多选为且） */
  customKeywordKeys: string[];
  chipBarCustomKeywordOrder?: string[] | null;
  /** 列筛选：稳定列键 → 选中展示值（同列或、多列且） */
  columnValueFilters?: Record<string, string[]>;
}

/** @deprecated 读盘迁移用；新数据在 savedTemplates */
export interface SavedSnapshot {
  id: string;
  title: string;
  createdAt: number;
  source: "item" | "task";
  aoa: SheetMatrix;
  freezeThroughHeader?: string | null;
}

export interface SendTemplateItem {
  itemId: string;
  qty: number;
  /** 保存时从表内备注解析，仅展示用 */
  label?: string;
  /** 武器/防具耐久 0–100，写入 GMT init_wear_value */
  wearValue?: number;
  /** 钥匙/绷带/甲修等，写入 GMT additional_info.durability */
  durabilityValue?: number;
}

/** @deprecated 读盘迁移用 */
export interface SavedSendTemplate {
  id: string;
  title: string;
  createdAt: number;
  items: SendTemplateItem[];
}

/** 左侧模板：表格浏览 + 道具 GMT 发放 */
export interface SavedTemplate {
  id: string;
  title: string;
  createdAt: number;
  source: "item" | "task";
  aoa: SheetMatrix;
  items: SendTemplateItem[];
  freezeThroughHeader?: string | null;
  /** 侧栏卡片自定义色；null 表示按 source 使用默认道具/任务色 */
  cardColor?: string | null;
}

export interface RecycledTemplate {
  template: SavedTemplate;
  deletedAt: number;
}

/** 设置在「设置 › 全服发送 › 高级」中持久化的 AdminSendGlobalMail 附加字段 */
export interface ItemServerWideSendAdvancedSettings {
  globalMailType: string;
  distType: string;
  senderName: string;
  localizationJson: string;
}

export interface ItemServerWideSendSettings {
  entriesEnabled: boolean;
  advanced: ItemServerWideSendAdvancedSettings;
}

export interface GlobalSendLastForm {
  title: string;
  content: string;
  senderName: string;
  startTime: number;
  endTime: number;
}

/** 上传配置：已手动上传至 GTOP 的配置 CSV 记录（按工作区 + 环境 + 区服隔离） */
export type GtopModifiedConfigCsvState = {
  workspaceRoot: string;
  envId: string;
  regionServerId: string;
  /** 已上传至 GTOP 的配置文件名（basename，去重） */
  filenames: string[];
};

export interface AppConfig {
  excelWorkspaceRoot: string;
  gmAssistantLocalPath: string;
  itemRemarkColumn: string | null;
  hiddenItemColumns: string[];
  hiddenTaskColumns: string[];
  freezeThroughItemHeader: string | null;
  freezeThroughTaskHeader: string | null;
  itemTableFilter: ItemTableFilter | null;
  taskTableFilter: TaskTableFilter | null;
  /** @deprecated 迁移后为空 */
  savedSnapshots: SavedSnapshot[];
  /** @deprecated 迁移后为空 */
  sendTemplates: SavedSendTemplate[];
  savedTemplates: SavedTemplate[];
  recycledTemplates?: RecycledTemplate[];
  /** 侧栏默认道具卡片色（全部道具 + 未单独设色的道具模板） */
  sidebarItemCardColor?: string | null;
  /** 侧栏默认任务卡片色 */
  sidebarTaskCardColor?: string | null;
  /** 侧栏「加经验加钱」固定卡片色 */
  sidebarAddExpCardColor?: string | null;
  sidebarRankUpCardColor?: string | null;
  /** 全部道具卡片单独覆盖色；null 表示跟随 sidebarItemCardColor */
  sidebarItemCardColorOverride?: string | null;
  /** 全部任务卡片单独覆盖色 */
  sidebarTaskCardColorOverride?: string | null;
  /** 模板卡片 id 顺序；与 sidebarCardOrder 中 template 子序列同步 */
  sidebarTemplateOrder?: string[] | null;
  /** 侧栏全部卡片（固定卡 + 模板）全局顺序 */
  sidebarCardOrder?: string[] | null;
  /** 在窄侧栏隐藏的卡片 id */
  sidebarCardHidden?: string[] | null;
  /** 全屏画廊分屏时左侧画廊宽度（px） */
  sidebarGallerySplitPx?: number | null;
  themeAccentHex: string;
  themeBackgroundHex: string;
  themeWallpaperRelativePath: string | null;
  themeWallpaperOpacity: number;
  initialItemFilterSheetShown: boolean;
  initialTaskFilterSheetShown: boolean;
  gmtPlatform: "overseas" | "cn";
  /** 海外 PreLive（PR）模式：走 pre-krad / PreLive-SG */
  gmtPreliveEnabled: boolean;
  gmtBaseUrl: string;
  gmtCookie: string;
  gmtCnCookie: string;
  gmtEnvId: number | null;
  gmtEnvName: string | null;
  gmtOverseasEnvId: number | null;
  gmtOverseasEnvName: string | null;
  gmtCnEnvId: number | null;
  gmtCnEnvName: string | null;
  gmtAccountId: string;
  gmtTradable: boolean;
  gmtLockRegion: string;
  gmtNotiRegion: string;
  gtopBaseUrl: string;
  gtopCookie: string;
  gtopProject: string;
  gtopEnvId: string | null;
  gtopEnvName: string | null;
  gtopRegionServerId: string | null;
  gtopRegionServerName: string | null;
  gtopOverseasEnvId: string | null;
  gtopOverseasEnvName: string | null;
  gtopOverseasRegionServerId: string | null;
  gtopOverseasRegionServerName: string | null;
  gtopCnEnvId: string | null;
  gtopCnEnvName: string | null;
  gtopCnRegionServerId: string | null;
  gtopCnRegionServerName: string | null;
  gtopModifiedConfigCsv?: GtopModifiedConfigCsvState | null;
  itemServerWideSendSettings?: ItemServerWideSendSettings | null;
  globalSendLastForm?: GlobalSendLastForm | null;
  /** 后台静默同步 Excel 间隔（秒）；0 为关闭，默认 1800（30 分钟） */
  excelAutoRefreshIntervalSec?: number | null;
  /** 物品表「物品ID」列旁以括号显示类型名 */
  showItemTypeInTable?: boolean;
}

export type ActiveView =
  | { kind: "item" }
  | { kind: "task" }
  | { kind: "addExp" }
  | { kind: "rankUp" }
  | { kind: "uploadConfig" }
  | { kind: "taskMapCheck" }
  | { kind: "template"; id: string }
  /** @deprecated 读盘后转为 template */
  | { kind: "snapshot"; id: string };
