export const GRIARIA_GOLD_ITEM_ID = "1001";
export const GRIARIA_GOLD_LABEL = "格瑞亚金币";
export const ADD_MONEY_PRESET_LEVEL = 50;
export const ADD_MONEY_PRESET_GOLD = 999_999;
export const ADD_MONEY_WAN_MULTIPLIER = 10_000;
export const ADD_MONEY_MAX_GOLD_QTY = 999_999_999;

export type ResolveGoldSendQtyResult =
  | { ok: true; qty: number }
  | { ok: false; error: string };

export function resolveGoldSendQty(raw: string, useWan: boolean): ResolveGoldSendQtyResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "请输入正整数金币数量" };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: "金币数量须为正整数" };
  }
  const base = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(base) || base <= 0) {
    return { ok: false, error: "金币数量须为正整数" };
  }
  let qty = base;
  if (useWan) {
    if (!Number.isSafeInteger(base) || base > ADD_MONEY_MAX_GOLD_QTY / ADD_MONEY_WAN_MULTIPLIER) {
      return { ok: false, error: `勾选「万」后数量过大（上限 ${ADD_MONEY_MAX_GOLD_QTY}）` };
    }
    qty = base * ADD_MONEY_WAN_MULTIPLIER;
    if (!Number.isSafeInteger(qty)) {
      return { ok: false, error: "计算后的金币数量无效" };
    }
  }
  if (qty > ADD_MONEY_MAX_GOLD_QTY) {
    return { ok: false, error: `单次发放不得超过 ${ADD_MONEY_MAX_GOLD_QTY}` };
  }
  return { ok: true, qty };
}
