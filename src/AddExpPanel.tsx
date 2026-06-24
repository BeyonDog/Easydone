import { useCallback, useMemo, useState } from "react";
import type { AppConfig } from "./types.ts";
import {
  formatExpAmountForApi,
  type AccountLevelCumulativeMap,
} from "./lib/accountLevelExp.ts";
import {
  ADD_MONEY_PRESET_GOLD,
  ADD_MONEY_PRESET_LEVEL,
  GRIARIA_GOLD_ITEM_ID,
  GRIARIA_GOLD_LABEL,
  resolveGoldSendQty,
} from "./lib/addExpMoney.ts";
import { formatGmtExecErrorMessage } from "./lib/branchEnvDisplay.ts";
import { gmtEnvSelectionBlockMessage } from "./lib/gmtEnvSelection.ts";
import {
  gmtExecAdminAddExp,
  gmtSessionSliceFromConfig,
  type AdminAddExpInvokeResultPayload,
} from "./lib/gmtClient.ts";
import {
  formatAddExpResultExtra,
  type LogGmtPartial,
  type OperationOutcome,
} from "./lib/operationLog.ts";
import {
  runAddExpPresetMaxLevel,
  runAddExpPresetRich,
  runAddExpPresetRichAndMaxLevel,
  sendGoldPreset,
  submitLevelTarget,
  type AddExpPresetRunnerDeps,
} from "./lib/addExpPresetRunner.ts";

export type AddExpPanelProps = {
  config: AppConfig;
  cumulativeByLevel: AccountLevelCumulativeMap | null;
  cumulativeLoadError: string | null;
  gmtAccountIdDraft: string;
  setGmtAccountIdDraft: (v: string) => void;
  commitGmtAccountIdDraft: () => void;
  ensureGmtLoggedIn: () => Promise<boolean>;
  logGmt: (partial: LogGmtPartial) => void;
};

type ExpMode = "direct" | "level";

type LevelTargetCheck =
  | { ok: true; targetLevel: number }
  | { ok: false; error: string }
  | null;

function resultRows(r: AdminAddExpInvokeResultPayload): { label: string; value: number }[] {
  return [
    { label: "level_before", value: r.levelBefore },
    { label: "level_after", value: r.levelAfter },
    { label: "exp_before", value: r.expBefore },
    { label: "exp_after", value: r.expAfter },
  ];
}

function formatExecMessage(config: AppConfig, raw: string): string {
  return formatGmtExecErrorMessage(raw, undefined, config.gmtEnvId);
}

