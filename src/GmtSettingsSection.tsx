import { useCallback, useEffect, useRef, useState } from "react";
import type { AppConfig } from "./types.ts";
import {
  gmtBaseUrlForTarget,
  gmtCookieForTarget,
  gmtLoginProbeSliceForTarget,
  gmtLoginTargetLabel,
  type GmtLoginTarget,
} from "./lib/gmtLoginTarget.ts";
import { gmtSessionProbe } from "./lib/gmtClient.ts";

const GMT_LOGIN_TARGETS: GmtLoginTarget[] = ["overseas", "cn", "prelive"];

export type GmtSettingsSectionProps = {
  config: AppConfig;
  currentLoginTarget: GmtLoginTarget;
  onOpenGmtLogin: (target: GmtLoginTarget) => void;
  onCompleteGmtLogin: (target: GmtLoginTarget) => void | Promise<void>;
};

export function GmtSettingsSection({
  config,
  currentLoginTarget,
  onOpenGmtLogin,
  onCompleteGmtLogin,
}: GmtSettingsSectionProps) {
  const [loggedInByTarget, setLoggedInByTarget] = useState<Record<GmtLoginTarget, boolean | null>>({
    overseas: null,
    cn: null,
    prelive: null,
  });
  const [checkingByTarget, setCheckingByTarget] = useState<Record<GmtLoginTarget, boolean>>({
    overseas: false,
    cn: false,
    prelive: false,
  });
  const requestIdByTargetRef = useRef<Record<GmtLoginTarget, number>>({
    overseas: 0,
    cn: 0,
    prelive: 0,
  });
  const configRef = useRef(config);
  configRef.current = config;

  const probeTarget = useCallback(async (target: GmtLoginTarget) => {
    const requestId = ++requestIdByTargetRef.current[target];
    setCheckingByTarget((prev) => ({ ...prev, [target]: true }));
    try {
      const slice = gmtLoginProbeSliceForTarget(configRef.current, target);
      if (!slice.gmtCookie.trim()) {
        if (requestId === requestIdByTargetRef.current[target]) {
          setLoggedInByTarget((prev) => ({ ...prev, [target]: false }));
        }
        return;
      }
      const r = await gmtSessionProbe(slice);
      if (requestId === requestIdByTargetRef.current[target]) {
        setLoggedInByTarget((prev) => ({ ...prev, [target]: r.loggedIn }));
      }
    } catch {
      if (requestId === requestIdByTargetRef.current[target]) {
        setLoggedInByTarget((prev) => ({ ...prev, [target]: false }));
      }
    } finally {
      if (requestId === requestIdByTargetRef.current[target]) {
        setCheckingByTarget((prev) => ({ ...prev, [target]: false }));
      }
    }
  }, []);

  const probeAll = useCallback(() => {
    for (const target of GMT_LOGIN_TARGETS) {
      void probeTarget(target);
    }
  }, [probeTarget]);

  useEffect(() => {
    probeAll();
  }, [
    config.gmtCookie,
    config.gmtCnCookie,
    config.gmtPreliveCookie,
    config.gmtBaseUrl,
    probeAll,
  ]);

  return (
    <div className="gmt-settings">
      <p className="help">
        可为国服、海外、海外(PR) 分别登录并缓存 Cookie。切换顶栏平台时会自动使用对应账号，互不影响。
      </p>
      {GMT_LOGIN_TARGETS.map((target) => {
        const label = gmtLoginTargetLabel(target);
        const checking = checkingByTarget[target];
        const loggedIn = loggedInByTarget[target];
        const hasCookie = Boolean(gmtCookieForTarget(config, target).trim());
        const isCurrent = currentLoginTarget === target;
        const statusText = checking
          ? "检查中…"
          : loggedIn === true
            ? "已登录"
            : loggedIn === false
              ? hasCookie
                ? "未登录或已过期"
                : "未登录"
              : "—";
        return (
          <div key={target} className="field gmt-settings-row">
            <label>
              GMT {label}
              {isCurrent ? <span className="muted">（当前顶栏）</span> : null}
            </label>
            <p className={`help${loggedIn ? " gmt-status--ok" : ""}`}>{statusText}</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => onOpenGmtLogin(target)}>
                {loggedIn ? "重新打开登录" : "打开登录"}
              </button>
              <button type="button" className="btn primary" onClick={() => void onCompleteGmtLogin(target)}>
                完成登录
              </button>
              <button type="button" className="btn" disabled={checking} onClick={() => void probeTarget(target)}>
                检查状态
              </button>
            </div>
            <p className="help muted">{gmtBaseUrlForTarget(target, config.gmtBaseUrl)}</p>
          </div>
        );
      })}
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => probeAll()}>
          刷新全部状态
        </button>
      </div>
    </div>
  );
}
