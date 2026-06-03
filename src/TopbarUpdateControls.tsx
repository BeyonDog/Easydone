export type TopbarUpdateControlsProps = {
  currentVersion: string;
  configured: boolean;
  checking: boolean;
  onCheck: () => void | Promise<void>;
};

export function TopbarUpdateControls({
  currentVersion,
  configured,
  checking,
  onCheck,
}: TopbarUpdateControlsProps) {
  const versionLabel =
    currentVersion && currentVersion !== "—" ? `v${currentVersion}` : currentVersion;

  return (
    <>
      <span className="topbar-version" title="当前应用版本">
        {versionLabel}
      </span>
      <button
        type="button"
        className="btn btn-tiny"
        disabled={!configured || checking}
        title={configured ? "从内网更新服务器检查新版本" : "未配置更新地址"}
        onClick={() => void onCheck()}
      >
        {checking ? "检查中…" : "检查更新"}
      </button>
    </>
  );
}
