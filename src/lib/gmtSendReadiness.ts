import { cellStr, parseCellAsInteger, resolveItemIdColumnIndex, type SheetMatrix } from "./xlsxHelpers";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection";

export type GmtItemSendReadiness = { ready: boolean; message: string };

export function evaluateGmtItemSendReadiness(params: {
  gmtSessionChecking: boolean;
  gmtLoggedIn: boolean;
  gmtEnvName: string | null | undefined;
  gmtEnvId: number | null | undefined;
  gmtAccountId: string;
  selectedRows: Set<number>;
  currentAoa: SheetMatrix | null;
}): GmtItemSendReadiness {
  if (params.gmtSessionChecking) {
    return { ready: false, message: "正在检查 GMT 登录…" };
  }
  if (!params.gmtLoggedIn) {
    return { ready: false, message: "未登录 GMT" };
  }
  const envBlock = gmtEnvSelectionBlockMessage(params.gmtEnvName, params.gmtEnvId);
  if (envBlock) {
    return { ready: false, message: envBlock };
  }
  if (!params.gmtAccountId.trim()) {
    return { ready: false, message: "未填写账号 ID" };
  }
  if (params.selectedRows.size === 0) {
    return { ready: false, message: "未勾选道具行" };
  }
  const headersRow = params.currentAoa?.[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveItemIdColumnIndex(headersRow);
  if (idCol < 0) {
    return { ready: false, message: "当前表无「物品ID」列" };
  }
  let hasId = false;
  for (const di of params.selectedRows) {
    const row = params.currentAoa?.[di + 1];
    const rawId = row?.[idCol];
    const q = parseCellAsInteger(rawId);
    const idKey = q != null ? String(q) : cellStr(rawId).trim();
    if (idKey) {
      hasId = true;
      break;
    }
  }
  if (!hasId) {
    return { ready: false, message: "所选行物品 ID 为空" };
  }
  return { ready: true, message: "当前可发送" };
}
