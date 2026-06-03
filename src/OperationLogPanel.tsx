import type { OperationLogEntry } from "./lib/operationLog";
import { formatGmtItemLine, formatOperationDateTime, outcomeLabel } from "./lib/operationLog";

export interface OperationLogPanelProps {
  entries: OperationLogEntry[];
  onClear: () => void;
}

export function OperationLogPanel({ entries, onClear }: OperationLogPanelProps) {
  return (
    <div className="op-log-panel" onClick={(e) => e.stopPropagation()}>
      <div className="op-log-panel-head">
        <span>操作日志（本会话 · {entries.length} 条）</span>
        <button type="button" className="btn btn-tiny" onClick={() => onClear()}>
          清空
        </button>
      </div>
      <div className="op-log-panel-body">
        {entries.length === 0 ? (
          <p className="help muted">暂无操作记录</p>
        ) : (
          entries.map((e) =>
            e.gmt ? (
              <div key={e.id} className={`op-log-entry op-log-gmt-card op-log-entry--${e.outcome}`}>
                <div className="op-log-gmt-head">
                  <span className={`op-log-badge op-log-badge--${e.outcome}`}>{outcomeLabel(e.outcome)}</span>
                  <span className="op-log-action">{e.action}</span>
                  <span className="op-log-time">{formatOperationDateTime(e.at)}</span>
                </div>
                <dl className="op-log-gmt-fields">
                  <div>
                    <dt>环境</dt>
                    <dd>{e.gmt.envName}</dd>
                  </div>
                  <div>
                    <dt>账户</dt>
                    <dd>{e.gmt.accountId}</dd>
                  </div>
                  <div className="op-log-gmt-items-row">
                    <dt>发放的道具</dt>
                    <dd>
                      {e.gmt.items.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <ul className="op-log-gmt-items">
                          {e.gmt.items.map((it) => (
                            <li key={`${it.itemId}-${it.qty}-${it.label ?? ""}`}>{formatGmtItemLine(it)}</li>
                          ))}
                        </ul>
                      )}
                    </dd>
                  </div>
                </dl>
                {e.message ? <p className="op-log-message">{e.message}</p> : null}
              </div>
            ) : (
              <div key={e.id} className={`op-log-entry op-log-entry--${e.outcome}`}>
                <div className="op-log-generic-head">
                  <span className={`op-log-badge op-log-badge--${e.outcome}`}>{outcomeLabel(e.outcome)}</span>
                  <span className="op-log-action">{e.action}</span>
                  {e.context ? <span className="op-log-context">{e.context}</span> : null}
                  <span className="op-log-time">{formatOperationDateTime(e.at)}</span>
                </div>
                {e.detail ? <span className="op-log-detail">{e.detail}</span> : null}
                <span className="op-log-message">{e.message}</span>
                {e.extra ? <pre className="op-log-extra">{e.extra}</pre> : null}
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
