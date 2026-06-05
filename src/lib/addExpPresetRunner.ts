import type { AppConfig } from "../types.ts";
import {
  ADD_EXP_LEVEL_PROBE,
  formatExpAmountForApi,
  secondBatchExpAfterProbe,
  type AccountLevelCumulativeMap,
} from "./accountLevelExp.ts";
import {
  ADD_MONEY_PRESET_GOLD,
  ADD_MONEY_PRESET_LEVEL,
  GRIARIA_GOLD_ITEM_ID,
  GRIARIA_GOLD_LABEL,
} from "./addExpMoney.ts";
import { formatGmtExecErrorMessage } from "./branchEnvDisplay.ts";
import { gmtEnvSelectionBlockMessage } from "./gmtEnvSelection.ts";
import {
  gmtExecAdminAddExp,
  gmtSessionSliceFromConfig,
  type AdminAddExpInvokeResultPayload,
} from "./gmtClient.ts";
import {
  formatAddExpResultExtra,
  type LogGmtPartial,
  type OperationOutcome,
} from "./operationLog.ts";
import { execAdminSendMailRewardItems } from "./sendTemplate.ts";

export type AddExpPresetRunnerDeps = {
  config: AppConfig;
  cumulativeByLevel: AccountLevelCumulativeMap | null;
  cumulativeLoadError: string | null;
  gmtAccountIdDraft: string;
  ensureGmtLoggedIn: () => Promise<boolean>;
  logGmt: (partial: LogGmtPartial) => void;
  onAddExpResult?: (result: AdminAddExpInvokeResultPayload | null) => void;
};

function formatExecMessage(config: AppConfig, raw: string): string {
  return formatGmtExecErrorMessage(raw, undefined, config.gmtEnvId);
}

function logAddExp(
  deps: AddExpPresetRunnerDeps,
  outcome: OperationOutcome,
  message: string,
  opts?: { toast?: string; items?: LogGmtPartial["items"]; extra?: string },
) {
  deps.logGmt({
    action: "GMT 加经验",
    outcome,
    message,
    toast: opts?.toast ?? message,
    envName: deps.config.gmtEnvName,
    accountId: deps.gmtAccountIdDraft,
    items: opts?.items ?? [],
    source: "add-exp",
    extra: opts?.extra,
  });
}

function logAddMoney(
  deps: AddExpPresetRunnerDeps,
  outcome: OperationOutcome,
  message: string,
  qty: number,
  opts?: { toast?: string },
) {
  deps.logGmt({
    action: "GMT 加钱",
    outcome,
    message,
    toast: opts?.toast ?? message,
    envName: deps.config.gmtEnvName,
    accountId: deps.gmtAccountIdDraft,
    items: [{ itemId: GRIARIA_GOLD_ITEM_ID, qty, label: GRIARIA_GOLD_LABEL }],
    source: "add-money",
  });
}

async function guardBeforeRequest(
  deps: AddExpPresetRunnerDeps,
  onFailure: (message: string) => void,
): Promise<boolean> {
  const accountId = deps.gmtAccountIdDraft.trim();
  if (!accountId) {
    onFailure("请填写账号 ID（顶栏或下方）");
    return false;
  }
  const envBlock = gmtEnvSelectionBlockMessage(deps.config.gmtEnvName, deps.config.gmtEnvId);
  if (envBlock) {
    onFailure(envBlock);
    return false;
  }
  if (!(await deps.ensureGmtLoggedIn())) {
    onFailure("未登录 GMT");
    return false;
  }
  return true;
}

async function invokeAddExp(deps: AddExpPresetRunnerDeps, expStr: string) {
  const slice = gmtSessionSliceFromConfig(deps.config);
  return gmtExecAdminAddExp(slice, {
    envName: deps.config.gmtEnvName!.trim(),
    accountId: deps.gmtAccountIdDraft.trim(),
    exp: expStr,
    lockRegion: deps.config.gmtLockRegion?.trim() || "SG",
    notiRegion: deps.config.gmtNotiRegion?.trim() || "SG",
  });
}

