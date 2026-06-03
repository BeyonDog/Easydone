import {
  cellStr,
  parseCellAsInteger,
  resolveItemIdColumnIndex,
  type SheetMatrix,
} from "./xlsxHelpers";
import type { AppConfig, SavedSendTemplate, SavedSnapshot, SavedTemplate, SendTemplateItem } from "../types";

const MAX_TEMPLATES = 50;

export function itemsFromItemAoa(aoa: SheetMatrix, remarkColHint: string | null): SendTemplateItem[] {
  if (!aoa.length) return [];
  const headersRow = aoa[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveItemIdColumnIndex(headersRow);
  if (idCol < 0) return [];
  let remarkCol = -1;
  if (remarkColHint) {
    remarkCol = headersRow.findIndex((h) => h === remarkColHint);
  }
  const counts = new Map<string, { qty: number; label?: string }>();
  const orderKeys: string[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    const rawId = row[idCol];
    const q = parseCellAsInteger(rawId);
    const idKey = q != null ? String(q) : cellStr(rawId).trim();
    if (!idKey) continue;
    let label: string | undefined;
    if (remarkCol >= 0) {
      const remark = cellStr(row[remarkCol]).trim();
      if (remark) label = remark;
    }
    if (!counts.has(idKey)) orderKeys.push(idKey);
    const prev = counts.get(idKey);
    counts.set(idKey, { qty: (prev?.qty ?? 0) + 1, label: prev?.label ?? label });
  }
  return orderKeys.map((itemId) => {
    const v = counts.get(itemId)!;
    return { itemId, qty: Math.min(9999, Math.max(1, v.qty)), label: v.label };
  });
}

export function syntheticAoaFromSendItems(items: SendTemplateItem[]): SheetMatrix {
  const header = ["物品ID", "名称/备注", "数量"] as unknown[];
  const rows = items.map((it) => [it.itemId, it.label ?? "", it.qty] as unknown[]);
  return [header, ...rows];
}

export function snapshotToTemplate(snap: SavedSnapshot, remarkCol: string | null): SavedTemplate {
  const items = snap.source === "item" ? itemsFromItemAoa(snap.aoa, remarkCol) : [];
  return {
    id: snap.id,
    title: snap.title,
    createdAt: snap.createdAt,
    source: snap.source,
    aoa: snap.aoa,
    items,
    freezeThroughHeader: snap.freezeThroughHeader ?? null,
  };
}

export function legacySendTemplateToTemplate(tpl: SavedSendTemplate): SavedTemplate {
  return {
    id: tpl.id,
    title: tpl.title,
    createdAt: tpl.createdAt,
    source: "item",
    aoa: syntheticAoaFromSendItems(tpl.items),
    items: tpl.items,
    freezeThroughHeader: null,
  };
}

/** Merge legacy snapshots + send templates into savedTemplates; cap count. */
export function migrateConfigTemplates(c: AppConfig): AppConfig {
  const existing = c.savedTemplates ?? [];
  if (existing.length > 0 && (!c.savedSnapshots?.length && !c.sendTemplates?.length)) {
    return { ...c, savedSnapshots: [], sendTemplates: [] };
  }
  const byId = new Map<string, SavedTemplate>();
  for (const t of existing) byId.set(t.id, t);
  for (const snap of c.savedSnapshots ?? []) {
    if (!byId.has(snap.id)) byId.set(snap.id, snapshotToTemplate(snap, c.itemRemarkColumn));
  }
  for (const tpl of c.sendTemplates ?? []) {
    if (!byId.has(tpl.id)) byId.set(tpl.id, legacySendTemplateToTemplate(tpl));
    else {
      const cur = byId.get(tpl.id)!;
      if (!cur.aoa?.length && tpl.items.length) {
        byId.set(tpl.id, { ...cur, items: tpl.items, aoa: syntheticAoaFromSendItems(tpl.items) });
      }
    }
  }
  let list = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  while (list.length > MAX_TEMPLATES) {
    list = list.slice(0, MAX_TEMPLATES);
  }
  return {
    ...c,
    savedTemplates: list,
    savedSnapshots: [],
    sendTemplates: [],
  };
}
