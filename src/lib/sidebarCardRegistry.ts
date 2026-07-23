import type { AppConfig, SavedTemplate } from "../types.ts";
import { mergeSidebarTemplateOrder } from "./sidebarCardColor.ts";
import { resolveSidebarCardOrder, isSidebarCardHidden } from "./sidebarCardLayout.ts";

export const SIDEBAR_PINNED_ITEM = "pinned:item";
export const SIDEBAR_PINNED_TASK = "pinned:task";
export const SIDEBAR_PINNED_ADD_EXP = "pinned:addExp";
export const SIDEBAR_PINNED_RANK_UP = "pinned:rankUp";
export const SIDEBAR_PINNED_ADD_SPROUT = "pinned:addSprout";
export const SIDEBAR_PINNED_RESET_MATCH = "pinned:resetMatch";
export const SIDEBAR_PINNED_UPLOAD_CONFIG = "pinned:uploadConfig";
export const SIDEBAR_PINNED_TASK_MAP_CHECK = "pinned:taskMapCheck";

export const SIDEBAR_PINNED_DEFS = [
  {
    id: SIDEBAR_PINNED_ITEM,
    title: "全部道具",
    searchKeywords: ["道具", "item"],
    hasMainPanel: true,
    pin: "item" as const,
  },
  {
    id: SIDEBAR_PINNED_TASK,
    title: "全部任务",
    searchKeywords: ["任务", "task"],
    hasMainPanel: true,
    pin: "task" as const,
  },
  {
    id: SIDEBAR_PINNED_ADD_EXP,
    title: "加经验加钱",
    searchKeywords: ["经验", "钱", "exp", "money"],
    hasMainPanel: true,
    pin: null,
  },
  {
    id: SIDEBAR_PINNED_RANK_UP,
    title: "升段位",
    searchKeywords: ["段位", "rank", "升段", "段位分"],
    hasMainPanel: true,
    pin: null,
  },
  {
    id: SIDEBAR_PINNED_ADD_SPROUT,
    title: "加豆芽分",
    searchKeywords: ["豆芽", "sprout", "score"],
    hasMainPanel: false,
    pin: null,
  },
  {
    id: SIDEBAR_PINNED_RESET_MATCH,
    title: "重置服务器匹配",
    searchKeywords: ["重置", "匹配", "服务器", "match"],
    hasMainPanel: false,
    pin: null,
  },
  {
    id: SIDEBAR_PINNED_UPLOAD_CONFIG,
    title: "上传配置",
    searchKeywords: ["上传", "配置", "gtop", "csv"],
    hasMainPanel: true,
    pin: null,
  },
  {
    id: SIDEBAR_PINNED_TASK_MAP_CHECK,
    title: "地图检查",
    searchKeywords: ["地图", "tag", "宝箱", "任务", "检查"],
    hasMainPanel: true,
    pin: null,
  },
] as const;

export type SidebarPinnedId = (typeof SIDEBAR_PINNED_DEFS)[number]["id"];

export function templateSidebarCardId(templateId: string): string {
  return `template:${templateId}`;
}

export function parseTemplateIdFromSidebarCardId(id: string): string | null {
  return id.startsWith("template:") ? id.slice("template:".length) : null;
}

export type SidebarCardDescriptor =
  | {
      id: SidebarPinnedId;
      kind: "pinned";
      title: string;
      searchKeywords: string[];
      hasMainPanel: boolean;
      hidden: boolean;
      pin: "item" | "task" | null;
    }
  | {
      id: string;
      kind: "template";
      title: string;
      searchKeywords: string[];
      hasMainPanel: true;
      hidden: boolean;
      template: SavedTemplate;
    };

function pinnedDescriptor(
  def: (typeof SIDEBAR_PINNED_DEFS)[number],
  hidden: boolean,
): SidebarCardDescriptor {
  return {
    id: def.id,
    kind: "pinned",
    title: def.title,
    searchKeywords: [...def.searchKeywords],
    hasMainPanel: def.hasMainPanel,
    hidden,
    pin: def.pin,
  };
}

function templateDescriptor(t: SavedTemplate, hidden: boolean): SidebarCardDescriptor {
  return {
    id: templateSidebarCardId(t.id),
    kind: "template",
    title: t.title,
    searchKeywords: [t.title, t.source === "item" ? "道具" : "任务"],
    hasMainPanel: true,
    hidden,
    template: t,
  };
}

export function buildSidebarCardDescriptors(config: AppConfig): SidebarCardDescriptor[] {
  const order = resolveSidebarCardOrder(config);
  const pinnedById = new Map(SIDEBAR_PINNED_DEFS.map((d) => [d.id, d]));
  const templates = mergeSidebarTemplateOrder(config.savedTemplates, config.sidebarTemplateOrder);
  const templateByCardId = new Map(templates.map((t) => [templateSidebarCardId(t.id), t]));

  const descriptors: SidebarCardDescriptor[] = [];
  const used = new Set<string>();

  for (const id of order) {
    const pinned = pinnedById.get(id as SidebarPinnedId);
    if (pinned) {
      descriptors.push(pinnedDescriptor(pinned, isSidebarCardHidden(config, id)));
      used.add(id);
      continue;
    }
    const tpl = templateByCardId.get(id);
    if (tpl) {
      descriptors.push(templateDescriptor(tpl, isSidebarCardHidden(config, id)));
      used.add(id);
    }
  }

  for (const def of SIDEBAR_PINNED_DEFS) {
    if (!used.has(def.id)) {
      descriptors.push(pinnedDescriptor(def, isSidebarCardHidden(config, def.id)));
    }
  }
  for (const t of templates) {
    const id = templateSidebarCardId(t.id);
    if (!used.has(id)) {
      descriptors.push(templateDescriptor(t, isSidebarCardHidden(config, id)));
    }
  }

  return descriptors;
}

export function filterVisibleSidebarCards(cards: SidebarCardDescriptor[]): SidebarCardDescriptor[] {
  return cards.filter((c) => !c.hidden);
}

export function matchesSidebarCardSearch(card: SidebarCardDescriptor, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (card.title.toLowerCase().includes(q)) return true;
  return card.searchKeywords.some((kw) => kw.toLowerCase().includes(q));
}
