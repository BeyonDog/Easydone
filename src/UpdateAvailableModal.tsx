import { useCallback, useState } from "react";
import type { UpdateOffer } from "./lib/appUpdate";
import { downloadAndInstallUpdate, type DownloadProgress } from "./lib/appUpdate";
import { formatUpdateInstallError, isUpdaterSignatureKeyMismatch } from "./lib/updateErrors";
import {
  MANUAL_INSTALL_DOWNLOAD_URL,
  UPDATER_KEY_MISMATCH_INTRO,
} from "./lib/updateErrorText";

type Props = {
  offer: UpdateOffer;
  onDismiss: () => void;
};

export function UpdateAvailableModal({ offer, onDismiss }: Props) {
  const [progress, setProgress] = useState<DownloadProgress>({
    phase: "idle",
    percent: 0,
    message: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [signatureKeyMismatch, setSignatureKeyMismatch] = useState(false);
  const busy = progress.phase === "downloading" || progress.phase === "installing";

  const notes =
    offer.update.body?.trim() ||
    offer.manifest?.notes?.trim() ||
    "（无更新说明）";

  const install = useCallback(async () => {
    setError(null);
    setSignatureKeyMismatch(false);
    try {
      await downloadAndInstallUpdate(offer, setProgress);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const keyMismatch = isUpdaterSignatureKeyMismatch(raw);
      const msg = formatUpdateInstallError(raw);
      setSignatureKeyMismatch(keyMismatch);
      setError(msg);
      setProgress({ phase: "error", percent: 0, message: msg });
    }
  }, [offer]);

  return (
    <div className="modal-back update-modal-back" role="presentation">
      <div className="modal update-modal modal--sheet" role="dialog" aria-labelledby="update-modal-title">
        <div className="modal-header-row">
          <h2 id="update-modal-title">发现新版本</h2>
          <div className="btn-row">
            <button type="button" className="btn" onClick={onDismiss} disabled={busy}>
              稍后
            </button>
            <button type="button" className="btn primary" onClick={() => void install()} disabled={busy}>
              立即更新
            </button>
          </div>
        </div>
        <div className="modal-scroll-body">
          <dl className="update-meta">
            <div>
              <dt>当前版本</dt>
              <dd>{offer.currentVersion}</dd>
            </div>
            <div>
              <dt>新版本</dt>
              <dd>{offer.update.version}</dd>
            </div>
            <div>
              <dt>安装包大小</dt>
              <dd>{offer.displaySize}</dd>
            </div>
          </dl>
          <div className="field">
            <label>更新说明</label>
            <pre className="update-notes">{notes}</pre>
          </div>
          {busy ? (
            <div className="update-progress" aria-live="polite">
              <div className="update-progress-bar">
                <div className="update-progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="help">{progress.message}</p>
            </div>
          ) : null}
          {error ? (
            signatureKeyMismatch ? (
              <div className="error">
                <p>{UPDATER_KEY_MISMATCH_INTRO}</p>
                <p>
                  <a href={MANUAL_INSTALL_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                    下载完整安装包
                  </a>
                </p>
              </div>
            ) : (
              <div className="error">{error}</div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
