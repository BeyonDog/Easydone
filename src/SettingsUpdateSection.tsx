type Props = {
  configured: boolean;
  checking: boolean;
  statusMessage: string | null;
  currentVersion: string;
  manifestUrl: string;
  onCheck: () => void;
};

export function SettingsUpdateSection({
  configured,
  checking,
  statusMessage,
  currentVersion,
  manifestUrl,
  onCheck,
}: Props) {
  const statusLooksLikeError =
    statusMessage != null &&
    (/失败|无法|不正确|缺少|未配置|不是 JSON/.test(statusMessage) ||
      statusMessage.includes("latest.json"));

  return (
    <div className="field settings-update-field">
      <label>应用更新</label>
      <p className="help">
        {configured
          ? "从内网更新服务器检查新版本；发现更新时可一键安装并重启。"
          : "未配置更新地址，请联系管理员重新安装带内网更新功能的版本。"}
      </p>
      <dl className="settings-update-meta">
        <div>
          <dt>本机版本</dt>
          <dd>{currentVersion}</dd>
        </div>
        {manifestUrl ? (
          <div>
            <dt>更新清单</dt>
            <dd className="settings-update-url">
              <a href={manifestUrl} target="_blank" rel="noreferrer">
                {manifestUrl}
              </a>
            </dd>
            <dd className="help settings-update-url-hint">
              可在浏览器打开上述地址，应看到 JSON（含 version 与 platforms）。若显示 404 或网页列表，说明发版机尚未发布或更新 HTTP 未运行。
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="btn-row" style={{ marginTop: "0.35rem" }}>
        <button type="button" className="btn" disabled={!configured || checking} onClick={onCheck}>
          {checking ? "检查中…" : "检查更新"}
        </button>
      </div>
      {statusMessage ? (
        <p
          className={`help settings-update-status${statusLooksLikeError ? " settings-update-status--err" : ""}`}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
