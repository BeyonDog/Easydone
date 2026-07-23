import { ADD_MONEY_MAX_GOLD_QTY } from "./addExpMoney.ts";
import { formatGmtExecErrorMessage } from "./branchEnvDisplay";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection";
import { globalMailLimitUserMessage, isGlobalMailLimitError } from "./globalMailLimit.ts";
import {
  normalizeItemServerWideSendSettings,
  parseLocalizationJson,
} from "./itemServerWideSendSettings.ts";
import { gmtExecAdminSendGlobalMail, gmtExecAdminSendMail, gmtSessionSliceFromConfig } from "./gmtClient";
import { gmtRequestRegions } from "./gmtPlatform.ts";
import {
  itemDurabilityMaxForSendItem,
  parseSendItemMergeKey,
  resolveRowDurabilityValue,
  resolveRowWearValue,
  sendItemMergeKey,
  type SendItemsWearOptions,
} from "./itemWearValue.ts";
import {
  cellStr,
  parseCellAsInteger,
  resolveItemIdColumnIndex,
  type SheetMatrix,
} from "./xlsxHelpers";
import type { AppConfig, SendTemplateItem } from "../types";

export { parseSendItemMergeKey, sendItemMergeKey } from "./itemWearValue.ts";

export function buildSendItemsFromSelection(
  aoa: SheetMatrix,
  selectedRows: Set<number>,
  itemLineQty: Record<number, number>,
  remarkColIndex: number,
  wearOpts?: SendItemsWearOptions,
): SendTemplateItem[] {
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveItemIdColumnIndex(headersRow);
  if (idCol < 0) return [];

  const counts = new Map<
    string,
    { qty: number; label?: string; wearValue?: number; durabilityValue?: number }
  >();
  const orderKeys: string[] = [];

  for (const di of selectedRows) {
    const row = aoa[di + 1];
    if (!row) continue;
    const rawId = row[idCol];
    const q = parseCellAsInteger(rawId);
    const idKey = q != null ? String(q) : cellStr(rawId).trim();
    if (!idKey) continue;

    const qty = Math.min(9999, Math.max(1, itemLineQty[di] ?? 1));
    let label: string | undefined;
    if (remarkColIndex >= 0) {
      const remark = cellStr(row[remarkColIndex]).trim();
      if (remark) label = remark;
    }

    let wearValue: number | undefined;
    let durabilityValue: number | undefined;
    if (wearOpts) {
      wearValue = resolveRowWearValue(
        di,
        row,
        wearOpts.typeCol,
        wearOpts.typeRemarkCol,
        wearOpts.itemLineWear,
        wearOpts.wearRowOverride,
        wearOpts.defaultWearValue,
      );
      durabilityValue = resolveRowDurabilityValue(
        di,
        row,
        wearOpts.typeCol,
        wearOpts.typeRemarkCol,
        wearOpts.initDurCol,
        wearOpts.itemLineDurability,
        wearOpts.durabilityRowOverride,
      );
    }

    const mergeKey = sendItemMergeKey(idKey, wearValue, durabilityValue);
    if (!counts.has(mergeKey)) orderKeys.push(mergeKey);
    const prev = counts.get(mergeKey);
    counts.set(mergeKey, {
      qty: (prev?.qty ?? 0) + qty,
      label: prev?.label ?? label,
      wearValue: prev?.wearValue ?? wearValue,
      durabilityValue: prev?.durabilityValue ?? durabilityValue,
    });
  }

  return orderKeys.map((mergeKey) => {
    const v = counts.get(mergeKey)!;
    const parsed = parseSendItemMergeKey(mergeKey);
    return {
      itemId: parsed.itemId,
      qty: v.qty,
      label: v.label,
      ...(v.wearValue != null ? { wearValue: v.wearValue } : {}),
      ...(v.durabilityValue != null ? { durabilityValue: v.durabilityValue } : {}),
    };
  });
}

