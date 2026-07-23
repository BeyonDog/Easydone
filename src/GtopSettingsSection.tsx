import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig } from "./types.ts";
import {
  findGtopEnvByName,
  GTOP_CN_ENV_NAME,
  GTOP_FIXED_ENV_NAME,
  missingGtopBranchServerNames,
  resolveGtopBranchServerOptions,
} from "./lib/gtopBranchServers.ts";
import {
  gtopFetchEnvs,
  gtopFetchRegionServers,
  gtopSessionSliceFromConfig,
  type GtopEnvEntry,
  type GtopRegionServerEntry,
} from "./lib/gtopClient.ts";
import { resolveItemCsvPath } from "./lib/resolveItemCsv.ts";
import { resolveTaskCsvPath } from "./lib/resolveTaskCsv.ts";

export type GtopSettingsSectionProps = {
  config: AppConfig;
  gtopLoggedIn: boolean;
  onPersist: (next: AppConfig) => void | Promise<void>;
  onOpenGtopLogin: () => void;
  onCompleteGtopLogin: () => void;
};

function applyFixedEnvToConfig(
  config: AppConfig,
  env: GtopEnvEntry,
): AppConfig | null {
  const prevId = config.gtopEnvId ?? "";
  if (env.id === prevId && config.gtopEnvName === env.name) return null;
  const envChanged = env.id !== prevId;
  const isCn = config.gmtPlatform === "cn";
  return {
    ...config,
    gtopEnvId: env.id,
    gtopEnvName: env.name,
    ...(isCn
      ? { gtopCnEnvId: env.id, gtopCnEnvName: env.name }
      : { gtopOverseasEnvId: env.id, gtopOverseasEnvName: env.name }),
    ...(envChanged
      ? {
          gtopRegionServerId: null,
          ...(isCn
            ? { gtopCnRegionServerId: null }
            : {
                gtopRegionServerName: null,
                gtopOverseasRegionServerId: null,
                gtopOverseasRegionServerName: null,
              }),
        }
      : {}),
  };
}

