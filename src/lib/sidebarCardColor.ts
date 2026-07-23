import type { AppConfig, SavedTemplate } from "../types.ts";

export const DEFAULT_SIDEBAR_ITEM_CARD_COLOR = "#e5484d";
export const DEFAULT_SIDEBAR_TASK_CARD_COLOR = "#5b8cff";
export const DEFAULT_SIDEBAR_ADD_EXP_CARD_COLOR = "#e85d04";
export const DEFAULT_SIDEBAR_RANK_UP_CARD_COLOR = "#c9a227";
export const DEFAULT_SIDEBAR_UPLOAD_CONFIG_CARD_COLOR = "#ffffff";
export const DEFAULT_SIDEBAR_TASK_MAP_CHECK_CARD_COLOR = "#8b5cf6";
export const DEFAULT_SIDEBAR_RESET_MATCH_CARD_COLOR = "#6b7280";
export const DEFAULT_SIDEBAR_SPROUT_CARD_COLOR = "#22c55e";

export function sidebarResetMatchDefaultColor(): string {
  return DEFAULT_SIDEBAR_RESET_MATCH_CARD_COLOR;
}

export function sidebarSproutDefaultColor(): string {
  return DEFAULT_SIDEBAR_SPROUT_CARD_COLOR;
}

export function sidebarAddExpDefaultColor(config: AppConfig): string {
  return normalizeSidebarCardColor(config.sidebarAddExpCardColor, DEFAULT_SIDEBAR_ADD_EXP_CARD_COLOR);
}

export function sidebarRankUpDefaultColor(config: AppConfig): string {
  return normalizeSidebarCardColor(config.sidebarRankUpCardColor, DEFAULT_SIDEBAR_RANK_UP_CARD_COLOR);
}

export function sidebarUploadConfigDefaultColor(): string {
  return DEFAULT_SIDEBAR_UPLOAD_CONFIG_CARD_COLOR;
}

export function sidebarTaskMapCheckDefaultColor(): string {
  return DEFAULT_SIDEBAR_TASK_MAP_CHECK_CARD_COLOR;
}

export function normalizeSidebarCardColor(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const t = input.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(t)) return fallback;
  return t;
}

export function sidebarItemDefaultColor(config: AppConfig): string {
  return normalizeSidebarCardColor(config.sidebarItemCardColor, DEFAULT_SIDEBAR_ITEM_CARD_COLOR);
}

export function sidebarTaskDefaultColor(config: AppConfig): string {
  return normalizeSidebarCardColor(config.sidebarTaskCardColor, DEFAULT_SIDEBAR_TASK_CARD_COLOR);
}

export function resolvePinnedItemCardColor(config: AppConfig): string {
  if (config.sidebarItemCardColorOverride?.trim()) {
    return normalizeSidebarCardColor(config.sidebarItemCardColorOverride, sidebarItemDefaultColor(config));
  }
  return sidebarItemDefaultColor(config);
}

export function resolvePinnedTaskCardColor(config: AppConfig): string {
  if (config.sidebarTaskCardColorOverride?.trim()) {
    return normalizeSidebarCardColor(config.sidebarTaskCardColorOverride, sidebarTaskDefaultColor(config));
  }
  return sidebarTaskDefaultColor(config);
}

export function resolveTemplateCardColor(config: AppConfig, template: SavedTemplate): string {
  if (template.cardColor?.trim()) {
    return normalizeSidebarCardColor(
      template.cardColor,
      template.source === "item" ? sidebarItemDefaultColor(config) : sidebarTaskDefaultColor(config),
    );
  }
  return template.source === "item" ? sidebarItemDefaultColor(config) : sidebarTaskDefaultColor(config);
}

export function mergeSidebarTemplateOrder(
  templates: SavedTemplate[],
  savedOrder: string[] | null | undefined,
): SavedTemplate[] {
  if (!templates.length) return [];
  const byId = new Map(templates.map((t) => [t.id, t]));
  const ordered: SavedTemplate[] = [];
  const used = new Set<string>();
  if (savedOrder?.length) {
    for (const id of savedOrder) {
      const t = byId.get(id);
      if (t) {
        ordered.push(t);
        used.add(id);
      }
    }
  }
  const rest = templates
    .filter((t) => !used.has(t.id))
    .sort((a, b) => b.createdAt - a.createdAt);
  return [...ordered, ...rest];
}

import type { CSSProperties } from "react";

export function sidebarCardAccentStyleObj(accent: string): CSSProperties {
  return { "--sidebar-card-accent": accent } as CSSProperties;
}