export function mergeSendTemplateItems(items: SendTemplateItem[]): SendTemplateItem[] {
  const counts = new Map<
    string,
    { qty: number; label?: string; wearValue?: number; durabilityValue?: number }
  >();
  const orderKeys: string[] = [];
  for (const it of items) {
    const id = it.itemId.trim();
    if (!id) continue;
    const qty = Math.min(9999, Math.max(1, it.qty));
    const mergeKey = sendItemMergeKey(id, it.wearValue, it.durabilityValue);
    if (!counts.has(mergeKey)) orderKeys.push(mergeKey);
    const prev = counts.get(mergeKey);
    counts.set(mergeKey, {
      qty: (prev?.qty ?? 0) + qty,
      label: prev?.label ?? it.label,
      wearValue: prev?.wearValue ?? it.wearValue,
      durabilityValue: prev?.durabilityValue ?? it.durabilityValue,
    });
  }
  return orderKeys.map((mergeKey) => {
    const v = counts.get(mergeKey)!;
    const parsed = parseSendItemMergeKey(mergeKey);
    return {
      itemId: parsed.itemId,
      qty: v.qty,
      label: v.label,
      ...(v.wearValue != null ? { wearValue: v.wearValue } : {}),
      ...(v.durabilityValue != null ? { durabilityValue: v.durabilityValue } : {}),
    };
  });
}

export type AdminSendMailResult = {
  ok: boolean;
  message: string;
  itemKindCount: number;
  rowCount?: number;
};

function validateRewardItemsForPanel(
  rewardItems: { id: string; cnt: string; wearValue?: number; durabilityValue?: number }[],
  itemAoa?: SheetMatrix | null,
): string | null {
  if (rewardItems.length === 0) return "物品列表为空";
  for (const r of rewardItems) {
    const id = r.id.trim();
    if (!id) return "物品 ID 为空";
    const cntStr = r.cnt.trim();
    if (!/^\d+$/.test(cntStr)) return `物品 ${id} 数量须为正整数`;
    const n = Number.parseInt(cntStr, 10);
    if (!Number.isFinite(n) || n <= 0) return `物品 ${id} 数量须为正整数`;
    if (n > ADD_MONEY_MAX_GOLD_QTY) return `物品 ${id} 数量超过上限 ${ADD_MONEY_MAX_GOLD_QTY}`;
    if (r.wearValue != null && (r.wearValue < 0 || r.wearValue > 100)) {
      return `物品 ${id} 耐久须在 0–100`;
    }
    if (r.durabilityValue != null) {
      const max = itemDurabilityMaxForSendItem(itemAoa ?? null, id);
      const cap = max ?? r.durabilityValue;
      if (r.durabilityValue < 0 || r.durabilityValue > cap) {
        return `物品 ${id} 耐久须在 0–${cap}`;
      }
    }
  }
  return null;
}

function toGmtRewardItems(items: SendTemplateItem[]) {
  return items.map((it) => ({
    id: it.itemId,
    cnt: String(it.qty),
    ...(it.wearValue != null ? { wearValue: it.wearValue } : {}),
    ...(it.durabilityValue != null ? { durabilityValue: it.durabilityValue } : {}),
  }));
}

/** 加经验加钱面板等：不经 mergeSendTemplateItems 的 9999 数量上限 */
export async function execAdminSendMailRewardItems(
  rewardItems: { id: string; cnt: string; wearValue?: number; durabilityValue?: number }[],
  config: AppConfig,
  accountId: string,
  envDisplayLabel?: string,
): Promise<AdminSendMailResult> {
  const validationError = validateRewardItemsForPanel(rewardItems);
  if (validationError) {
    return { ok: false, message: validationError, itemKindCount: 0 };
  }

  const envBlock = gmtEnvSelectionBlockMessage(config.gmtEnvName, config.gmtEnvId);
  if (envBlock) {
    return { ok: false, message: envBlock, itemKindCount: rewardItems.length };
  }

  const formatError = (raw: string) =>
    formatGmtExecErrorMessage(raw, envDisplayLabel, config.gmtEnvId);
  const regions = gmtRequestRegions(config);

  try {
    const result = await gmtExecAdminSendMail(gmtSessionSliceFromConfig(config), {
      envName: config.gmtEnvName!,
      accountId,
      lockRegion: regions.lockRegion,
      notiRegion: regions.notiRegion,
      tradable: config.gmtTradable,
      rewardItems,
    });
    if (result.ok) {
      return {
        ok: true,
        message: `已发送 ${rewardItems.length} 种物品`,
        itemKindCount: rewardItems.length,
      };
    }
    return { ok: false, message: formatError(result.message), itemKindCount: rewardItems.length };
  } catch (e) {
    return { ok: false, message: formatError(String(e)), itemKindCount: rewardItems.length };
  }
}

