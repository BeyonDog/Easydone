import { useMemo, useState } from "react";
import type { AppConfig } from "./types.ts";
import type { TagCheckReport } from "./lib/taskMapTagCheck/index.ts";
import { formatIssueDescription, formatIssueReason } from "./lib/taskMapTagCheck/index.ts";

export type TaskIssuesPanelProps = {
  config: AppConfig;
  busy: boolean;
  error: string | null;
  report: TagCheckReport | null;
  onExportCsv: () => void;
};

export function TaskIssuesPanel({ config, busy, error, report, onExportCsv }: TaskIssuesPanelProps) {
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
          <h2 className="task-map-check-title">任务异常</h2>
          <p className="task-map-check-lead">
            启动或 Excel 静默同步后自动检查任务配置（地图检查项 + 缺字段）。此处列出当前全部问题记录。
          </p>
        </div>
        <div className="task-map-check-actions">
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
        {busy ? <p className="task-map-check-hint">正在检查…</p> : null}
        {report ? (
          <div className="task-map-check-summary-grid">
            <div className="task-map-check-stat task-map-check-stat--error">
              <span className="task-map-check-stat-num">{report.summary.errorCount}</span>
              <span className="task-map-check-stat-label">错误</span>
            </div>
            <div className="task-map-check-stat task-map-check-stat--warn">
              <span className="task-map-check-stat-num">{report.summary.warnCount}</span>
              <span className="task-map-check-stat-label">警告</span>
            </div>
            <div className="task-map-check-stat">
              <span className="task-map-check-stat-num">{report.issues.length}</span>
              <span className="task-map-check-stat-label">问题合计</span>
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
                      {report.issues.length === 0 ? "暂无异常" : "无匹配筛选结果"}
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((i, idx) => (
                    <tr key={`${i.taskId}-${i.conditionId}-${i.kind}-${idx}`} className={`task-map-check-row--${i.severity}`}>
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
        <p className="task-map-check-hint">等待自动检查完成，或到「地图检查」手动一键扫描。</p>
      )}
    </div>
  );
}
