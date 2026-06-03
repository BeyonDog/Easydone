import { useCallback, useMemo, useState } from "react";
import type { AppConfig } from "./types.ts";
import {
  ADD_EXP_LEVEL_PROBE,
  formatExpAmountForApi,
  secondBatchExpAfterProbe,
  type AccountLevelCumulativeMap,
} from "./lib/accountLevelExp.ts";
import { formatGmtExecErrorMessage } from "./lib/branchEnvDisplay.ts";
import { gmtEnvSelectionBlockMessage } from "./lib/gmtEnvSelection.ts";
import {
  gmtExecAdminAddExp,
  gmtSessionSliceFromConfig,
  type AdminAddExpInvokeResultPayload,
  type GmtExecInvokeResult,
} from "./lib/gmtClient.ts";
import {
  formatAddExpResultExtra,
  type LogGmtPartial,
  type OperationOutcome,
} from "./lib/operationLog.ts";

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
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<AdminAddExpInvokeResultPayload | null>(null);

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

  const invokeAddExp = async (expStr: string): Promise<GmtExecInvokeResult> => {
    const slice = gmtSessionSliceFromConfig(config);
    return gmtExecAdminAddExp(slice, {
      envName: config.gmtEnvName!.trim(),
      accountId: gmtAccountIdDraft.trim(),
      exp: expStr,
      lockRegion: config.gmtLockRegion?.trim() || "SG",
      notiRegion: config.gmtNotiRegion?.trim() || "SG",
    });
  };

  const guardBeforeRequest = async (): Promise<boolean> => {
    const accountId = gmtAccountIdDraft.trim();
    if (!accountId) {
      logAddExp("failure", "请填写账号 ID（顶栏或下方）");
      return false;
    }
    const envBlock = gmtEnvSelectionBlockMessage(config.gmtEnvName, config.gmtEnvId);
    if (envBlock) {
      logAddExp("failure", envBlock);
      return false;
    }
    if (!(await ensureGmtLoggedIn())) {
      logAddExp("failure", "未登录 GMT");
      return false;
    }
    return true;
  };

  const onSubmitDirect = async () => {
    const n = Number.parseInt(directExp.trim(), 10);
    const expItem = { itemId: `exp +${Number.isFinite(n) && n > 0 ? n : "?"}`, qty: 1 };
    if (!Number.isFinite(n) || n <= 0) {
      logAddExp("failure", "请输入正整数经验值", { items: [expItem] });
      return;
    }
    if (!(await guardBeforeRequest())) return;

    setSubmitting(true);
    setLastResult(null);
    try {
      const r = await invokeAddExp(formatExpAmountForApi(n));
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
    if (!cumulativeByLevel) {
      const msg = cumulativeLoadError ?? "请先配置工作区 Excel/Account.xlsx 并包含 AccountLevel 表";
      logAddExp("failure", msg);
      return;
    }
    if (!levelTargetCheck || !levelTargetCheck.ok) {
      logAddExp("failure", levelTargetCheck?.error ?? "请先填写有效的目标等级（≥3 且表中有该行）");
      return;
    }
    if (!(await guardBeforeRequest())) return;

    const targetLvl = levelTargetCheck.targetLevel;
    const levelItem = { itemId: `升到 Lv.${targetLvl}`, qty: 1 };
    const probeExp = formatExpAmountForApi(ADD_EXP_LEVEL_PROBE);

    setSubmitting(true);
    setLastResult(null);
    try {
      const r1 = await invokeAddExp(probeExp);
      if (!r1.ok) {
        logAddExp("failure", formatExecMessage(config, r1.message || "探针加经验失败"), {
          items: [{ itemId: `探针 +${ADD_EXP_LEVEL_PROBE}`, qty: 1 }, levelItem],
        });
        return;
      }
      const p1 = r1.addExpResult;
      if (!p1) {
        logAddExp("failure", "服务端未返回 level/exp 结果，无法进行第二次计算", { items: [levelItem] });
        return;
      }

      const batch = secondBatchExpAfterProbe(cumulativeByLevel, targetLvl, p1.levelAfter, p1.expAfter);
      if (!batch.ok) {
        logAddExp("failure", batch.error, {
          items: [levelItem],
          extra: formatAddExpResultExtra(p1),
        });
        return;
      }

      if (batch.secondExp <= 0) {
        setLastResult(p1);
        logAddExp("success", "探针后累计经验已达或超过目标等级要求，已完成同步（+10）。", {
          items: [levelItem],
          extra: formatAddExpResultExtra(p1),
        });
        return;
      }

      const r2 = await invokeAddExp(formatExpAmountForApi(batch.secondExp));
      const msg = r2.ok
        ? r2.message || "加经验成功"
        : formatExecMessage(config, r2.message || "第二次加经验失败");
      logAddExp(r2.ok ? "success" : "failure", msg, {
        items: [{ itemId: `exp +${batch.secondExp}`, qty: 1 }, levelItem],
        extra: r2.addExpResult
          ? formatAddExpResultExtra(r2.addExpResult)
          : formatAddExpResultExtra(p1),
      });
      if (r2.ok && r2.addExpResult) {
        setLastResult(r2.addExpResult);
      } else {
        setLastResult(null);
      }
    } catch (e) {
      const msg = `加经验异常: ${e instanceof Error ? e.message : String(e)}`;
      logAddExp("failure", msg, { items: [levelItem] });
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

  return (
    <div className="add-exp-panel">
      <h2 className="add-exp-panel-title">加经验 · AdminAddExp</h2>
      <p className="help muted add-exp-panel-lead">
        使用顶部已选环境与登录态；账号默认同顶栏「账号」同步。「直接加 EXP」单次提交。<strong>升到目标等级</strong>会先静默加{" "}
        {ADD_EXP_LEVEL_PROBE} 点探针，用返回的{" "}
        <code className="add-exp-inline-code">exp_after</code>（与表中累计同口径）计算差额后自动第二次提交；结果区<strong>仅展示最后一次</strong>成功返回的四项。
      </p>

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
            <button type="button" className="btn primary" disabled={submitting} onClick={() => void onSubmitDirect()}>
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
            」计算第二次加成；提交过程中无中途提示。
          </p>
          {levelTargetCheck && !levelTargetCheck.ok ? (
            <p className="help add-exp-parse-warn">{levelTargetCheck.error}</p>
          ) : null}
          <div className="btn-row">
            <button type="button" className="btn primary" disabled={submitting} onClick={() => void onSubmitLevel()}>
              按等级计算并提交
            </button>
          </div>
        </>
      )}

      {lastResult ? (
        <section className="add-exp-result-block" aria-label="执行结果">
          <h3 className="add-exp-result-heading">执行结果</h3>
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
