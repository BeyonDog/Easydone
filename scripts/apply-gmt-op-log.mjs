/**
 * GMT operation log: structured fields + OperationLogPanel integration.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "src", "App.tsx");
let src = fs.readFileSync(appPath, "utf8");

function mustReplace(label, from, to) {
  if (!src.includes(from)) {
    console.error(`apply-gmt-op-log: missing anchor for ${label}`);
    process.exit(1);
  }
  src = src.replace(from, to);
}

mustReplace(
  "imports",
  `import {
  appendOperationLog,
  createOperationLogEntry,
  outcomeLabel,
  type OperationLogEntry,
  type OperationOutcome,
} from "./lib/operationLog";`,
  `import {
  appendOperationLog,
  buildGmtOperationLog,
  createOperationLogEntry,
  toGmtLogItems,
  type OperationLogEntry,
  type OperationOutcome,
} from "./lib/operationLog";
import { OperationLogPanel } from "./OperationLogPanel";`,
);

mustReplace(
  "notify",
  `  const notify = useCallback(
    (text: string, log?: { action: string; outcome: OperationOutcome; detail?: string }) => {
      push(text);
      if (log) logOp({ action: log.action, outcome: log.outcome, detail: log.detail, message: text });
    },
    [push, logOp],
  );`,
  `  const logGmt = useCallback(
    (
      partial: Parameters<typeof buildGmtOperationLog>[0] & { toast?: string },
    ) => {
      const { toast, ...rest } = partial;
      if (toast) push(toast);
      logOp(buildGmtOperationLog(rest));
    },
    [push, logOp],
  );

  const notify = useCallback(
    (
      text: string,
      log?: {
        action: string;
        outcome: OperationOutcome;
        detail?: string;
        context?: string;
        extra?: string;
        gmt?: OperationLogEntry["gmt"];
      },
    ) => {
      push(text);
      if (log) {
        logOp({
          action: log.action,
          outcome: log.outcome,
          detail: log.detail,
          message: text,
          context: log.context,
          extra: log.extra,
          gmt: log.gmt,
        });
      }
    },
    [push, logOp],
  );`,
);

const sendTemplateNew = `  const sendTemplateItemsNow = async (title: string, items: SendTemplateItem[]) => {
    if (!config) return;
    const envName = config.gmtEnvName;
    const accountId = gmtAccountIdDraft.trim();
    const mergedPreview = mergeSendTemplateItems(items);

    if (!(await ensureGmtLoggedIn())) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: "未登录 GMT",
        toast: "未登录 GMT",
        envName,
        accountId,
        items: toGmtLogItems(mergedPreview),
        source: "template",
        templateTitle: title,
      });
      return;
    }
    if (!envName?.trim()) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: "请选择区服",
        toast: "请选择区服",
        envName,
        accountId,
        items: toGmtLogItems(mergedPreview),
        source: "template",
        templateTitle: title,
      });
      return;
    }
    if (!accountId) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: "请填写账号 ID",
        toast: "请填写账号 ID",
        envName,
        accountId,
        items: toGmtLogItems(mergedPreview),
        source: "template",
        templateTitle: title,
      });
      return;
    }
    const merged = mergedPreview;
    if (merged.length === 0) {
      logGmt({
        action: "GMT 发放道具",
        outcome: "failure",
        message: "模板内物品 ID 为空",
        toast: "模板内物品 ID 为空",
        envName,
        accountId,
        items: [],
        source: "template",
        templateTitle: title,
      });
      return;
    }
    const result = await execAdminSendMailItems(merged, config, accountId);
    logGmt({
      action: "GMT 发放道具",
      outcome: result.ok ? "success" : "failure",
      message: result.message,
      toast: result.message,
      envName,
      accountId,
      items: toGmtLogItems(merged),
      source: "template",
      templateTitle: title,
    });
    return result.ok;
  };`;

const sendTemplateOld = `  const sendTemplateItemsNow = async (title: string, items: SendTemplateItem[]) => {
    if (!config) return;
    if (!(await ensureGmtLoggedIn())) {
      logOp({ action: "GMT 发放道具", outcome: "failure", message: "未登录 GMT", detail: title });
      return;
    }
    if (!config.gmtEnvName?.trim()) {
      notify("请选择区服", { action: "GMT 发放道具", outcome: "failure", detail: title });
      return;
    }
    if (!gmtAccountIdDraft.trim()) {
      notify("请填写账号 ID", { action: "GMT 发放道具", outcome: "failure", detail: title });
      return;
    }
    const merged = mergeSendTemplateItems(items);
    if (merged.length === 0) {
      notify("模板内物品 ID 为空", { action: "GMT 发放道具", outcome: "failure", detail: title });
      return;
    }
    const result = await execAdminSendMailItems(merged, config, gmtAccountIdDraft.trim());
    const log = {
      action: "GMT 发放道具",
      outcome: (result.ok ? "success" : "failure") as OperationOutcome,
      detail: title,
    };
    notify(result.message, log);
    return result.ok;
  };`;

mustReplace("sendTemplateItemsNow", sendTemplateOld, sendTemplateNew);

const itemBranchOld = `    if (currentSource === "item") {
      if (!(await ensureGmtLoggedIn())) return;
      const readiness = evaluateGmtItemSendReadiness({
        gmtSessionChecking: false,
        gmtLoggedIn: true,
        gmtEnvName: config.gmtEnvName,
        gmtAccountId: gmtAccountIdDraft,
        selectedRows,
        currentAoa,
      });
      if (!readiness.ready) {
        notify(readiness.message, { action: "GMT 发放道具", outcome: "failure" });
        return;
      }
      const accountId = gmtAccountIdDraft.trim();
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
      const items = buildSendItemsFromSelection(currentAoa, selectedRows, itemLineQty, ridx);
      const result = await execAdminSendMailItems(items, config, accountId);
      notify(
        result.ok ? \`\${result.message}（\${idxs.length} 行）\` : result.message,
        {
          action: "GMT 发放道具",
          outcome: result.ok ? "success" : "failure",
          detail: \`\${result.itemKindCount} 种\`,
        },
      );
      return;
    }`;

const itemBranchNew = `    if (currentSource === "item") {
      const envName = config.gmtEnvName;
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const ridx = resolveRemarkColumnIndex(headersRow, config.itemRemarkColumn);
      const previewItems = buildSendItemsFromSelection(currentAoa, selectedRows, itemLineQty, ridx);

      if (!(await ensureGmtLoggedIn())) {
        logGmt({
          action: "GMT 发放道具",
          outcome: "failure",
          message: "未登录 GMT",
          toast: "未登录 GMT",
          envName,
          accountId: gmtAccountIdDraft,
          items: toGmtLogItems(previewItems),
          source: "item-table",
        });
        return;
      }
      const readiness = evaluateGmtItemSendReadiness({
        gmtSessionChecking: false,
        gmtLoggedIn: true,
        gmtEnvName: config.gmtEnvName,
        gmtAccountId: gmtAccountIdDraft,
        selectedRows,
        currentAoa,
      });
      if (!readiness.ready) {
        logGmt({
          action: "GMT 发放道具",
          outcome: "failure",
          message: readiness.message,
          toast: readiness.message,
          envName,
          accountId: gmtAccountIdDraft,
          items: toGmtLogItems(previewItems),
          source: "item-table",
        });
        return;
      }
      const accountId = gmtAccountIdDraft.trim();
      const items = previewItems;
      const result = await execAdminSendMailItems(items, config, accountId);
      const toastMsg = result.ok ? \`\${result.message}（\${idxs.length} 行）\` : result.message;
      logGmt({
        action: "GMT 发放道具",
        outcome: result.ok ? "success" : "failure",
        message: toastMsg,
        toast: toastMsg,
        envName,
        accountId,
        items: toGmtLogItems(items),
        source: "item-table",
      });
      return;
    }`;

mustReplace("item branch", itemBranchOld, itemBranchNew);

const taskBranchOld = `    if (currentSource === "task") {
      if (!(await ensureGmtLoggedIn())) return;
      const readiness = evaluateGmtTaskSendReadiness({
        gmtSessionChecking: false,
        gmtLoggedIn: true,
        gmtEnvName: config.gmtEnvName,
        gmtAccountId: gmtAccountIdDraft,
        selectedRows,
        currentAoa,
      });
      if (!readiness.ready) {
        push(readiness.message);
        return;
      }
      const accountId = gmtAccountIdDraft.trim();
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const idCol = resolveTaskIdColumnIndex(headersRow);
      const row = currentAoa[idxs[0]! + 1];
      const rawId = row?.[idCol];
      const q = parseCellAsInteger(rawId);
      const taskId = q != null ? String(q) : cellStr(rawId).trim();
      try {
        const result = await gmtExecAdminFinishTask(gmtSessionSliceFromConfig(config), {
          envName: config.gmtEnvName!,
          accountId,
          lockRegion: config.gmtLockRegion,
          notiRegion: config.gmtNotiRegion,
          taskId,
        });
        if (result.ok) {
          push(\`已完成任务 \${taskId}\`);
        } else {
          push(\`GMT 发送失败: \${result.message}\`);
        }
      } catch (e) {
        push(\`GMT 登录失败: \${e}\`);
      }
      return;
    }`;

const taskBranchNew = `    if (currentSource === "task") {
      const envName = config.gmtEnvName;
      const headersRow = currentAoa[0]?.map((h) => cellStr(h)) ?? [];
      const idCol = resolveTaskIdColumnIndex(headersRow);
      const row = currentAoa[idxs[0]! + 1];
      const rawId = row?.[idCol];
      const q = parseCellAsInteger(rawId);
      const taskId = q != null ? String(q) : cellStr(rawId).trim();
      const taskItems = taskId ? [{ itemId: \`任务 \${taskId}\`, qty: 1 }] : [];

      if (!(await ensureGmtLoggedIn())) {
        logGmt({
          action: "GMT 完成任务",
          outcome: "failure",
          message: "未登录 GMT",
          toast: "未登录 GMT",
          envName,
          accountId: gmtAccountIdDraft,
          items: taskItems,
          source: "task",
        });
        return;
      }
      const readiness = evaluateGmtTaskSendReadiness({
        gmtSessionChecking: false,
        gmtLoggedIn: true,
        gmtEnvName: config.gmtEnvName,
        gmtAccountId: gmtAccountIdDraft,
        selectedRows,
        currentAoa,
      });
      if (!readiness.ready) {
        logGmt({
          action: "GMT 完成任务",
          outcome: "failure",
          message: readiness.message,
          toast: readiness.message,
          envName,
          accountId: gmtAccountIdDraft,
          items: taskItems,
          source: "task",
        });
        return;
      }
      const accountId = gmtAccountIdDraft.trim();
      try {
        const result = await gmtExecAdminFinishTask(gmtSessionSliceFromConfig(config), {
          envName: config.gmtEnvName!,
          accountId,
          lockRegion: config.gmtLockRegion,
          notiRegion: config.gmtNotiRegion,
          taskId,
        });
        const toastMsg = result.ok ? \`已完成任务 \${taskId}\` : \`GMT 发送失败: \${result.message}\`;
        logGmt({
          action: "GMT 完成任务",
          outcome: result.ok ? "success" : "failure",
          message: toastMsg,
          toast: toastMsg,
          envName,
          accountId,
          items: taskItems,
          source: "task",
        });
      } catch (e) {
        const msg = \`GMT 登录失败: \${e}\`;
        logGmt({
          action: "GMT 完成任务",
          outcome: "failure",
          message: msg,
          toast: msg,
          envName,
          accountId,
          items: taskItems,
          source: "task",
        });
      }
      return;
    }`;

mustReplace("task branch", taskBranchOld, taskBranchNew);

const panelOld = `          {logPanelOpen ? (
            <motion.div className="op-log-panel" onClick={(e) => e.stopPropagation()}>
              <div className="op-log-panel-head">
                <span>操作日志（本会话）</span>
                <button type="button" className="btn btn-tiny" onClick={() => clearLog()}>
                  清空
                </button>
              </div>
              <div className="op-log-panel-body">
                {operationLogEntries.length === 0 ? (
                  <p className="help muted">暂无操作记录</p>
                ) : (
                  operationLogEntries.map((e) => (
                    <div key={e.id} className={\`op-log-entry op-log-entry--\${e.outcome}\`}>
                      <span className="op-log-time">
                        {new Date(e.at).toLocaleTimeString("zh-CN", { hour12: false })}
                      </span>
                      <span className={\`op-log-badge op-log-badge--\${e.outcome}\`}>{outcomeLabel(e.outcome)}</span>
                      <span className="op-log-action">{e.action}</span>
                      {e.detail ? <span className="op-log-detail">{e.detail}</span> : null}
                      <span className="op-log-message">{e.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}`;

const panelNew = `          {logPanelOpen ? (
            <OperationLogPanel entries={operationLogEntries} onClear={clearLog} />
          ) : null}`;

// Fix panel old - I used motion.div by mistake in panelOld. Use actual content from file.
const panelOldActual = `          {logPanelOpen ? (
            <div className="op-log-panel" onClick={(e) => e.stopPropagation()}>
              <div className="op-log-panel-head">
                <span>操作日志（本会话）</span>
                <button type="button" className="btn btn-tiny" onClick={() => clearLog()}>
                  清空
                </button>
              </div>
              <div className="op-log-panel-body">
                {operationLogEntries.length === 0 ? (
                  <p className="help muted">暂无操作记录</p>
                ) : (
                  operationLogEntries.map((e) => (
                    <motion.div key={e.id} className={\`op-log-entry op-log-entry--\${e.outcome}\`}>
                      <span className="op-log-time">
                        {new Date(e.at).toLocaleTimeString("zh-CN", { hour12: false })}
                      </span>
                      <span className={\`op-log-badge op-log-badge--\${e.outcome}\`}>{outcomeLabel(e.outcome)}</span>
                      <span className="op-log-action">{e.action}</span>
                      {e.detail ? <span className="op-log-detail">{e.detail}</span> : null}
                      <span className="op-log-message">{e.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}`;

if (src.includes(panelOldActual)) {
  src = src.replace(panelOldActual, panelNew);
} else if (src.includes(panelOld.replace(/motion\.div/g, "motion.div"))) {
  mustReplace("panel", panelOld.replace(/motion\.div/g, "div").replace(/<\/motion\.motion.div>/g, "</div>"), panelNew);
} else {
  const panelRe =
    /\{logPanelOpen \? \(\s*<div className="op-log-panel"[\s\S]*?\) : null\}/;
  if (!panelRe.test(src)) {
    console.error("apply-gmt-op-log: log panel block not found");
    process.exit(1);
  }
  src = src.replace(panelRe, panelNew);
}

fs.writeFileSync(appPath, src, "utf8");
console.log("apply-gmt-op-log: OK");
