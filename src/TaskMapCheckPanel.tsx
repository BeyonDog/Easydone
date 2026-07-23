import { useMemo, useState } from "react";
import type { AppConfig } from "./types.ts";
import type { TagCheckReport, TaskMapCondition } from "./lib/taskMapTagCheck/index.ts";
import { formatIssueDescription, formatIssueReason } from "./lib/taskMapTagCheck/index.ts";

export type TaskMapCheckPanelProps = {
  config: AppConfig;
  busy: boolean;
  error: string | null;
  report: TagCheckReport | null;
  onRunCheck: () => void;
  onExportCsv: () => void;
};

function kindLabel(kind: TaskMapCondition["kind"]): string {
  switch (kind) {
    case "chest_tag":
      return "开宝箱";
    case "arrive":
      return "到达地点";
    case "interact_ref":
      return "交互机关(Ref)";
    case "interact_type":
      return "交互机关(Type)";
    case "kill":
      return "杀怪";
    case "skill_or_mastery":
      return "技能/精通";
    default:
      return kind;
  }
}

export function TaskMapCheckPanel({
  config,
  busy,
  error,
  report,
  onRunCheck,
  onExportCsv,
}: TaskMapCheckPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<"all" | "error" | "warn">("all");
  const [keyword, setKeyword] = useState("");

  const filteredIssues = useMemo(() => {
    if (!report) return [];
    const q = keyword.trim().toLowerCase();
    return report.issues.filter((i) => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (!q) return true;
      const hay = [i.taskId, i.taskName, formatIssueDescription(i), formatIssueReason(i)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [report, severityFilter, keyword]);

  const workspaceRoot = config.excelWorkspaceRoot?.trim() ?? "";

  return (
    <div className="task-map-check-panel">
      <div className="task-map-check-header">
        <div>
          <h2 className="task-map-check-title">任务地图检查</h2>
          <p className="task-map-check-lead">
            仅主线（TaskType=3，已排除 TaskID 30000–30035 / 9000001）：到达 / 开宝箱 / 杀怪 /
            技能精通。仅检查洛萨王城（Map202/203/204）与黑帆窟港（Map401/402）；按 GameMode /
            TaskChain / 文案确定具体范围。地图 Tag 按模式矩阵核对 MapData（Hierarchy 导出）；杀怪与技能只验配置表是否存在。
          </p>
        </div>
        <div className="task-map-check-actions">
          <button type="button" className="btn btn-primary" disabled={busy || !workspaceRoot} onClick={onRunCheck}>
            {busy ? "检查中…" : "一键检查"}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!report || report.issues.length === 0}
            onClick={onExportCsv}
          >
            导出 Excel
          </button>
        </div>
      </div>

      <div className="task-map-check-env-card">
        <div className="task-map-check-env-row">
          <span className="task-map-check-env-label">工作区</span>
          <span className="task-map-check-env-value task-map-check-env-value--path">
            {workspaceRoot || "未配置（请在设置中指定 Excel 工作区）"}
          </span>
        </div>
        {report ? (
          <div className="task-map-check-summary-grid">
            <div className="task-map-check-stat">
              <span className="task-map-check-stat-num">{report.summary.taskCount}</span>
              <span className="task-map-check-stat-label">相关任务</span>
            </div>
            <div className="task-map-check-stat">
              <span className="task-map-check-stat-num">{report.summary.conditionCount}</span>
              <span className="task-map-check-stat-label">检查条件</span>
            </div>
            <div className="task-map-check-stat task-map-check-stat--error">
              <span className="task-map-check-stat-num">{report.summary.errorCount}</span>
              <span className="task-map-check-stat-label">错误</span>
            </div>
            <div className="task-map-check-stat task-map-check-stat--warn">
              <span className="task-map-check-stat-num">{report.summary.warnCount}</span>
              <span className="task-map-check-stat-label">警告</span>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="task-map-check-error">{error}</p> : null}

      {report ? (
        <>
          <div className="task-map-check-filters">
            <label className="task-map-check-filter">
              <span>严重级别</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as "all" | "error" | "warn")}
              >
                <option value="all">全部</option>
                <option value="error">错误</option>
                <option value="warn">警告</option>
              </select>
            </label>
            <label className="task-map-check-filter task-map-check-filter--grow">
              <span>搜索</span>
              <input
                type="search"
                value={keyword}
                placeholder="任务 ID、问题描述、原因…"
                onChange={(e) => setKeyword(e.target.value)}
              />
            </label>
          </div>

          <details className="task-map-check-conditions">
            <summary>相关条件（{report.conditions.length}）</summary>
            <ul className="task-map-check-condition-list">
              {report.conditions.slice(0, 120).map((c) => (
                <li key={c.conditionId}>
                  <code>{c.conditionId}</code>
                  <span className="task-map-check-condition-kind">{kindLabel(c.kind)}</span>
                  <span className="task-map-check-condition-tag">目标 {c.targetTag}</span>
                  {c.taskIds[0] ? <span className="task-map-check-condition-task">任务 {c.taskIds[0]}</span> : null}
                  {c.remark ? <span className="task-map-check-condition-remark">{c.remark}</span> : null}
                </li>
              ))}
            </ul>
          </details>

          <div className="task-map-check-table-wrap">
            <table className="task-map-check-table">
              <thead>
                <tr>
                  <th>任务ID</th>
                  <th>问题描述</th>
                  <th>问题原因</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="task-map-check-empty">
                      {report.issues.length === 0 ? "未发现问题" : "无匹配筛选结果"}
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((i, idx) => (
                    <tr key={`${i.conditionId}-${i.mapDataFile}-${idx}`} className={`task-map-check-row--${i.severity}`}>
                      <td>{i.taskId || "—"}</td>
                      <td>{formatIssueDescription(i)}</td>
                      <td>{formatIssueReason(i)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="task-map-check-hint">点击「一键检查」开始扫描当前工作区（仅主线 TaskType=3）。</p>
      )}
    </div>
  );
}
