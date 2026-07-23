import type { AppConfig } from "../types.ts";
import { formatGmtExecErrorMessage } from "./branchEnvDisplay.ts";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection.ts";
import { gmtExecAdminModifyRankPoints, gmtSessionSliceFromConfig } from "./gmtClient.ts";
import { gmtRequestRegions } from "./gmtPlatform.ts";
import { computeRankUpgradeDelta, type RankLadderStop } from "./rankLadder.ts";
import type { LogGmtPartial, OperationOutcome } from "./operationLog.ts";

export type RankUpRunnerDeps = {
  config: AppConfig;
  gmtAccountIdDraft: string;
  ensureGmtLoggedIn: () => Promise<boolean>;
  logGmt: (partial: LogGmtPartial) => void;
  currentScore: number;
  target: RankLadderStop;
};

function formatExecMessage(config: AppConfig, raw: string): string {
  return formatGmtExecErrorMessage(raw, undefined, config.gmtEnvId);
}

function logRankUp(
  deps: RankUpRunnerDeps,
  outcome: OperationOutcome,
  message: string,
  opts?: { toast?: string; delta?: number },
) {
  const delta = opts?.delta;
  deps.logGmt({
    action: "GMT 升段位",
    outcome,
    message,
    toast: opts?.toast ?? message,
    envName: deps.config.gmtEnvName,
    accountId: deps.gmtAccountIdDraft,
    items: [
      {
        itemId: `${deps.target.name} (RankID ${deps.target.rankId})`,
        qty: delta != null && delta > 0 ? delta : 1,
        label: delta != null ? `delta ${delta}` : deps.target.groupName,
      },
    ],
    source: "rank-up",
  });
}

export function prepareRankUpgradeDelta(
  currentScore: number,
  targetScoreMin: number,
): { ok: true; delta: number } | { ok: false; error: string } {
  if (!Number.isFinite(currentScore) || currentScore < 0) {
    return { ok: false, error: "请先确认有效的当前段位分" };
  }
  if (!Number.isFinite(targetScoreMin) || targetScoreMin < 1) {
    return { ok: false, error: "请选择目标段位" };
  }
  const delta = computeRankUpgradeDelta(currentScore, targetScoreMin);
  if (delta <= 0) {
    return { ok: false, error: "当前段位分已达或超过目标，无需升级" };
  }
  return { ok: true, delta };
}

export async function runRankUpgrade(deps: RankUpRunnerDeps): Promise<boolean> {
  const accountId = deps.gmtAccountIdDraft.trim();
  if (!accountId) {
    logRankUp(deps, "failure", "请填写账号 ID（顶栏或下方）");
    return false;
  }
  const envBlock = gmtEnvSelectionBlockMessage(deps.config.gmtEnvName, deps.config.gmtEnvId);
  if (envBlock) {
    logRankUp(deps, "failure", envBlock);
    return false;
  }
  const prepared = prepareRankUpgradeDelta(deps.currentScore, deps.target.scoreMin);
  if (!prepared.ok) {
    logRankUp(deps, "failure", prepared.error);
    return false;
  }
  if (!(await deps.ensureGmtLoggedIn())) {
    logRankUp(deps, "failure", "未登录 GMT");
    return false;
  }

  try {
    const slice = gmtSessionSliceFromConfig(deps.config);
    const regions = gmtRequestRegions(deps.config);
    const result = await gmtExecAdminModifyRankPoints(slice, {
      envName: deps.config.gmtEnvName!.trim(),
      accountId,
      lockRegion: regions.lockRegion,
      notiRegion: regions.notiRegion,
      deltaRankPoints: String(prepared.delta),
    });
    const msg = result.ok
      ? result.message ||
        `升段位成功：${deps.target.name}（+${prepared.delta}，目标分 ${deps.target.scoreMin}）`
      : formatExecMessage(deps.config, result.message || "升段位失败");
    logRankUp(deps, result.ok ? "success" : "failure", msg, { delta: prepared.delta });
    return result.ok;
  } catch (e) {
    const msg = `升段位异常: ${e instanceof Error ? e.message : String(e)}`;
    logRankUp(deps, "failure", msg, { delta: prepared.delta });
    return false;
  }
}
