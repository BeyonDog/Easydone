import type { ItemServerWideSendSettings } from "../types.ts";

export const DEFAULT_GLOBAL_MAIL_TYPE = "GlobalMailType_ATTACHMENT";
export const DEFAULT_DIST_TYPE = "DistType_NONE";
export const DEFAULT_SENDER_NAME = "lang";

export function defaultItemServerWideSendSettings(): ItemServerWideSendSettings {
  return {
    entriesEnabled: true,
    advanced: {
      globalMailType: DEFAULT_GLOBAL_MAIL_TYPE,
      distType: DEFAULT_DIST_TYPE,
      senderName: DEFAULT_SENDER_NAME,
      localizationJson: "[]",
    },
  };
}

export function normalizeItemServerWideSendSettings(
  raw: ItemServerWideSendSettings | null | undefined,
): ItemServerWideSendSettings {
  const d = defaultItemServerWideSendSettings();
  if (raw == null || typeof raw !== "object") return d;
  const adv = raw.advanced;
  return {
    entriesEnabled: raw.entriesEnabled !== false,
    advanced: {
      globalMailType:
        typeof adv?.globalMailType === "string" && adv.globalMailType.trim()
          ? adv.globalMailType.trim()
          : d.advanced.globalMailType,
      distType:
        typeof adv?.distType === "string" && adv.distType.trim() ? adv.distType.trim() : d.advanced.distType,
      senderName:
        typeof adv?.senderName === "string" && adv.senderName.trim()
          ? adv.senderName.trim()
          : d.advanced.senderName,
      localizationJson:
        typeof adv?.localizationJson === "string" ? adv.localizationJson : d.advanced.localizationJson,
    },
  };
}

export function parseLocalizationJson(json: string): unknown[] {
  const t = json.trim();
  if (!t) return [];
  try {
    const v = JSON.parse(t) as unknown;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
