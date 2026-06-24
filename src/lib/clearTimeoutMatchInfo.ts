import type { AppConfig } from "../types.ts";
import { formatGmtExecErrorMessage } from "./branchEnvDisplay.ts";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection.ts";
import {
  gmtExecAdminClearTimeoutMatchInfo,
  gmtSessionSliceFromConfig,
} from "./gmtClient.ts";
import type { LogGmtPartial, OperationOutcome } from "./operationLog.ts";

export type ClearTimeoutMatchInfoDeps = {
  config: AppConfig;
  gmtAccountIdDraft: string;
  ensureGmtLoggedIn: () => Promise<boolean>;
  logGmt: (partial: LogGmtPartial) => void;
};

function formatExecMessage(config: AppConfig, raw: string): string {
  return formatGmtExecErrorMessage(raw, undefined, config.gmtEnvId);
}

function logClearMatch(
  deps: ClearTimeoutMatchInfoDeps,
  outcome: OperationOutcome,
  message: string,
  opts?: { toast?: string },
) {
  deps.logGmt({
    action: "GMT 重置服务器匹配",
    outcome,
    message,
    toast: opts?.toast ?? message,
    envName: deps.config.gmtEnvName,
    accountId: deps.gmtAccountIdDraft,
    items: [],
    source: "gmt-tool",
  });
}

export async function runClearTimeoutMatchInfo(deps: ClearTimeoutMatchInfoDeps): Promise<boolean> {
  const accountId = deps.gmtAccountIdDraft.trim();
  if (!accountId) {
    logClearMatch(deps, "failure", "请填写账号 ID（顶栏或下方）");
    return false;
  }

  const envBlock = gmtEnvSelectionBlockMessage(deps.config.gmtEnvName, deps.config.gmtEnvId);
  if (envBlock) {
    logClearMatch(deps, "failure", envBlock);
    return false;
  }

  if (!(await deps.ensureGmtLoggedIn())) {
    logClearMatch(deps, "failure", "未登录 GMT");
    return false;
  }

  try {
    const slice = gmtSessionSliceFromConfig(deps.config);
    const result = await gmtExecAdminClearTimeoutMatchInfo(slice, {
      envName: deps.config.gmtEnvName!.trim(),
      accountId,
      lockRegion: deps.config.gmtLockRegion?.trim() || "SG",
      notiRegion: deps.config.gmtNotiRegion?.trim() || "SG",
    });
    const msg = result.ok
      ? result.message || "重置服务器匹配成功"
      : formatExecMessage(deps.config, result.message || "重置服务器匹配失败");
    logClearMatch(deps, result.ok ? "success" : "failure", msg);
    return result.ok;
  } catch (e) {
    const msg = `重置服务器匹配异常: ${e instanceof Error ? e.message : String(e)}`;
    logClearMatch(deps, "failure", msg);
    return false;
  }
}
