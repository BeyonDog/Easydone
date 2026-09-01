import type { GtopEnvEntry, GtopRegionServerEntry } from "./gtopClient.ts";

/** GTOP 设置固定默认环境（只读，不可由用户切换） */
export const GTOP_FIXED_ENV_NAME = "krad-office内网测试环境";
export const GTOP_CN_ENV_NAME = "krad-外网测试环境";

export function findGtopEnvByName(
  envs: GtopEnvEntry[],
  name: string = GTOP_FIXED_ENV_NAME,
): GtopEnvEntry | undefined {
  const norm = name.trim();
  const exact = envs.find((e) => e.name.trim() === norm);
  if (exact) return exact;
  if (norm !== GTOP_FIXED_ENV_NAME) return undefined;
  return envs.find(
    (e) => e.name.includes("krad-office") && e.name.includes("内网测试"),
  );
}

/** GTOP 设置「分支环境」下拉固定展示项（名称与抓包一致；id 由 API 按名解析） */
export const GTOP_BRANCH_SERVER_ALLOWLIST = [
  "GNG-cvt01",
  "GNG-cvt02",
  "GNG-pt01",
  "GNG-pt02",
  "GNG-rct03",
  "GNG-rct04",
  "GNG-rct05",
  "krad-rct01",
  "krad-rct02",
  "krad-sbt01",
  "krad-sbt02",
  "kd-cn-rct02",
  "kd-cn-rct01",
  "kd-cn-sbt01",
] as const;

const GTOP_CN_BRANCH_SERVERS = [
  { name: "CN-rct02", displayName: "(GRPC) CNRCT02" },
  { name: "CN-rct01", displayName: "(GRPC) CNRCT01" },
  { name: "CN-sbt", displayName: "(GRPC) CNSBT" },
] as const;

export type GtopBranchServerOption = {
  /** GTOP API 原始名称，用于保存配置与解析 id */
  name: string;
  displayName: string;
  id: string | null;
};

/** 按白名单顺序从 API 区服列表解析 id；未匹配项 id 为 null */
export function resolveGtopBranchServerOptions(
  servers: GtopRegionServerEntry[],
  platform: "overseas" | "cn" = "overseas",
): GtopBranchServerOption[] {
  const byName = new Map(servers.map((s) => [s.name.trim(), s.id]));
  const specs =
    platform === "cn"
      ? GTOP_CN_BRANCH_SERVERS
      : GTOP_BRANCH_SERVER_ALLOWLIST.map((name) => ({ name, displayName: name }));
  return specs.map(({ name, displayName }) => ({
    name,
    displayName,
    id: byName.get(name) ?? null,
  }));
}

export function missingGtopBranchServerNames(options: GtopBranchServerOption[]): string[] {
  return options.filter((o) => o.id == null).map((o) => o.displayName);
}

function extractOverseasGmtToken(envName: string): string | null {
  const norm = envName.trim().toLowerCase();
  if (!norm) return null;
  // Accept formats like "rct01", "grpc-rct01", "GSGCI_rct01", "gsgci/rct01".
  const parts = norm.match(/[a-z0-9]+/g) ?? [];
  return parts.find((p) =>
    [
      "pt01",
      "pt02",
      "cvt01",
      "cvt02",
      "rct01",
      "rct02",
      "rct03",
      "rct04",
      "rct05",
      "sbt",
      "sbt01",
      "sbt02",
      "kd-cn-rct01",
      "kd-cn-rct02",
      "kd-cn-sbt01",
      "ccs",
    ].includes(p),
  ) ?? null;
}

/**
 * Map overseas GMT branch environment name to the GTOP "region server" api name.
 *
 * - Returns `null` when there is no mapping (e.g. CCS).
 * - `protocol` is used to disambiguate ambiguous "sbt" between GSGCI/GRPC.
 */
export function mapOverseasGmtEnvToGtopRegionServerName(
  envName: string,
  protocol?: number | null,
): string | null {
  const norm = envName.trim().toLowerCase();
  if (!norm) return null;

  if (/(^|[^a-z0-9])ccs([^a-z0-9]|$)/.test(norm)) return null;

  // kd-cn-* hosts map to themselves.
  if (norm.includes("kd-cn-rct01")) return "kd-cn-rct01";
  if (norm.includes("kd-cn-rct02")) return "kd-cn-rct02";
  if (norm.includes("kd-cn-sbt01")) return "kd-cn-sbt01";

  const token = extractOverseasGmtToken(envName);
  switch (token) {
    case "pt01":
      return "GNG-pt01";
    case "pt02":
      return "GNG-pt02";
    case "cvt01":
      return "GNG-cvt01";
    case "cvt02":
      return "GNG-cvt02";
    case "rct03":
      return "GNG-rct03";
    case "rct04":
      return "GNG-rct04";
    case "rct05":
      return "GNG-rct05";
    case "rct01":
      // Both GRPC/GSGCI rct01 map to the same GTOP host.
      return "krad-rct01";
    case "rct02":
      return "krad-rct02";
    case "sbt":
      // HAR protocol: 1=GSGCI, 2=GRPC
      if (protocol === 1) return "krad-sbt01";
      if (protocol === 2) return "krad-sbt02";
      return null;
    case "sbt01":
      return "krad-sbt01";
    case "sbt02":
      return "krad-sbt02";
    default:
      return null;
  }
}
