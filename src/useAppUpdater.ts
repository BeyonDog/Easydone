import { useCallback, useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { checkForAppUpdate, type UpdateOffer } from "./lib/appUpdate";
import { UPDATE_UP_TO_DATE_MESSAGE } from "./lib/updateErrorText";
import { isUpdaterConfigured, updateManifestUrl } from "./lib/updateManifest";

export type UseAppUpdaterOptions = {
  checkOnMount?: boolean;
  /** @deprecated 静默检查失败不再弹 Toast，仅 console.warn */
  onSilentCheckError?: (message: string) => void;
};

export function useAppUpdater(options?: UseAppUpdaterOptions) {
  const checkOnMount = options?.checkOnMount ?? true;
  const [offer, setOffer] = useState<UpdateOffer | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>("…");
  const manifestUrl = updateManifestUrl() ?? "";

  useEffect(() => {
    void getVersion()
      .then(setCurrentVersion)
      .catch(() => setCurrentVersion("—"));
  }, []);

  const runCheck = useCallback(async (silent = false): Promise<string | null> => {
    if (!isUpdaterConfigured()) {
      const msg = "未配置更新地址";
      if (!silent) setStatusMessage(msg);
      return msg;
    }
    setChecking(true);
    if (!silent) setStatusMessage("正在检查更新…");
    try {
      const result = await checkForAppUpdate();
      if (result.kind === "unconfigured") {
        const msg = "未配置更新地址";
        if (!silent) setStatusMessage(msg);
        return msg;
      }
      if (result.kind === "error") {
        const msg = result.message;
        if (silent) {
          console.warn("[easydone] 静默检查更新失败:", msg);
        } else {
          setStatusMessage(msg);
        }
        return msg;
      }
      if (result.kind === "none") {
        const msg = UPDATE_UP_TO_DATE_MESSAGE;
        if (!silent) setStatusMessage(msg);
        setOffer(null);
        setCurrentVersion(result.currentVersion);
        return msg;
      }
      setOffer(result.offer);
      setDismissed(false);
      setCurrentVersion(result.offer.currentVersion);
      const msg = "发现新版本，将显示更新提示";
      if (!silent) setStatusMessage(msg);
      return msg;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!checkOnMount || !isUpdaterConfigured()) return;
    void runCheck(true);
  }, [checkOnMount, runCheck]);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    offer: offer && !dismissed ? offer : null,
    dismiss,
    runCheck,
    checking,
    statusMessage,
    configured: isUpdaterConfigured(),
    currentVersion,
    manifestUrl,
  };
}
