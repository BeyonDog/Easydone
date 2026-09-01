import { invoke } from "@tauri-apps/api/core";
import {
  buildAdminAddExpExecBody,
  buildAdminClearTimeoutMatchInfoExecBody,
  buildAdminFinishTaskExecBody,
  buildAdminModifyRankPointsExecBody,
  buildAdminSendGlobalMailExecBody,
  buildAdminSendMailExecBody,
  buildAddSproutScoreExecBody,
  type AdminAddExpBuildInput,
  type AdminClearTimeoutMatchInfoBuildInput,
  type AdminModifyRankPointsBuildInput,
  type AddSproutScoreBuildInput,
  type AdminFinishTaskBuildInput,
  type AdminSendGlobalMailBuildInput,
  type AdminSendMailBuildInput,
} from "./gmtApi.contract.ts";

export const DEFAULT_GMT_BASE_URL = "https://test-krad.stdgmtool.web.garena.cn";
export const CN_GMT_BASE_URL = "https://test-gngcnprod.stdgmtool.web.garena.cn";
export const PRELIVE_GMT_BASE_URL = "https://pre-krad.stdgmtool.web.garena.cn";

export function isPreliveGmtEnabled(c: {
  gmtPlatform?: "overseas" | "cn";
  gmtPreliveEnabled?: boolean;
}): boolean {
  return c.gmtPlatform !== "cn" && Boolean(c.gmtPreliveEnabled);
}

/** `gmt_exec` 成功且为 AdminAddExp 时服务端可能返回结构化结果（Rust camelCase）。 */
export type AdminAddExpInvokeResultPayload = {
  levelBefore: number;
  levelAfter: number;
  expBefore: number;
  expAfter: number;
};

export type GmtExecInvokeResult = {
  ok: boolean;
  message: string;
  addExpResult?: AdminAddExpInvokeResultPayload | null;
};

export type GmtEnvEntry = { id: number; name: string; protocol?: number | null };

/** Overseas PreLive（PR）模式下允许选择的 GMT 区服名；id 以 pre-krad 接口为准。 */
export const PRELIVE_GMT_ENV_NAMES = [
  "iOS-REVIEW",
  "KOL-US",
  "KOL-SG",
  "ACT-VN",
  "ACT-TH",
  "ACT-BR",
  "REVIEW",
  "ACT-US",
  "WeTest",
  "ACT-ID",
  "PreLive-US",
  "PreLive-SG",
] as const;

const PRELIVE_GMT_ENV_NAME_SET = new Set<string>(PRELIVE_GMT_ENV_NAMES);

/** 开启 PR 时的默认区服（名单内且 historically 写死 id=2）。 */
export const PRELIVE_GMT_ENV: GmtEnvEntry = { id: 2, name: "PreLive-SG", protocol: 2 };

export function isPreliveGmtEnvName(name: string | null | undefined): boolean {
  const trimmed = name?.trim();
  return Boolean(trimmed && PRELIVE_GMT_ENV_NAME_SET.has(trimmed));
}

/** 按 PR 名单过滤 GMT 环境；顺序与 {@link PRELIVE_GMT_ENV_NAMES} 一致。 */
export function filterPreliveGmtEnvs(envs: GmtEnvEntry[]): GmtEnvEntry[] {
  const byName = new Map<string, GmtEnvEntry>();
  for (const env of envs) {
    const name = env.name?.trim();
    if (!name || !PRELIVE_GMT_ENV_NAME_SET.has(name)) continue;
    if (!byName.has(name)) byName.set(name, env);
  }
  const ordered: GmtEnvEntry[] = [];
  for (const name of PRELIVE_GMT_ENV_NAMES) {
    const hit = byName.get(name);
    if (hit) ordered.push(hit);
  }
  return ordered;
}

/** PR 开启时 GTOP 不可用；供操作入口统一拦截。 */
export function gtopBlockedByPreliveMessage(gmtEnvName?: string | null): string {
  const name = gmtEnvName?.trim();
  return name
    ? `当前 GMT 为 PR 区服（${name}），GTOP 不能对该区服操作`
    : "当前为 PR 区服，GTOP 不能对该区服操作";
}

export type GmtSessionSlice = {
  gmtBaseUrl: string;
  gmtCookie: string;
  gmtEnvId: number | null;
};

export async function gmtSessionProbe(slice: GmtSessionSlice): Promise<{ loggedIn: boolean; message: string }> {
  return invoke<{ loggedIn: boolean; message: string }>("gmt_session_probe", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
  });
}

