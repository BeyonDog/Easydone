import {
  CN_GMT_BASE_URL,
  DEFAULT_GMT_BASE_URL,
  isPreliveGmtEnabled,
  PRELIVE_GMT_BASE_URL,
  PRELIVE_GMT_ENV,
  type GmtSessionSlice,
} from "./gmtClient.ts";

export type GmtLoginTarget = "overseas" | "cn" | "prelive";

export type GmtCookieConfig = {
  gmtPlatform?: "overseas" | "cn";
  gmtPreliveEnabled?: boolean;
  gmtBaseUrl?: string;
  gmtCookie?: string;
  gmtCnCookie?: string;
  gmtPreliveCookie?: string;
  gmtEnvId?: number | null;
};

export function gmtLoginTargetFromConfig(c: {
  gmtPlatform?: "overseas" | "cn";
  gmtPreliveEnabled?: boolean;
}): GmtLoginTarget {
  if (c.gmtPlatform === "cn") return "cn";
  if (isPreliveGmtEnabled(c)) return "prelive";
  return "overseas";
}

export function gmtLoginTargetLabel(target: GmtLoginTarget): string {
  switch (target) {
    case "cn":
      return "国服";
    case "prelive":
      return "海外(PR)";
    default:
      return "海外";
  }
}

export function gmtBaseUrlForTarget(target: GmtLoginTarget, gmtBaseUrl?: string): string {
  switch (target) {
    case "cn":
      return CN_GMT_BASE_URL;
    case "prelive":
      return PRELIVE_GMT_BASE_URL;
    default:
      return gmtBaseUrl?.trim() || DEFAULT_GMT_BASE_URL;
  }
}

export function gmtCookieForTarget(c: GmtCookieConfig, target: GmtLoginTarget): string {
  switch (target) {
    case "cn":
      return c.gmtCnCookie ?? "";
    case "prelive":
      return c.gmtPreliveCookie ?? "";
    default:
      return c.gmtCookie ?? "";
  }
}

export function applyGmtLoginCookie<T extends GmtCookieConfig>(c: T, target: GmtLoginTarget, cookie: string): T {
  switch (target) {
    case "cn":
      return { ...c, gmtCnCookie: cookie };
    case "prelive":
      return { ...c, gmtPreliveCookie: cookie };
    default:
      return { ...c, gmtCookie: cookie };
  }
}

export function gmtSessionSliceForTarget(c: GmtCookieConfig, target: GmtLoginTarget): GmtSessionSlice {
  const gmtCookie = gmtCookieForTarget(c, target);
  switch (target) {
    case "cn":
      return {
        gmtBaseUrl: CN_GMT_BASE_URL,
        gmtCookie,
        gmtEnvId: c.gmtEnvId ?? null,
      };
    case "prelive":
      return {
        gmtBaseUrl: PRELIVE_GMT_BASE_URL,
        gmtCookie,
        gmtEnvId: c.gmtEnvId ?? PRELIVE_GMT_ENV.id,
      };
    default:
      return {
        gmtBaseUrl: c.gmtBaseUrl?.trim() || DEFAULT_GMT_BASE_URL,
        gmtCookie,
        gmtEnvId: c.gmtEnvId ?? null,
      };
  }
}

/** 设置页登录态探测：只验证 SSO Cookie，不带顶栏 env 头。 */
export function gmtLoginProbeSliceForTarget(c: GmtCookieConfig, target: GmtLoginTarget): GmtSessionSlice {
  const session = gmtSessionSliceForTarget(c, target);
  return {
    gmtBaseUrl: session.gmtBaseUrl,
    gmtCookie: session.gmtCookie,
    gmtEnvId: null,
  };
}

export function gmtSessionSliceFromConfig(c: GmtCookieConfig & {
  gmtPlatform?: "overseas" | "cn";
  gmtPreliveEnabled?: boolean;
}): GmtSessionSlice {
  return gmtSessionSliceForTarget(c, gmtLoginTargetFromConfig(c));
}