export async function submitLevelTarget(
  deps: AddExpPresetRunnerDeps,
  targetLvl: number,
): Promise<boolean> {
  if (!deps.cumulativeByLevel) {
    const msg = deps.cumulativeLoadError ?? "请先配置工作区 Excel/Account.xlsx 并包含 AccountLevel 表";
    logAddExp(deps, "failure", msg);
    return false;
  }
  if (!Number.isInteger(targetLvl) || targetLvl < 3) {
    logAddExp(deps, "failure", "目标等级须为不小于 3 的整数");
    return false;
  }
  if (deps.cumulativeByLevel.get(targetLvl) == null) {
    logAddExp(deps, "failure", `表中缺少等级 ${targetLvl} 的累计经验行`);
    return false;
  }
  if (!(await guardBeforeRequest(deps, (m) => logAddExp(deps, "failure", m)))) return false;

  const levelItem = { itemId: `升到 Lv.${targetLvl}`, qty: 1 };
  const probeExp = formatExpAmountForApi(ADD_EXP_LEVEL_PROBE);

  deps.onAddExpResult?.(null);
  try {
    const r1 = await invokeAddExp(deps, probeExp);
    if (!r1.ok) {
      logAddExp(deps, "failure", formatExecMessage(deps.config, r1.message || "探针加经验失败"), {
        items: [{ itemId: `探针 +${ADD_EXP_LEVEL_PROBE}`, qty: 1 }, levelItem],
      });
      return false;
    }
    const p1 = r1.addExpResult;
    if (!p1) {
      logAddExp(deps, "failure", "服务端未返回 level/exp 结果，无法进行第二次计算", { items: [levelItem] });
      return false;
    }

    const batch = secondBatchExpAfterProbe(deps.cumulativeByLevel, targetLvl, p1.levelAfter, p1.expAfter);
    if (!batch.ok) {
      logAddExp(deps, "failure", batch.error, {
        items: [levelItem],
        extra: formatAddExpResultExtra(p1),
      });
      return false;
    }

    if (batch.secondExp <= 0) {
      deps.onAddExpResult?.(p1);
      logAddExp(deps, "success", "探针后累计经验已达或超过目标等级要求，已完成同步（+10）。", {
        items: [levelItem],
        extra: formatAddExpResultExtra(p1),
      });
      return true;
    }

    const r2 = await invokeAddExp(deps, formatExpAmountForApi(batch.secondExp));
    const msg = r2.ok
      ? r2.message || "加经验成功"
      : formatExecMessage(deps.config, r2.message || "第二次加经验失败");
    logAddExp(deps, r2.ok ? "success" : "failure", msg, {
      items: [{ itemId: `exp +${batch.secondExp}`, qty: 1 }, levelItem],
      extra: r2.addExpResult
        ? formatAddExpResultExtra(r2.addExpResult)
        : formatAddExpResultExtra(p1),
    });
    if (r2.ok && r2.addExpResult) {
      deps.onAddExpResult?.(r2.addExpResult);
    } else {
      deps.onAddExpResult?.(null);
    }
    return r2.ok;
  } catch (e) {
    const msg = `加经验异常: ${e instanceof Error ? e.message : String(e)}`;
    logAddExp(deps, "failure", msg, { items: [levelItem] });
    return false;
  }
}

export async function sendGoldPreset(deps: AddExpPresetRunnerDeps, qty: number): Promise<boolean> {
  if (!(await guardBeforeRequest(deps, (m) => logAddMoney(deps, "failure", m, qty)))) return false;
  try {
    const result = await execAdminSendMailRewardItems(
      [{ id: GRIARIA_GOLD_ITEM_ID, cnt: String(qty) }],
      deps.config,
      deps.gmtAccountIdDraft.trim(),
    );
    logAddMoney(deps, result.ok ? "success" : "failure", result.message, qty);
    return result.ok;
  } catch (e) {
    const msg = `加钱异常: ${e instanceof Error ? e.message : String(e)}`;
    logAddMoney(deps, "failure", msg, qty);
    return false;
  }
}

export async function runAddExpPresetMaxLevel(deps: AddExpPresetRunnerDeps): Promise<void> {
  await submitLevelTarget(deps, ADD_MONEY_PRESET_LEVEL);
}

export async function runAddExpPresetRich(deps: AddExpPresetRunnerDeps): Promise<void> {
  await sendGoldPreset(deps, ADD_MONEY_PRESET_GOLD);
}

export async function runAddExpPresetRichAndMaxLevel(deps: AddExpPresetRunnerDeps): Promise<void> {
  const levelOk = await submitLevelTarget(deps, ADD_MONEY_PRESET_LEVEL);
  if (!levelOk) return;
  const goldOk = await sendGoldPreset(deps, ADD_MONEY_PRESET_GOLD);
  if (!goldOk) {
    logAddMoney(
      deps,
      "failure",
      `满级已成功，但发放 ${ADD_MONEY_PRESET_GOLD} 金币失败，请查看上一条日志`,
      ADD_MONEY_PRESET_GOLD,
    );
  }
}
