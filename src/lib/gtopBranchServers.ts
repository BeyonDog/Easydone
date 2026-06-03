import type { GtopRegionServerEntry } from "./gtopClient.ts";

/** GTOP 设置「分支环境」下拉固定展示项（名称与抓包一致；id 由 API 按名解析） */
export const GTOP_BRANCH_SERVER_ALLOWLIST = [
  "GNG-cvt01",
  "GNG-cvt02",
  "GNG-pt01",
  "GNG-pt02",
  "GNG-rct03",
  "krad-rct01",
  "krad-rct02",
  "krad-sbt01",
  "krad-sbt02",
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
