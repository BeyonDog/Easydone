import {
  parseTaskRowForComplete,
  pickNextTaskRowByIdAsc,
} from "./completeTask.ts";
import { cellStr, parseCellAsInteger, resolveTaskIdColumnIndex, type SheetMatrix } from "./xlsxHelpers.ts";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection.ts";

export type GmtTaskSendReadiness = { ready: boolean; message: string };

function gmtSessionChecks(params: {
  gmtSessionChecking: boolean;
  gmtLoggedIn: boolean;
  gmtEnvName: string | null | undefined;
  gmtEnvId: number | null | undefined;
  gmtAccountId: string;
}): GmtTaskSendReadiness | null {
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
  return null;
}

function rowReadiness(currentAoa: SheetMatrix | null, dataIdx: number): GmtTaskSendReadiness {
  const headersRow = currentAoa?.[0]?.map((h) => cellStr(h)) ?? [];
  const idCol = resolveTaskIdColumnIndex(headersRow);
  if (idCol < 0) {
    return { ready: false, message: "当前表无「任务ID」列" };
  }
  const row = currentAoa?.[dataIdx + 1];
  const rawId = row?.[idCol];
  const q = parseCellAsInteger(rawId);
  const idKey = q != null ? String(q) : cellStr(rawId).trim();
  if (!idKey) {
    return { ready: false, message: "所选行任务 ID 为空" };
  }
  return { ready: true, message: "当前可完成" };
}

/** Validate one row for AdminFinishTask (multi-select allowed at call site). */
export function evaluateGmtTaskCompleteOneRow(params: {
  gmtSessionChecking: boolean;
  gmtLoggedIn: boolean;
  gmtEnvName: string | null | undefined;
  gmtEnvId: number | null | undefined;
  gmtAccountId: string;
  currentAoa: SheetMatrix | null;
  dataIdx: number;
}): GmtTaskSendReadiness {
  const session = gmtSessionChecks(params);
  if (session) return session;
  return rowReadiness(params.currentAoa, params.dataIdx);
}

/** Topbar hint: next task by 任务ID ascending when multi-select. */
export function evaluateGmtTaskSendReadiness(params: {
  gmtSessionChecking: boolean;
  gmtLoggedIn: boolean;
  gmtEnvName: string | null | undefined;
  gmtEnvId: number | null | undefined;
  gmtAccountId: string;
  selectedRows: Set<number>;
  currentAoa: SheetMatrix | null;
}): GmtTaskSendReadiness {
  const session = gmtSessionChecks(params);
  if (session) return session;
  if (params.selectedRows.size === 0) {
    return { ready: false, message: "未勾选任务行" };
  }

  if (!params.currentAoa) {
    return { ready: false, message: "未勾选任务行" };
  }

  const nextDi = pickNextTaskRowByIdAsc(params.currentAoa, params.selectedRows);
  if (nextDi == null) {
    return { ready: false, message: "所选行任务 ID 为空或当前表无「任务ID」列" };
  }

  const rowReady = rowReadiness(params.currentAoa, nextDi);
  if (!rowReady.ready) return rowReady;

  const parsed = parseTaskRowForComplete(params.currentAoa, nextDi);
  const label = parsed?.remarkLabel.trim() || parsed?.taskId || "任务";

  if (params.selectedRows.size === 1) {
    return { ready: true, message: "当前可完成" };
  }

  return {
    ready: true,
    message: `已勾选 ${params.selectedRows.size} 个，下次将完成 ${label}（按任务 ID 从小到大）`,
  };
}