export async function gmtFetchEnvs(slice: GmtSessionSlice): Promise<GmtEnvEntry[]> {
  return invoke<GmtEnvEntry[]>("gmt_fetch_envs", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
  });
}

export async function gmtExecAdminSendGlobalMail(
  slice: GmtSessionSlice,
  input: AdminSendGlobalMailBuildInput,
): Promise<GmtExecInvokeResult> {
  const body = buildAdminSendGlobalMailExecBody(input);
  return invoke<GmtExecInvokeResult>("gmt_exec", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
    bodyJson: JSON.stringify(body),
  });
}

export async function gmtExecAdminSendMail(
  slice: GmtSessionSlice,
  input: AdminSendMailBuildInput,
): Promise<GmtExecInvokeResult> {
  const body = buildAdminSendMailExecBody(input);
  return invoke<GmtExecInvokeResult>("gmt_exec", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
    bodyJson: JSON.stringify(body),
  });
}

export async function gmtExecAdminFinishTask(
  slice: GmtSessionSlice,
  input: AdminFinishTaskBuildInput,
): Promise<GmtExecInvokeResult> {
  const body = buildAdminFinishTaskExecBody(input);
  return invoke<GmtExecInvokeResult>("gmt_exec", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
    bodyJson: JSON.stringify(body),
  });
}

export async function gmtExecAdminAddExp(
  slice: GmtSessionSlice,
  input: AdminAddExpBuildInput,
): Promise<GmtExecInvokeResult> {
  const body = buildAdminAddExpExecBody(input);
  return invoke<GmtExecInvokeResult>("gmt_exec", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
    bodyJson: JSON.stringify(body),
  });
}

export async function gmtExecAdminClearTimeoutMatchInfo(
  slice: GmtSessionSlice,
  input: AdminClearTimeoutMatchInfoBuildInput,
): Promise<GmtExecInvokeResult> {
  const body = buildAdminClearTimeoutMatchInfoExecBody(input);
  return invoke<GmtExecInvokeResult>("gmt_exec", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
    bodyJson: JSON.stringify(body),
  });
}

export async function gmtExecAddSproutScore(
  slice: GmtSessionSlice,
  input: AddSproutScoreBuildInput,
): Promise<GmtExecInvokeResult> {
  const body = buildAddSproutScoreExecBody(input);
  return invoke<GmtExecInvokeResult>("gmt_exec", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
    bodyJson: JSON.stringify(body),
  });
}

export async function gmtExecAdminModifyRankPoints(
  slice: GmtSessionSlice,
  input: AdminModifyRankPointsBuildInput,
): Promise<GmtExecInvokeResult> {
  const body = buildAdminModifyRankPointsExecBody(input);
  return invoke<GmtExecInvokeResult>("gmt_exec", {
    baseUrl: slice.gmtBaseUrl.trim() || DEFAULT_GMT_BASE_URL,
    cookie: slice.gmtCookie,
    envHeader: slice.gmtEnvId != null ? String(slice.gmtEnvId) : null,
    bodyJson: JSON.stringify(body),
  });
}

export async function gmtOpenLoginWindow(baseUrl: string): Promise<void> {
  await invoke("gmt_open_login_window", {
    baseUrl: baseUrl.trim() || DEFAULT_GMT_BASE_URL,
  });
}

export async function gmtCollectLoginCookies(): Promise<string> {
  return invoke<string>("gmt_collect_login_cookies");
}

export async function gmtCloseLoginWindow(): Promise<void> {
  await invoke("gmt_close_login_window");
}

export function gmtSessionSliceFromConfig(c: {
  gmtPlatform?: "overseas" | "cn";
  gmtPreliveEnabled?: boolean;
  gmtBaseUrl?: string;
  gmtCookie?: string;
  gmtCnCookie?: string;
  gmtEnvId?: number | null;
}): GmtSessionSlice {
  const isCn = c.gmtPlatform === "cn";
  if (isCn) {
    return {
      gmtBaseUrl: CN_GMT_BASE_URL,
      gmtCookie: c.gmtCnCookie ?? "",
      gmtEnvId: c.gmtEnvId ?? null,
    };
  }
  if (isPreliveGmtEnabled(c)) {
    return {
      gmtBaseUrl: PRELIVE_GMT_BASE_URL,
      gmtCookie: c.gmtCookie ?? "",
      gmtEnvId: c.gmtEnvId ?? PRELIVE_GMT_ENV.id,
    };
  }
  return {
    gmtBaseUrl: c.gmtBaseUrl?.trim() || DEFAULT_GMT_BASE_URL,
    gmtCookie: c.gmtCookie ?? "",
    gmtEnvId: c.gmtEnvId ?? null,
  };
}
