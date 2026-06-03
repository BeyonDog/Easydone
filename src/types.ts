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
  /** 类型备注选项展示顺序；null 表示按默认规则 */
  typeRemarkKeyOrder?: string[] | null;
  /** 物品品质选项展示顺序 */
  qualityKeyOrder?: string[] | null;
  /** 顶栏 Chip 条：类型备注固定区顺序 */
  chipBarTypeRemarkOrder?: string[] | null;
  /** 顶栏 Chip 条：物品品质顺序 */
  chipBarQualityOrder?: string[] | null;
  /** 弹窗内区块顺序：类型备注 / 物品品质 / 防护值；null 为默认 typeRemark→quality→defense */
  sectionOrder?: ("typeRemark" | "quality" | "defense")[] | null;
  /** Ctrl+F / 快捷框：任一格包含子串（不区分大小写）；与其它轴为且 */
  rowKeyword?: string | null;
  /** 用户保存的自定义关键字筛选项（顶栏 Chip） */
  savedCustomKeywords?: string[] | null;
  /** 当前选中的自定义关键字（同列多选为且） */
  customKeywordKeys: string[];
  /** 顶栏 Chip：自定义关键字钉在主条的顺序 */
  chipBarCustomKeywordOrder?: string[] | null;
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
  /** 侧栏默认道具卡片色（全部道具 + 未单独设色的道具模板） */
  sidebarItemCardColor?: string | null;
  /** 侧栏默认任务卡片色 */
  sidebarTaskCardColor?: string | null;
  /** 侧栏「加经验」固定卡片色 */
  sidebarAddExpCardColor?: string | null;
  /** 全部道具卡片单独覆盖色；null 表示跟随 sidebarItemCardColor */
  sidebarItemCardColorOverride?: string | null;
  /** 全部任务卡片单独覆盖色 */
  sidebarTaskCardColorOverride?: string | null;
  /** 模板卡片 id 顺序 */
  sidebarTemplateOrder?: string[] | null;
  themeAccentHex: string;
  themeBackgroundHex: string;
  themeWallpaperRelativePath: string | null;
  themeWallpaperOpacity: number;
  initialItemFilterSheetShown: boolean;
  initialTaskFilterSheetShown: boolean;
  gmtBaseUrl: string;
  gmtCookie: string;
  gmtEnvId: number | null;
  gmtEnvName: string | null;
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
  itemServerWideSendSettings?: ItemServerWideSendSettings | null;
  globalSendLastForm?: GlobalSendLastForm | null;
}

export type ActiveView =
  | { kind: "item" }
  | { kind: "task" }
  | { kind: "addExp" }
  | { kind: "template"; id: string }
  /** @deprecated 读盘后转为 template */
  | { kind: "snapshot"; id: string };
