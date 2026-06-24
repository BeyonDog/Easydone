import type { AppConfig } from "../types.ts";
import { mergeSidebarTemplateOrder } from "./sidebarCardColor.ts";
import {
  SIDEBAR_PINNED_DEFS,
  templateSidebarCardId,
  parseTemplateIdFromSidebarCardId,
} from "./sidebarCardRegistry.ts";

export function defaultSidebarCardOrder(config: AppConfig): string[] {
  const pinnedIds = SIDEBAR_PINNED_DEFS.map((d) => d.id);
  const templates = mergeSidebarTemplateOrder(config.savedTemplates, config.sidebarTemplateOrder);
  const templateIds = templates.map((t) => templateSidebarCardId(t.id));
  return [...pinnedIds, ...templateIds];
}

export function resolveSidebarCardOrder(config: AppConfig): string[] {
  const validPinned = new Set(SIDEBAR_PINNED_DEFS.map((d) => d.id));
  const validTemplateIds = new Set(config.savedTemplates.map((t) => templateSidebarCardId(t.id)));
  const valid = new Set([...validPinned, ...validTemplateIds]);

  const raw = config.sidebarCardOrder?.length
    ? config.sidebarCardOrder
    : defaultSidebarCardOrder(config);

  const ordered: string[] = [];
  const used = new Set<string>();
  for (const id of raw) {
    if (!valid.has(id) || used.has(id)) continue;
    ordered.push(id);
    used.add(id);
  }

  for (const id of defaultSidebarCardOrder(config)) {
    if (!used.has(id)) {
      ordered.push(id);
      used.add(id);
    }
  }

  return ordered;
}

export function extractTemplateOrderFromCardOrder(cardOrder: string[]): string[] {
  const ids: string[] = [];
  for (const id of cardOrder) {
    const tid = parseTemplateIdFromSidebarCardId(id);
    if (tid) ids.push(tid);
  }
  return ids;
}

export function isSidebarCardHidden(config: AppConfig, cardId: string): boolean {
  return (config.sidebarCardHidden ?? []).includes(cardId);
}

export function toggleSidebarCardHidden(config: AppConfig, cardId: string): AppConfig {
  const hidden = new Set(config.sidebarCardHidden ?? []);
  if (hidden.has(cardId)) {
    hidden.delete(cardId);
  } else {
    hidden.add(cardId);
  }
  return {
    ...config,
    sidebarCardHidden: [...hidden],
  };
}

export function applySidebarCardOrder(config: AppConfig, cardOrder: string[]): AppConfig {
  const resolved = resolveSidebarCardOrder({ ...config, sidebarCardOrder: cardOrder });
  return {
    ...config,
    sidebarCardOrder: resolved,
    sidebarTemplateOrder: extractTemplateOrderFromCardOrder(resolved),
  };
}

export function removeSidebarCardFromLayout(config: AppConfig, cardId: string): AppConfig {
  const order = resolveSidebarCardOrder(config).filter((id) => id !== cardId);
  const hidden = (config.sidebarCardHidden ?? []).filter((id) => id !== cardId);
  return applySidebarCardOrder(
    { ...config, sidebarCardHidden: hidden },
    order,
  );
}

export function reorderSidebarCardSubset(
  config: AppConfig,
  subsetOrderedIds: string[],
): AppConfig {
  const fullOrder = resolveSidebarCardOrder(config);
  const subsetSet = new Set(subsetOrderedIds);
  if (subsetOrderedIds.length === fullOrder.length && subsetOrderedIds.every((id, i) => id === fullOrder[i])) {
    return config;
  }
  if (subsetSet.size === fullOrder.length) {
    return applySidebarCardOrder(config, subsetOrderedIds);
  }
  const result: string[] = [];
  let si = 0;
  for (const id of fullOrder) {
    if (subsetSet.has(id)) {
      if (si < subsetOrderedIds.length) {
        result.push(subsetOrderedIds[si]!);
        si++;
      }
    } else {
      result.push(id);
    }
  }
  return applySidebarCardOrder(config, result);
}

export function appendSidebarCardToLayout(config: AppConfig, cardId: string): AppConfig {
  const order = resolveSidebarCardOrder(config);
  if (order.includes(cardId)) return config;
  return applySidebarCardOrder(config, [...order, cardId]);
}
