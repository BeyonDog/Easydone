export type GmtEnvEntryLike = { id: number; name: string };

export type GmtEnvSlice = {
  gmtEnvId: number | null;
  gmtEnvName: string | null;
};

export type GmtEnvHealAction =
  | { kind: "none" }
  | {
      kind: "persist";
      next: GmtEnvSlice;
      toast?: string;
    };

/** 登录后根据 env 列表修正/清理歧义或失效的分支环境配置 */
export function healGmtEnvConfig(cfg: GmtEnvSlice, envs: GmtEnvEntryLike[]): GmtEnvHealAction {
  if (cfg.gmtEnvId != null) {
    const found = envs.find((e) => e.id === cfg.gmtEnvId);
    if (!found) {
      return {
        kind: "persist",
        next: { gmtEnvId: null, gmtEnvName: null },
        toast: "分支环境已失效，请重新选择",
      };
    }
    if (cfg.gmtEnvName !== found.name) {
      return {
        kind: "persist",
        next: { gmtEnvId: found.id, gmtEnvName: found.name },
      };
    }
    return { kind: "none" };
  }

  const name = cfg.gmtEnvName?.trim();
  if (!name) return { kind: "none" };

  const matches = envs.filter((x) => x.name === name);
  if (matches.length === 1) {
    return {
      kind: "persist",
      next: { gmtEnvId: matches[0]!.id, gmtEnvName: matches[0]!.name },
    };
  }
  if (matches.length > 1) {
    return {
      kind: "persist",
      next: { gmtEnvId: null, gmtEnvName: null },
      toast: "存在多个同名分支环境，请从下拉重新选择",
    };
  }
  return { kind: "none" };
}
