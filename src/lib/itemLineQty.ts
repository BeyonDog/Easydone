export const ITEM_LINE_QTY_MIN = 1;
export const ITEM_LINE_QTY_MAX = 9999;

export function clampItemLineQty(n: number): number {
  if (!Number.isFinite(n)) return ITEM_LINE_QTY_MIN;
  return Math.min(ITEM_LINE_QTY_MAX, Math.max(ITEM_LINE_QTY_MIN, Math.trunc(n)));
}

/** Parse user input; invalid or <1 returns null (deselect row). */
export function parseItemLineQtyInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < ITEM_LINE_QTY_MIN) return null;
  return clampItemLineQty(n);
}
