import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig } from "./types.ts";
import {
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

  const slice = gtopSessionSliceFromConfig(config);
  const branchServerOptions = useMemo(() => resolveGtopBranchServerOptions(servers), [servers]);
  const missingBranchNames = useMemo(() => missingGtopBranchServerNames(branchServerOptions), [branchServerOptions]);
  const envIdRef = useRef(config.gtopEnvId);
  envIdRef.current = config.gtopEnvId;

  const refreshServers = useCallback(
    async (envId: string) => {
      if (!envId || !gtopLoggedIn || !config.gtopCookie.trim()) {
        setServers([]);
        return;
      }
      try {
        const list = await gtopFetchRegionServers(slice, envId);
        setServers(list);
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : String(e));
        setServers([]);
      }
    },
    [config.gtopCookie, gtopLoggedIn, slice],
  );

  const refreshEnvs = useCallback(async () => {
    if (!gtopLoggedIn || !config.gtopCookie.trim()) {
      setEnvs([]);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    try {
      const list = await gtopFetchEnvs(slice);
      setEnvs(list);
      const envId = envIdRef.current?.trim() ?? "";
      if (envId) await refreshServers(envId);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
      setEnvs([]);
    } finally {
      setLoading(false);
    }
  }, [config.gtopCookie, gtopLoggedIn, refreshServers, slice]);

  useEffect(() => {
    void resolveTaskCsvPath(config.excelWorkspaceRoot).then(setTaskCsvPath);
    void resolveItemCsvPath(config.excelWorkspaceRoot).then(setItemCsvPath);
  }, [config.excelWorkspaceRoot]);

  useEffect(() => {
    if (!gtopLoggedIn || !config.gtopCookie.trim()) {
      setEnvs([]);
      setServers([]);
      return;
    }
    let cancelled = false;
    setLoadErr(null);
    void (async () => {
      try {
        const list = await gtopFetchEnvs(slice);
        if (cancelled) return;
        setEnvs(list);
        const envId = envIdRef.current?.trim() ?? "";
        if (envId) await refreshServers(envId);
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
  }, [gtopLoggedIn, config.gtopCookie, refreshServers, slice]);

  const pickEnv = (envId: string) => {
    const prev = config.gtopEnvId ?? "";
    if (envId === prev) return;
    const env = envs.find((e) => e.id === envId);
    void onPersist({
      ...config,
      gtopEnvId: envId || null,
      gtopEnvName: env?.name ?? null,
      gtopRegionServerId: null,
      gtopRegionServerName: null,
    });
    void refreshServers(envId);
  };

  const pickServer = (serverId: string) => {
    const prev = config.gtopRegionServerId ?? "";
    if (serverId === prev) return;
    const opt = branchServerOptions.find((x) => x.id === serverId);
    void onPersist({
      ...config,
      gtopRegionServerId: serverId || null,
      gtopRegionServerName: opt?.name ?? null,
    });
  };

  return (
    <div className="gtop-settings">
      <p className="help">
        用于任务表 GTOP 接取、道具表「修改价格」「还原默认价格」，以及 Chip 条「恢复默认 task.csv」：读取工作区 Config 下 CSV 上传到区服（不修改本地文件）。
      </p>
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
        <select
          className="gmt-select"
          disabled={!gtopLoggedIn || envs.length === 0}
          value={config.gtopEnvId ?? ""}
          onChange={(e) => pickEnv(e.target.value)}
        >
          <option value="">请选择</option>
          {envs.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>分支环境</label>
        <select
          className="gmt-select"
          disabled={!gtopLoggedIn || !config.gtopEnvId}
          value={config.gtopRegionServerId ?? ""}
          onChange={(e) => pickServer(e.target.value)}
        >
          <option value="">请选择</option>
          {branchServerOptions.map((s) => (
            <option key={s.name} value={s.id ?? ""} disabled={!s.id}>
              {s.name}
              {!s.id ? "（未在 GTOP 中找到）" : ""}
            </option>
          ))}
        </select>
      </div>
      {missingBranchNames.length > 0 ? (
        <div className="error">GTOP 缺少区服：{missingBranchNames.join("、")}</div>
      ) : null}
      {loadErr ? <div className="error">{loadErr}</div> : null}
    </div>
  );
}
