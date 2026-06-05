import type { SendTemplateItem } from "../types";

export type OperationOutcome = "success" | "failure" | "info";

export interface GmtLogItem {
  itemId: string;
  qty: number;
  label?: string;
}

export interface GmtOperationPayload {
  envName: string;
  accountId: string;
  items: GmtLogItem[];
  source?: "item-table" | "template" | "task" | "add-exp" | "add-money" | "global-mail";
  templateTitle?: string;
}

export interface OperationLogEntry {
  id: string;
  at: number;
  action: string;
  detail?: string;
  outcome: OperationOutcome;
  message: string;
  gmt?: GmtOperationPayload;
  context?: string;
  extra?: string;
}

export const MAX_OPERATION_LOG_ENTRIES = 200;

export function createOperationLogEntry(
  partial: Omit<OperationLogEntry, "id" | "at"> & { at?: number },
): OperationLogEntry {
  return {
    id: crypto.randomUUID(),
    at: partial.at ?? Date.now(),
    action: partial.action,
    detail: partial.detail,
    outcome: partial.outcome,
    message: partial.message,
    gmt: partial.gmt,
    context: partial.context,
    extra: partial.extra,
  };
}

export function appendOperationLog(
  prev: OperationLogEntry[],
  entry: OperationLogEntry,
): OperationLogEntry[] {
  const next = [entry, ...prev];
  return next.length > MAX_OPERATION_LOG_ENTRIES ? next.slice(0, MAX_OPERATION_LOG_ENTRIES) : next;
}

export function outcomeLabel(outcome: OperationOutcome): string {
  if (outcome === "success") return "成功";
  if (outcome === "failure") return "失败";
  return "信息";
}

export function displayLogField(value?: string | null): string {
  const t = value?.trim();
  return t ? t : "—";
}

export function toGmtLogItems(items: SendTemplateItem[]): GmtLogItem[] {
  return items.map((it) => ({
    itemId: it.itemId,
    qty: it.qty,
    label: it.label,
  }));
}

export function formatGmtItemLine(item: GmtLogItem): string {
  const label = item.label?.trim() ? `（${item.label.trim()}）` : "";
  return `${item.itemId} × ${item.qty}${label}`;
}

export function buildGmtOperationLog(
  partial: Omit<OperationLogEntry, "id" | "at" | "gmt"> & {
    envName?: string | null;
    accountId?: string | null;
    items: GmtLogItem[];
    source?: GmtOperationPayload["source"];
    templateTitle?: string;
  },
): Omit<OperationLogEntry, "id" | "at"> {
  const { envName, accountId, items, source, templateTitle, ...rest } = partial;
  return {
    ...rest,
    gmt: {
      envName: displayLogField(envName),
      accountId: displayLogField(accountId),
      items,
      source,
      templateTitle,
    },
  };
}

export type LogGmtPartial = Parameters<typeof buildGmtOperationLog>[0] & { toast?: string };

export function formatAddExpResultExtra(r: {
  levelBefore: number;
  levelAfter: number;
  expBefore: number;
  expAfter: number;
}): string {
  return [
    `level_before: ${r.levelBefore}`,
    `level_after: ${r.levelAfter}`,
    `exp_before: ${r.expBefore}`,
    `exp_after: ${r.expAfter}`,
  ].join("\n");
}

export function formatOperationDateTime(at: number): string {
  return new Date(at).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