export function AddExpPanel({
  config,
  cumulativeByLevel,
  cumulativeLoadError,
  gmtAccountIdDraft,
  setGmtAccountIdDraft,
  commitGmtAccountIdDraft,
  ensureGmtLoggedIn,
  logGmt,
}: AddExpPanelProps) {
  const [mode, setMode] = useState<ExpMode>("direct");
  const [directExp, setDirectExp] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [goldAmount, setGoldAmount] = useState("");
  const [goldUseWan, setGoldUseWan] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<AdminAddExpInvokeResultPayload | null>(null);

  const presetDeps = useMemo((): AddExpPresetRunnerDeps => {
    return {
      config,
      cumulativeByLevel,
      cumulativeLoadError,
      gmtAccountIdDraft,
      ensureGmtLoggedIn,
      logGmt,
      onAddExpResult: setLastResult,
    };
  }, [
    config,
    cumulativeByLevel,
    cumulativeLoadError,
    gmtAccountIdDraft,
    ensureGmtLoggedIn,
    logGmt,
  ]);

  const levelTargetCheck = useMemo((): LevelTargetCheck => {
    if (!cumulativeByLevel || mode !== "level") return null;
    const lvl = Number.parseInt(targetLevel.trim(), 10);
    if (!Number.isInteger(lvl) || lvl < 3) {
      return { ok: false, error: "目标等级须为不小于 3 的整数" };
    }
    if (cumulativeByLevel.get(lvl) == null) {
      return { ok: false, error: `表中缺少等级 ${lvl} 的累计经验行` };
    }
    return { ok: true, targetLevel: lvl };
  }, [cumulativeByLevel, mode, targetLevel]);

  const logAddExp = useCallback(
    (
      outcome: OperationOutcome,
      message: string,
      opts?: { toast?: string; items?: LogGmtPartial["items"]; extra?: string },
    ) => {
      logGmt({
        action: "GMT 加经验",
        outcome,
        message,
        toast: opts?.toast ?? message,
        envName: config.gmtEnvName,
        accountId: gmtAccountIdDraft,
        items: opts?.items ?? [],
        source: "add-exp",
        extra: opts?.extra,
      });
    },
    [logGmt, config.gmtEnvName, gmtAccountIdDraft],
  );

  const logAddMoney = useCallback(
    (
      outcome: OperationOutcome,
      message: string,
      qty: number,
      opts?: { toast?: string },
    ) => {
      logGmt({
        action: "GMT 加钱",
        outcome,
        message,
        toast: opts?.toast ?? message,
        envName: config.gmtEnvName,
        accountId: gmtAccountIdDraft,
        items: [{ itemId: GRIARIA_GOLD_ITEM_ID, qty, label: GRIARIA_GOLD_LABEL }],
        source: "add-money",
      });
    },
    [logGmt, config.gmtEnvName, gmtAccountIdDraft],
  );

  const guardBeforeRequest = useCallback(
    async (onFailure: (message: string) => void): Promise<boolean> => {
      const accountId = gmtAccountIdDraft.trim();
      if (!accountId) {
        onFailure("请填写账号 ID（顶栏或下方）");
        return false;
      }
      const envBlock = gmtEnvSelectionBlockMessage(config.gmtEnvName, config.gmtEnvId);
      if (envBlock) {
        onFailure(envBlock);
        return false;
      }
      if (!(await ensureGmtLoggedIn())) {
        onFailure("未登录 GMT");
        return false;
      }
      return true;
    },
    [gmtAccountIdDraft, config.gmtEnvName, config.gmtEnvId, ensureGmtLoggedIn],
  );

  const onSubmitDirect = async () => {
    const n = Number.parseInt(directExp.trim(), 10);
    const expItem = { itemId: `exp +${Number.isFinite(n) && n > 0 ? n : "?"}`, qty: 1 };
    if (!Number.isFinite(n) || n <= 0) {
      logAddExp("failure", "请输入正整数经验值", { items: [expItem] });
      return;
    }
    if (!(await guardBeforeRequest((m) => logAddExp("failure", m)))) return;

    setSubmitting(true);
    setLastResult(null);
    try {
      const slice = gmtSessionSliceFromConfig(config);
      const r = await gmtExecAdminAddExp(slice, {
        envName: config.gmtEnvName!.trim(),
        accountId: gmtAccountIdDraft.trim(),
        exp: formatExpAmountForApi(n),
        lockRegion: config.gmtLockRegion?.trim() || "SG",
        notiRegion: config.gmtNotiRegion?.trim() || "SG",
      });
      const msg = r.ok ? r.message || "加经验成功" : formatExecMessage(config, r.message || "加经验失败");
      logAddExp(r.ok ? "success" : "failure", msg, {
        items: [expItem],
        extra: r.addExpResult ? formatAddExpResultExtra(r.addExpResult) : undefined,
      });
      if (r.ok && r.addExpResult) setLastResult(r.addExpResult);
    } catch (e) {
      const msg = `加经验异常: ${e instanceof Error ? e.message : String(e)}`;
      logAddExp("failure", msg, { items: [expItem] });
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitLevel = async () => {
    if (!levelTargetCheck || !levelTargetCheck.ok) {
      logAddExp("failure", levelTargetCheck?.error ?? "请先填写有效的目标等级（≥3 且表中有该行）");
      return;
    }
    setSubmitting(true);
    try {
      await submitLevelTarget(presetDeps, levelTargetCheck.targetLevel);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitGold = async () => {
    const resolved = resolveGoldSendQty(goldAmount, goldUseWan);
    if (!resolved.ok) {
      logAddMoney("failure", resolved.error, 0);
      return;
    }
    setSubmitting(true);
    try {
      await sendGoldPreset(presetDeps, resolved.qty);
    } finally {
      setSubmitting(false);
    }
  };

  const runPreset = async (runner: (deps: AddExpPresetRunnerDeps) => Promise<void>) => {
    setSubmitting(true);
    try {
      await runner(presetDeps);
    } finally {
      setSubmitting(false);
    }
  };

  const tableHint =
    cumulativeByLevel && cumulativeByLevel.size > 0
      ? null
      : cumulativeLoadError
        ? cumulativeLoadError
        : "未加载 AccountLevel；请在工作区 Excel 目录放置 Account.xlsx";

  const goldPreview = useMemo(() => {
    const r = resolveGoldSendQty(goldAmount, goldUseWan);
    if (!r.ok) return null;
    return r.qty;
  }, [goldAmount, goldUseWan]);

  return (
    <div className="add-exp-panel">
      <h2 className="add-exp-panel-title">加经验加钱</h2>
      <p className="help muted add-exp-panel-lead">
        使用顶部已选环境与登录态；账号默认同顶栏「账号」同步。左栏通过 AdminAddExp 加经验；右栏通过 AdminSendMail 发放物品 ID{" "}
        {GRIARIA_GOLD_ITEM_ID}（{GRIARIA_GOLD_LABEL}）。勾选「万」时实际数量 = 输入 × 10000。
      </p>

      <div className="field add-exp-local-account">
        <label htmlFor="add-exp-account">账号 ID（与顶栏一致）</label>
        <input
          id="add-exp-account"
          type="text"
          className="bookmark add-exp-num-input-wide"
          value={gmtAccountIdDraft}
          onChange={(e) => setGmtAccountIdDraft(e.target.value)}
          onBlur={() => commitGmtAccountIdDraft()}
          placeholder="与顶栏相同"
          autoComplete="off"
        />
      </div>

      <div className="add-exp-preset-bar" role="group" aria-label="快捷预设">
        <button
          type="button"
          className="btn"
          disabled={submitting}
          onClick={() => void runPreset(runAddExpPresetMaxLevel)}
        >
          一键满级
        </button>
        <button
          type="button"
          className="btn"
          disabled={submitting}
          onClick={() => void runPreset(runAddExpPresetRich)}
        >
          一键富翁
        </button>
        <button
          type="button"
          className="btn"
          disabled={submitting}
          onClick={() => void runPreset(runAddExpPresetRichAndMaxLevel)}
        >
          一键富翁满级
        </button>
      </div>
      <p className="help muted add-exp-preset-bar-hint">
        一键满级：升到 Lv.{ADD_MONEY_PRESET_LEVEL}；一键富翁：发放 {ADD_MONEY_PRESET_GOLD.toLocaleString()} 枚{" "}
        {GRIARIA_GOLD_LABEL}；一键富翁满级：先满级再发金币。
      </p>

      <div className="add-exp-money-layout">
        <section className="add-exp-money-col add-exp-money-col--exp add-exp-money-col--stretch" aria-label="加经验">
          <h3 className="add-exp-col-title">加经验 · AdminAddExp</h3>

          <div className="add-exp-mode-row">
            <button
              type="button"
              className={`btn${mode === "direct" ? " primary" : ""}`}
              onClick={() => setMode("direct")}
            >
              直接加 EXP
            </button>
            <button
              type="button"
              className={`btn${mode === "level" ? " primary" : ""}`}
              onClick={() => setMode("level")}
            >
              升到目标等级
            </button>
          </div>

          {mode === "direct" ? (
            <>
              <div className="field">
                <label htmlFor="add-exp-direct-n">本次增加的经验（exp）</label>
                <input
                  id="add-exp-direct-n"
                  type="number"
                  min={1}
                  className="bookmark add-exp-num-input"
                  value={directExp}
                  onChange={(e) => setDirectExp(e.target.value)}
                />
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn primary"
                  disabled={submitting}
                  onClick={() => void onSubmitDirect()}
                >
                  提交加经验
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="help muted add-exp-sheet-status">{tableHint}</p>
              <div className="field">
                <label htmlFor="add-exp-level">升到等级（整数，≥3）</label>
                <input
                  id="add-exp-level"
                  type="number"
                  min={3}
                  step={1}
                  className="bookmark add-exp-num-input"
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(e.target.value)}
                />
              </div>
              <p className="help muted add-exp-exp-preview">
                点击提交后将以「目标级累计 − 探针返回的{" "}
                <code className="add-exp-inline-code">exp_after</code>
                」计算第二次加成；提交过程中无中途提示。若 AccountLevel 表与区服不一致，操作日志中会出现表不一致警告，仍会继续按{" "}
                <code className="add-exp-inline-code">exp_after</code> 计算。
              </p>
              {levelTargetCheck && !levelTargetCheck.ok ? (
                <p className="help add-exp-parse-warn">{levelTargetCheck.error}</p>
              ) : null}
              <div className="btn-row">
                <button
                  type="button"
                  className="btn primary"
                  disabled={submitting}
                  onClick={() => void onSubmitLevel()}
                >
                  按等级计算并提交
                </button>
              </div>
            </>
          )}
        </section>

        <section className="add-exp-money-col add-exp-money-col--money add-exp-money-col--stretch" aria-label="加钱">
          <h3 className="add-exp-col-title">加钱 · AdminSendMail</h3>
          <p className="help muted add-exp-money-hint">
            发放 {GRIARIA_GOLD_LABEL}（物品 ID {GRIARIA_GOLD_ITEM_ID}）
          </p>

          <div className="field add-exp-gold-field">
            <label htmlFor="add-exp-gold-amount">金币数量</label>
            <div className="add-exp-gold-input-row">
              <input
                id="add-exp-gold-amount"
                type="number"
                min={1}
                className="bookmark add-exp-num-input add-exp-gold-input"
                value={goldAmount}
                onChange={(e) => setGoldAmount(e.target.value)}
              />
              <label className="add-exp-wan-label">
                <input
                  type="checkbox"
                  checked={goldUseWan}
                  onChange={(e) => setGoldUseWan(e.target.checked)}
                />
                万
              </label>
            </div>
            {goldPreview != null ? (
              <p className="help muted add-exp-gold-preview">将发放：{goldPreview.toLocaleString()} 枚</p>
            ) : goldAmount.trim() ? (
              <p className="help add-exp-parse-warn">数量无效或超出上限</p>
            ) : null}
          </div>

          <div className="btn-row">
            <button
              type="button"
              className="btn primary"
              disabled={submitting}
              onClick={() => void onSubmitGold()}
            >
              发放金币
            </button>
          </div>
        </section>
      </div>

      {lastResult ? (
        <section className="add-exp-result-block" aria-label="执行结果">
          <h3 className="add-exp-result-heading">加经验执行结果</h3>
          <dl className="add-exp-result-dl">
            {resultRows(lastResult).map(({ label, value }) => (
              <div key={label} className="add-exp-result-row">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