export function GtopSettingsSection({
  config,
  gtopLoggedIn,
  onPersist,
  onOpenGtopLogin,
  onCompleteGtopLogin,
}: GtopSettingsSectionProps) {
  const [envs, setEnvs] = useState<GtopEnvEntry[]>([]);
  const [servers, setServers] = useState<GtopRegionServerEntry[]>([]);
  const [taskCsvPath, setTaskCsvPath] = useState<string | null>(null);
  const [itemCsvPath, setItemCsvPath] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixedEnvMissing, setFixedEnvMissing] = useState(false);

  const slice = useMemo(
    () => gtopSessionSliceFromConfig(config),
    [config.gtopBaseUrl, config.gtopCookie, config.gtopProject],
  );
  const platform = config.gmtPlatform;
  const fixedEnvName = platform === "cn" ? GTOP_CN_ENV_NAME : GTOP_FIXED_ENV_NAME;
  const branchServerOptions = useMemo(
    () => resolveGtopBranchServerOptions(servers, platform),
    [platform, servers],
  );
  const missingBranchNames = useMemo(() => missingGtopBranchServerNames(branchServerOptions), [branchServerOptions]);
  const configRef = useRef(config);
  configRef.current = config;

  const fixedEnvResolved = useMemo(
    () => findGtopEnvByName(envs, fixedEnvName),
    [envs, fixedEnvName],
  );
  const fixedEnvLinked =
    Boolean(config.gtopEnvId?.trim()) &&
    (config.gtopEnvName === fixedEnvName ||
      config.gtopEnvId === fixedEnvResolved?.id);

  const syncFixedEnv = useCallback(
    (list: GtopEnvEntry[]) => {
      const fixed = findGtopEnvByName(list, fixedEnvName);
      if (!fixed) {
        setFixedEnvMissing(true);
        return;
      }
      setFixedEnvMissing(false);
      const next = applyFixedEnvToConfig(configRef.current, fixed);
      if (next) void onPersist(next);
    },
    [fixedEnvName, onPersist],
  );

  const refreshServers = useCallback(
    async (envId: string) => {
      if (!envId || !gtopLoggedIn || !config.gtopCookie.trim()) {
        setServers([]);
        return;
      }
      try {
        const list = await gtopFetchRegionServers(slice, envId);
        setServers(list);
        const current = configRef.current;
        if (current.gmtPlatform === "cn" && current.gtopRegionServerName) {
          const target = resolveGtopBranchServerOptions(list, "cn").find(
            (item) => item.name === current.gtopRegionServerName,
          );
          if (target?.id && target.id !== current.gtopRegionServerId) {
            void onPersist({
              ...current,
              gtopRegionServerId: target.id,
              gtopCnRegionServerId: target.id,
              gtopCnRegionServerName: target.name,
            });
          }
        }
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : String(e));
        setServers([]);
      }
    },
    [config.gtopCookie, gtopLoggedIn, onPersist, slice],
  );

  const refreshEnvs = useCallback(async () => {
    if (!gtopLoggedIn || !config.gtopCookie.trim()) {
      setEnvs([]);
      setFixedEnvMissing(false);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    try {
      const list = await gtopFetchEnvs(slice);
      setEnvs(list);
      syncFixedEnv(list);
      const fixed = findGtopEnvByName(list, fixedEnvName);
      if (fixed?.id) await refreshServers(fixed.id);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
      setEnvs([]);
    } finally {
      setLoading(false);
    }
  }, [config.gtopCookie, fixedEnvName, gtopLoggedIn, refreshServers, slice, syncFixedEnv]);

  useEffect(() => {
    void resolveTaskCsvPath(config.excelWorkspaceRoot).then(setTaskCsvPath);
    void resolveItemCsvPath(config.excelWorkspaceRoot).then(setItemCsvPath);
  }, [config.excelWorkspaceRoot]);

  useEffect(() => {
    if (!gtopLoggedIn || !config.gtopCookie.trim()) {
      setEnvs([]);
      setServers([]);
      setFixedEnvMissing(false);
      return;
    }
    let cancelled = false;
    setLoadErr(null);
    void (async () => {
      try {
        const list = await gtopFetchEnvs(slice);
        if (cancelled) return;
        setEnvs(list);
        syncFixedEnv(list);
        const fixed = findGtopEnvByName(list, fixedEnvName);
        if (fixed?.id) await refreshServers(fixed.id);
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : String(e));
          setEnvs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gtopLoggedIn, config.gtopCookie, fixedEnvName, refreshServers, slice, syncFixedEnv]);

  const pickServer = (serverId: string) => {
    const prev = config.gtopRegionServerId ?? "";
    if (serverId === prev) return;
    const opt = branchServerOptions.find((x) => x.id === serverId);
    void onPersist({
      ...config,
      gtopRegionServerId: serverId || null,
      gtopRegionServerName: opt?.name ?? null,
      gtopOverseasRegionServerId: serverId || null,
      gtopOverseasRegionServerName: opt?.name ?? null,
    });
  };

  const fixedEnvHint = !gtopLoggedIn
    ? "登录并刷新环境列表后自动关联"
    : fixedEnvLinked && config.gtopEnvId
      ? `（已关联 ID: ${config.gtopEnvId}）`
      : fixedEnvMissing
        ? "未在 GTOP 环境列表中找到，请点「刷新环境列表」"
        : "正在关联…";

  return (
    <div className="gtop-settings">
      <p className="help">用于上传和还原配置（上传和还原均不修改本地文件）。</p>
      <div className="field">
        <label>本地 task.csv</label>
        <div className="path">{taskCsvPath ?? "未找到（请配置工作区且存在 Config/task.csv 或 Task.csv）"}</div>
      </div>
      <div className="field">
        <label>本地 Item.csv</label>
        <div className="path">{itemCsvPath ?? "未找到（请配置工作区且存在 Config/Item.csv 或 item.csv）"}</div>
      </div>
      <p className={`help${gtopLoggedIn ? " gmt-status--ok" : ""}`}>
        {gtopLoggedIn ? "GTOP 已登录" : "GTOP 未登录"}
      </p>
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => onOpenGtopLogin()}>
          {gtopLoggedIn ? "重新打开 GTOP 登录" : "打开 GTOP 登录"}
        </button>
        <button type="button" className="btn primary" onClick={() => void onCompleteGtopLogin()}>
          完成登录
        </button>
        <button type="button" className="btn" disabled={!gtopLoggedIn || loading} onClick={() => void refreshEnvs()}>
          刷新环境列表
        </button>
      </div>
      <div className="field">
        <label>默认环境</label>
        <div className="path">
          {fixedEnvName}
          <span className="muted" style={{ marginLeft: "0.35rem" }}>
            {fixedEnvHint}
          </span>
        </div>
      </div>
      <div className="field">
        <label>分支环境</label>
        <select
          className="gmt-select"
          disabled={platform === "cn" || !gtopLoggedIn || !config.gtopEnvId}
          value={config.gtopRegionServerId ?? ""}
          onChange={(e) => pickServer(e.target.value)}
        >
          <option value="">请选择</option>
          {branchServerOptions.map((s) => (
            <option key={s.name} value={s.id ?? ""} disabled={!s.id}>
              {s.displayName}
              {!s.id ? "（未在 GTOP 中找到）" : ""}
            </option>
          ))}
        </select>
      </div>
      {platform === "cn" ? <p className="help">国服区服跟随顶栏服务器选择。</p> : null}
      {fixedEnvMissing && gtopLoggedIn ? (
        <div className="error">GTOP 未找到环境：{fixedEnvName}</div>
      ) : null}
      {missingBranchNames.length > 0 ? (
        <div className="error">GTOP 缺少区服：{missingBranchNames.join("、")}</div>
      ) : null}
      {loadErr ? <div className="error">{loadErr}</div> : null}
    </div>
  );
}
