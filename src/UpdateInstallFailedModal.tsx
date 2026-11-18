type Props = {
  message: string;
  onDismiss: () => void;
};

export function UpdateInstallFailedModal({ message, onDismiss }: Props) {
  const installerMatch = /(https?:\/\/\S+)/.exec(message);
  const installerUrl = installerMatch?.[1] ?? null;

  return (
    <div className="modal-back update-modal-back" role="presentation">
      <div className="modal update-modal modal--sheet" role="dialog" aria-labelledby="update-failed-title">
        <div className="modal-header-row">
          <h2 id="update-failed-title">更新未成功覆盖安装</h2>
          <div className="btn-row">
            <button type="button" className="btn primary" onClick={onDismiss}>
              知道了
            </button>
          </div>
        </div>
        <div className="modal-scroll-body">
          <div className="error">
            <p>{message}</p>
            {installerUrl ? (
              <p>
                <a href={installerUrl} target="_blank" rel="noreferrer">
                  下载安装包
                </a>
              </p>
            ) : null}
          </div>
          <p className="help">
            Windows 更新依赖安装程序覆盖本地 exe。请先关闭全部 easydone 进程，允许 UAC，再手动安装带版本号的安装包。
          </p>
        </div>
      </div>
    </div>
  );
}
