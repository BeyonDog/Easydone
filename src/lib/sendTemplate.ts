import { formatGmtExecErrorMessage } from "./branchEnvDisplay";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection";
import { globalMailLimitUserMessage, isGlobalMailLimitError } from "./globalMailLimit.ts";
import {
  normalizeItemServerWideSendSettings,
  parseLocalizationJson,
} from "./itemServerWideSendSettings.ts";
import { gmtExecAdminSendGlobalMail, gmtExecAdminSendMail, gmtSessionSliceFromConfig } from "./gmtClient";
import {
  cellStr,
  parseCellAsInteger,
  resolveItemIdColumnIndex,
  type SheetMatrix,
} from "./xlsxHelpers";
import type { AppConfig, SendTemplateItem } from "../types";

export function buildSendItemsFromSelection(
  aoa: SheetMatrix,
  selectedRows: Set<number>,
  itemLineQty: Record<number, number>,
  remarkColIndex: number,
): SendTemplateItem[] {
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveItemIdColumnIndex(headersRow);
  if (idCol < 0) return [];

  const counts = new Map<string, { qty: number; label?: string }>();
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

    if (!counts.has(idKey)) orderKeys.push(idKey);
    const prev = counts.get(idKey);
    counts.set(idKey, {
      qty: (prev?.qty ?? 0) + qty,
      label: prev?.label ?? label,
    });
  }

  return orderKeys.map((itemId) => {
    const v = counts.get(itemId)!;
    return { itemId, qty: v.qty, label: v.label };
  });
}

export function mergeSendTemplateItems(items: SendTemplateItem[]): SendTemplateItem[] {
  const counts = new Map<string, { qty: number; label?: string }>();
  const orderKeys: string[] = [];
  for (const it of items) {
    const id = it.itemId.trim();
    if (!id) continue;
    const qty = Math.min(9999, Math.max(1, it.qty));
    if (!counts.has(id)) orderKeys.push(id);
    const prev = counts.get(id);
    counts.set(id, {
      qty: (prev?.qty ?? 0) + qty,
      label: prev?.label ?? it.label,
    });
  }
  return orderKeys.map((itemId) => {
    const v = counts.get(itemId)!;
    return { itemId, qty: v.qty, label: v.label };
  });
}

export type AdminSendMailResult = {
  ok: boolean;
  message: string;
  itemKindCount: number;
  rowCount?: number;
};

export async function execAdminSendMailItems(
  items: SendTemplateItem[],
  config: AppConfig,
  accountId: string,
  envDisplayLabel?: string,
): Promise<AdminSendMailResult> {
  const merged = mergeSendTemplateItems(items);
  if (merged.length === 0) {
    return { ok: false, message: "所选行物品 ID 为空", itemKindCount: 0 };
  }

  const envBlock = gmtEnvSelectionBlockMessage(config.gmtEnvName, config.gmtEnvId);
  if (envBlock) {
    return { ok: false, message: envBlock, itemKindCount: merged.length };
  }

  const rewardItems = merged.map((it) => ({
    id: it.itemId,
    cnt: String(it.qty),
  }));

  const formatError = (raw: string) =>
    formatGmtExecErrorMessage(raw, envDisplayLabel, config.gmtEnvId);

  try {
    const result = await gmtExecAdminSendMail(gmtSessionSliceFromConfig(config), {
      envName: config.gmtEnvName!,
      accountId,
      lockRegion: config.gmtLockRegion,
      notiRegion: config.gmtNotiRegion,
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
): Promise<AdminSendMailResult> {
  const merged = mergeSendTemplateItems(items);
  if (merged.length === 0) {
    return { ok: false, message: "物品列表为空", itemKindCount: 0 };
  }
  const rewardItems = merged.map((it) => ({
    id: it.itemId,
    cnt: String(it.qty),
  }));

  const envName = config.gmtEnvName?.trim();
  if (!envName) {
    return { ok: false, message: "请先在顶栏选择 GMT 环境", itemKindCount: rewardItems.length };
  }

  const sw = normalizeItemServerWideSendSettings(config.itemServerWideSendSettings);

  try {
    const result = await gmtExecAdminSendGlobalMail(gmtSessionSliceFromConfig(config), {
      envName,
      region: fields.region.trim() || config.gmtLockRegion,
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
