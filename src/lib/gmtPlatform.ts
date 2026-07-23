import { PRELIVE_GMT_ENV, type GmtEnvEntry } from "./gmtClient.ts";

export type GmtPlatform = "overseas" | "cn";

export const CN_GTOP_ENV_NAME = "krad-外网测试环境";

export const CN_GMT_ENV_OPTIONS: GmtEnvEntry[] = [
  { id: 7, name: "CNRCT02", protocol: 2 },
  { id: 6, name: "CNRCT01", protocol: 2 },
  { id: 3, name: "CNSBT", protocol: 2 },
];

const CN_GTOP_SERVER_BY_GMT_NAME: Record<string, string> = {
  CNRCT02: "CN-rct02",
  CNRCT01: "CN-rct01",
  CNSBT: "CN-sbt",
};

export type PlatformSelectionConfig = {
  gmtPlatform: GmtPlatform;
  gmtPreliveEnabled?: boolean;
  gmtEnvId: number | null;
  gmtEnvName: string | null;
  gmtOverseasEnvId: number | null;
  gmtOverseasEnvName: string | null;
  gmtCnEnvId: number | null;
  gmtCnEnvName: string | null;
  gtopEnvId: string | null;
  gtopEnvName: string | null;
  gtopRegionServerId: string | null;
  gtopRegionServerName: string | null;
  gtopOverseasEnvId: string | null;
  gtopOverseasEnvName: string | null;
  gtopOverseasRegionServerId: string | null;
  gtopOverseasRegionServerName: string | null;
  gtopCnEnvId: string | null;
  gtopCnEnvName: string | null;
  gtopCnRegionServerId: string | null;
  gtopCnRegionServerName: string | null;
};

export function switchGmtPlatform<T extends PlatformSelectionConfig>(
  config: T,
  target: GmtPlatform,
): T {
  if (config.gmtPlatform === target) return config;

  const sourceSnapshot =
    config.gmtPlatform === "cn"
      ? {
          gmtCnEnvId: config.gmtEnvId,
          gmtCnEnvName: config.gmtEnvName,
          gtopCnEnvId: config.gtopEnvId,
          gtopCnEnvName: config.gtopEnvName,
          gtopCnRegionServerId: config.gtopRegionServerId,
          gtopCnRegionServerName: config.gtopRegionServerName,
        }
      : {
          gmtOverseasEnvId:
            config.gmtEnvName === PRELIVE_GMT_ENV.name
              ? config.gmtOverseasEnvId
              : config.gmtEnvId,
          gmtOverseasEnvName:
            config.gmtEnvName === PRELIVE_GMT_ENV.name
              ? config.gmtOverseasEnvName
              : config.gmtEnvName,
          gtopOverseasEnvId: config.gtopEnvId,
          gtopOverseasEnvName: config.gtopEnvName,
          gtopOverseasRegionServerId: config.gtopRegionServerId,
          gtopOverseasRegionServerName: config.gtopRegionServerName,
        };

  const targetSelection =
    target === "cn"
      ? {
          gmtEnvId: config.gmtCnEnvId,
          gmtEnvName: config.gmtCnEnvName,
          gtopEnvId: config.gtopCnEnvId,
          gtopEnvName: config.gtopCnEnvName ?? CN_GTOP_ENV_NAME,
          gtopRegionServerId: config.gtopCnRegionServerId,
          gtopRegionServerName: config.gtopCnRegionServerName,
        }
      : {
          gmtEnvId: config.gmtOverseasEnvId,
          gmtEnvName: config.gmtOverseasEnvName,
          gtopEnvId: config.gtopOverseasEnvId,
          gtopEnvName: config.gtopOverseasEnvName,
          gtopRegionServerId: config.gtopOverseasRegionServerId,
          gtopRegionServerName: config.gtopOverseasRegionServerName,
        };

  return {
    ...config,
    ...sourceSnapshot,
    ...targetSelection,
    gmtPlatform: target,
    gmtPreliveEnabled: false,
  };
}

/** 海外 PreLive（PR）开关：开启时锁定 PreLive-SG，关闭时恢复上次海外分支。 */
export function setGmtPreliveEnabled<T extends PlatformSelectionConfig>(
  config: T,
  enabled: boolean,
): T {
  if (config.gmtPlatform === "cn") {
    return { ...config, gmtPreliveEnabled: false };
  }
  if (Boolean(config.gmtPreliveEnabled) === enabled) return config;

  if (enabled) {
    const snapId =
      config.gmtEnvName === PRELIVE_GMT_ENV.name ? config.gmtOverseasEnvId : config.gmtEnvId;
    const snapName =
      config.gmtEnvName === PRELIVE_GMT_ENV.name ? config.gmtOverseasEnvName : config.gmtEnvName;
    return {
      ...config,
      gmtPreliveEnabled: true,
      gmtOverseasEnvId: snapId,
      gmtOverseasEnvName: snapName,
      gmtEnvId: PRELIVE_GMT_ENV.id,
      gmtEnvName: PRELIVE_GMT_ENV.name,
    };
  }

  return {
    ...config,
    gmtPreliveEnabled: false,
    gmtEnvId: config.gmtOverseasEnvId,
    gmtEnvName: config.gmtOverseasEnvName,
  };
}

export function selectCnServer<T extends PlatformSelectionConfig>(
  config: T,
  gmtEnvName: string,
): T {
  const env = CN_GMT_ENV_OPTIONS.find((item) => item.name === gmtEnvName);
  const gtopServerName = CN_GTOP_SERVER_BY_GMT_NAME[gmtEnvName];
  if (!env || !gtopServerName) return config;

  return {
    ...config,
    gmtEnvId: env.id,
    gmtEnvName: env.name,
    gmtCnEnvId: env.id,
    gmtCnEnvName: env.name,
    gtopEnvId: null,
    gtopEnvName: CN_GTOP_ENV_NAME,
    gtopRegionServerId: null,
    gtopRegionServerName: gtopServerName,
    gtopCnEnvId: null,
    gtopCnEnvName: CN_GTOP_ENV_NAME,
    gtopCnRegionServerId: null,
    gtopCnRegionServerName: gtopServerName,
  };
}

export function gmtRequestRegions(config: {
  gmtPlatform?: GmtPlatform;
  gmtLockRegion?: string;
  gmtNotiRegion?: string;
}): { lockRegion: string; notiRegion: string } {
  if (config.gmtPlatform === "cn") {
    return { lockRegion: "CN", notiRegion: "CN" };
  }
  return {
    lockRegion: config.gmtLockRegion?.trim() || "SG",
    notiRegion: config.gmtNotiRegion?.trim() || "SG",
  };
}