export async function execAdminSendMailItems(
  items: SendTemplateItem[],
  config: AppConfig,
  accountId: string,
  envDisplayLabel?: string,
  itemAoa?: SheetMatrix | null,
): Promise<AdminSendMailResult> {
  const merged = mergeSendTemplateItems(items);
  if (merged.length === 0) {
    return { ok: false, message: "所选行物品 ID 为空", itemKindCount: 0 };
  }

  const envBlock = gmtEnvSelectionBlockMessage(config.gmtEnvName, config.gmtEnvId);
  if (envBlock) {
    return { ok: false, message: envBlock, itemKindCount: merged.length };
  }

  const rewardItems = toGmtRewardItems(merged);
  const validationError = validateRewardItemsForPanel(rewardItems, itemAoa);
  if (validationError) {
    return { ok: false, message: validationError, itemKindCount: merged.length };
  }

  const formatError = (raw: string) =>
    formatGmtExecErrorMessage(raw, envDisplayLabel, config.gmtEnvId);
  const regions = gmtRequestRegions(config);

  try {
    const result = await gmtExecAdminSendMail(gmtSessionSliceFromConfig(config), {
      envName: config.gmtEnvName!,
      accountId,
      lockRegion: regions.lockRegion,
      notiRegion: regions.notiRegion,
      tradable: config.gmtTradable,
      rewardItems,
    });
    if (result.ok) {
      return {
        ok: true,
        message: `已发送 ${rewardItems.length} 种物品`,
        itemKindCount: rewardItems.length,
      };
    }
    return { ok: false, message: formatError(result.message), itemKindCount: rewardItems.length };
  } catch (e) {
    return { ok: false, message: formatError(String(e)), itemKindCount: rewardItems.length };
  }
}

export async function execAdminSendGlobalMail(
  items: SendTemplateItem[],
  config: AppConfig,
  fields: {
    region: string;
    title: string;
    content: string;
    senderName: string;
    startTime: number;
    endTime: number;
  },
  itemAoa?: SheetMatrix | null,
): Promise<AdminSendMailResult> {
  const merged = mergeSendTemplateItems(items);
  if (merged.length === 0) {
    return { ok: false, message: "物品列表为空", itemKindCount: 0 };
  }
  const rewardItems = toGmtRewardItems(merged);
  const validationError = validateRewardItemsForPanel(rewardItems, itemAoa);
  if (validationError) {
    return { ok: false, message: validationError, itemKindCount: rewardItems.length };
  }

  const envName = config.gmtEnvName?.trim();
  if (!envName) {
    return { ok: false, message: "请先在顶栏选择 GMT 环境", itemKindCount: rewardItems.length };
  }

  const sw = normalizeItemServerWideSendSettings(config.itemServerWideSendSettings);
  const regions = gmtRequestRegions(config);

  try {
    const result = await gmtExecAdminSendGlobalMail(gmtSessionSliceFromConfig(config), {
      envName,
      region: config.gmtPlatform === "cn" ? regions.lockRegion : fields.region.trim() || regions.lockRegion,
      title: fields.title.trim(),
      content: fields.content,
      startTime: fields.startTime,
      endTime: fields.endTime,
      tradable: config.gmtTradable,
      rewardItems,
      globalMailType: sw.advanced.globalMailType,
      distType: sw.advanced.distType,
      senderName: fields.senderName.trim() || sw.advanced.senderName,
      localization: parseLocalizationJson(sw.advanced.localizationJson),
    });
    if (result.ok) {
      return {
        ok: true,
        message: result.message || `全服邮件已提交（${rewardItems.length} 种附件）`,
        itemKindCount: rewardItems.length,
      };
    }
    const msg = result.message ?? "";
    return {
      ok: false,
      message: isGlobalMailLimitError(msg) ? globalMailLimitUserMessage(msg) : msg,
      itemKindCount: rewardItems.length,
    };
  } catch (e) {
    return { ok: false, message: String(e), itemKindCount: rewardItems.length };
  }
}
