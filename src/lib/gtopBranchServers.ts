import type { GtopEnvEntry, GtopRegionServerEntry } from "./gtopClient.ts";

/** GTOP 设置固定默认环境（只读，不可由用户切换） */
export const GTOP_FIXED_ENV_NAME = "krad-office内网测试环境";

export function findGtopEnvByName(
  envs: GtopEnvEntry[],
  name: string = GTOP_FIXED_ENV_NAME,
): GtopEnvEntry | undefined {
  const norm = name.trim();
  const exact = envs.find((e) => e.name.trim() === norm);
  if (exact) return exact;
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
  "kd-cn-rct01",
  "kd-cn-rct02",
  "kd-cn-sbt01",
] as const;

export type GtopBranchServerOption = {
  name: string;
  id: string | null;
};

/** 按白名单顺序从 API 区服列表解析 id；未匹配项 id 为 null */
export function resolveGtopBranchServerOptions(
  servers: GtopRegionServerEntry[],
): GtopBranchServerOption[] {
  const byName = new Map(servers.map((s) => [s.name.trim(), s.id]));
  return GTOP_BRANCH_SERVER_ALLOWLIST.map((name) => ({
    name,
    id: byName.get(name) ?? null,
  }));
}

export function missingGtopBranchServerNames(options: GtopBranchServerOption[]): string[] {
  return options.filter((o) => o.id == null).map((o) => o.name);
}
