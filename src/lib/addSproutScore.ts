import type { AppConfig } from "../types.ts";
import { formatGmtExecErrorMessage } from "./branchEnvDisplay.ts";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection.ts";
import { SPROUT_SCORE_ONE_CLICK_AMOUNT } from "./gmtApi.contract.ts";
import { gmtExecAddSproutScore, gmtSessionSliceFromConfig } from "./gmtClient.ts";
import { gmtRequestRegions } from "./gmtPlatform.ts";
import type { LogGmtPartial, OperationOutcome } from "./operationLog.ts";

export type AddSproutScoreDeps = {
  config: AppConfig;
  gmtAccountIdDraft: string;
  ensureGmtLoggedIn: () => Promise<boolean>;
  logGmt: (partial: LogGmtPartial) => void;
};

function formatExecMessage(config: AppConfig, raw: string): string {
  return formatGmtExecErrorMessage(raw, undefined, config.gmtEnvId);
}

function logAddSprout(
  deps: AddSproutScoreDeps,
  outcome: OperationOutcome,
  message: string,
  opts?: { toast?: string },
) {
  deps.logGmt({
    action: "GMT 加豆芽分",
    outcome,
    message,
    toast: opts?.toast ?? message,
    envName: deps.config.gmtEnvName,
    accountId: deps.gmtAccountIdDraft,
    items: [],
    source: "gmt-tool",
  });
}

export async function runAddSproutScore(deps: AddSproutScoreDeps): Promise<boolean> {
  const accountId = deps.gmtAccountIdDraft.trim();
  if (!accountId) {
    logAddSprout(deps, "failure", "请填写账号 ID（顶栏或下方）");
    return false;
  }

  const envBlock = gmtEnvSelectionBlockMessage(deps.config.gmtEnvName, deps.config.gmtEnvId);
  if (envBlock) {
    logAddSprout(deps, "failure", envBlock);
    return false;
  }

  if (!(await deps.ensureGmtLoggedIn())) {
    logAddSprout(deps, "failure", "未登录 GMT");
    return false;
  }

  try {
    const slice = gmtSessionSliceFromConfig(deps.config);
    const regions = gmtRequestRegions(deps.config);
    const result = await gmtExecAddSproutScore(slice, {
      envName: deps.config.gmtEnvName!.trim(),
      accountId,
      lockRegion: regions.lockRegion,
      notiRegion: regions.notiRegion,
      sproutScore: SPROUT_SCORE_ONE_CLICK_AMOUNT,
    });
    const msg = result.ok
      ? result.message || `加豆芽分成功（+${SPROUT_SCORE_ONE_CLICK_AMOUNT}）`
      : formatExecMessage(deps.config, result.message || "加豆芽分失败");
    logAddSprout(deps, result.ok ? "success" : "failure", msg);
    return result.ok;
  } catch (e) {
    const msg = `加豆芽分异常: ${e instanceof Error ? e.message : String(e)}`;
    logAddSprout(deps, "failure", msg);
    return false;
  }
}
