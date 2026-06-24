import type { AppConfig } from "./types.ts";

export type UploadConfigPanelProps = {
  config: AppConfig;
  gtopLoggedIn: boolean;
  busy: boolean;
  progressText: string | null;
  modifiedFilenames: string[];
  restoringFilename: string | null;
  onPickAndUpload: () => void;
  onRestoreSingle: (csvFilename: string) => void;
  onOpenSettings?: () => void;
};

export function UploadConfigPanel({
  config,
  gtopLoggedIn,
  busy,
  progressText,
  modifiedFilenames,
  restoringFilename,
  onPickAndUpload,
  onRestoreSingle,
  onOpenSettings,
}: UploadConfigPanelProps) {
  const envLabel = config.gtopEnvName?.trim() || config.gtopEnvId?.trim() || "未配置";
  const serverLabel =
    config.gtopRegionServerName?.trim() || config.gtopRegionServerId?.trim() || "未配置";
  const workspaceRoot = config.excelWorkspaceRoot?.trim() ?? "";

  const gtopReady =
    gtopLoggedIn &&
    Boolean(config.gtopEnvId?.trim()) &&
    Boolean(config.gtopRegionServerId?.trim());

  return (
    <div className="upload-config-panel">
      <h2 className="upload-config-panel-title">上传配置</h2>
      <p className="upload-config-panel-lead">
        选择本地 CSV 上传到当前 GTOP 区服；手动上传成功后会记入修改历史。可在历史中逐条
        <strong>恢复默认配置</strong>（上传工作区{" "}
        <code className="upload-config-inline-code">Config/</code> 原版），不会修改本地文件。
      </p>

      <div className="upload-config-env-card">
        <div className="upload-config-env-row">
          <span className="upload-config-env-label">GTOP 环境</span>
          <span className="upload-config-env-value">{envLabel}</span>
        </div>
        <div className="upload-config-env-row">
          <span className="upload-config-env-label">分支区服</span>
          <span className="upload-config-env-value">{serverLabel}</span>
        </div>
        <div className="upload-config-env-row">
          <span className="upload-config-env-label">工作区</span>
          <span className="upload-config-env-value upload-config-env-value--path">
            {workspaceRoot || "未配置"}
          </span>
        </div>
        {!gtopReady ? (
          <p className="upload-config-hint upload-config-hint--warn">
            请先在设置中完成 GTOP 登录，并选择默认环境与分支环境。
            {onOpenSettings ? (
              <>
                {" "}
                <button type="button" className="btn btn-linkish" onClick={onOpenSettings}>
                  打开设置
                </button>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="upload-config-actions">
        <button
          type="button"
          className="btn"
          disabled={busy || !gtopReady}
          onClick={onPickAndUpload}
        >
          {busy && !restoringFilename ? "上传中…" : "选择 CSV 并上传"}
        </button>
      </div>

      {progressText ? (
        <p className="upload-config-progress" role="status">
          {progressText}
        </p>
      ) : null}

      <div className="upload-config-section">
        <h3 className="upload-config-section-title">修改历史</h3>
        {modifiedFilenames.length === 0 ? (
          <p className="upload-config-hint">暂无修改记录</p>
        ) : (
          <ul className="upload-config-history-list">
            {modifiedFilenames.map((name) => {
              const isRestoring = restoringFilename?.toLowerCase() === name.toLowerCase();
              return (
                <li key={name} className="upload-config-history-row">
                  <span className="upload-config-file-name">{name}</span>
                  <button
                    type="button"
                    className="btn btn-tiny"
                    disabled={busy || !gtopReady}
                    onClick={() => onRestoreSingle(name)}
                  >
                    {isRestoring ? "恢复中…" : "恢复默认配置"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
