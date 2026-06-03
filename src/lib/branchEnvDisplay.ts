/** 分支环境下拉固定展示顺序（字面量含空格差异，勿自动规范化） */
export const BRANCH_ENV_DISPLAY_ORDER: readonly string[] = [
  "(GRPC) pt02",
  "(GRPC)pt01",
  "(GRPC) cvt02",
  "(GRPC) cvt01",
  "(GSGCI) rct01",
  "(GSGCI) sbt",
  "(GRPC) rct03",
  "(GRPC)CCS",
  "(GRPC) sbt02",
  "(GRPC) sbt01",
  "(GRPC) rct02",
  "(GRPC) rct01",
] as const;

type BranchGroup = "GRPC" | "GSGCI";

type BranchEnvSpec = {
  display: string;
  group: BranchGroup;
  /** 短码，大小写不敏感匹配 */
  code: string;
};

const BRANCH_ENV_SPECS: BranchEnvSpec[] = BRANCH_ENV_DISPLAY_ORDER.map((display) => {
  const gsgci = display.includes("GSGCI");
  const group: BranchGroup = gsgci ? "GSGCI" : "GRPC";
  const inner = display.replace(/^\((GRPC|GSGCI)\)\s*/i, "").trim();
  const code = inner.toLowerCase();
  return { display, group, code };
});

/** GMT 环境 id → 展示名（API 名无法区分时手工填写） */
export const GMT_ENV_ID_DISPLAY_OVERRIDES: Record<number, string> = {};

export type BranchEnvEntry = { id: string | number; name: string; protocol?: number | null };

/** GMT envs/list protocol：1=GSGCI，2=GRPC（见 HAR envs/list） */
export function branchGroupFromProtocol(protocol?: number | null): BranchGroup | null {
  if (protocol === 1) return "GSGCI";
  if (protocol === 2) return "GRPC";
  return null;
}

function displayLabelForPendingItem(item: BranchEnvEntry, specs: BranchEnvSpec[]): string {
  const group = branchGroupFromProtocol(item.protocol);
  if (group) {
    const match = specs.find((s) => s.group === group);
    if (match) return match.display;
  }
  return specs[0]?.display ?? item.name;
}

function assignPendingGroupLabels<T extends BranchEnvEntry>(
  group: T[],
  specs: BranchEnvSpec[],
  map: Map<string, string>,
): void {
  const allHaveProtocol = group.every((item) => branchGroupFromProtocol(item.protocol) != null);
  if (allHaveProtocol && group.length === specs.length) {
    for (const item of group) {
      map.set(entryIdKey(item.id), displayLabelForPendingItem(item, specs));
    }
    return;
  }
  group.sort((a, b) => compareBranchEnvIds(a.id, b.id));
  group.forEach((item, i) => {
    map.set(entryIdKey(item.id), specs[i]?.display ?? item.name);
  });
}

function normalizeApiName(name: string): string {
  return name.trim().toLowerCase();
}

function nameHasGroup(norm: string, group: BranchGroup): boolean {
  if (group === "GSGCI") return norm.includes("gsgci");
  return norm.includes("grpc");
}

function extractShortCode(norm: string): string | null {
  for (const spec of BRANCH_ENV_SPECS) {
    const code = spec.code;
    if (norm === code || norm.endsWith(`-${code}`) || norm.endsWith(`_${code}`) || norm.endsWith(`/${code}`)) {
      return code;
    }
    const re = new RegExp(`(^|[^a-z0-9])${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    if (re.test(norm)) return code;
  }
  return null;
}

function specForName(name: string): BranchEnvSpec | null {
  const norm = normalizeApiName(name);
  const code = extractShortCode(norm);
  if (!code) return null;

  const candidates = BRANCH_ENV_SPECS.filter((s) => s.code === code);
  if (candidates.length === 1) return candidates[0]!;

  if (code === "rct01") {
    if (nameHasGroup(norm, "GSGCI")) {
      return candidates.find((s) => s.group === "GSGCI") ?? null;
    }
    if (nameHasGroup(norm, "GRPC")) {
      return candidates.find((s) => s.group === "GRPC") ?? null;
    }
    return null;
  }

  const withGroup = candidates.filter((s) => nameHasGroup(norm, s.group));
  if (withGroup.length === 1) return withGroup[0]!;
  if (withGroup.length > 1) return withGroup[0]!;

  const nonGsgci = candidates.filter((s) => s.group === "GRPC");
  if (!norm.includes("gsgci") && nonGsgci.length === 1) return nonGsgci[0]!;

  return candidates[0] ?? null;
}

export function getBranchEnvDisplayLabel(
  name: string,
  id?: string | number,
): string | null {
  if (id != null && typeof id === "number" && GMT_ENV_ID_DISPLAY_OVERRIDES[id]) {
    return GMT_ENV_ID_DISPLAY_OVERRIDES[id]!;
  }
  return specForName(name)?.display ?? null;
}

function entryIdKey(id: string | number): string {
  return String(id);
}

function compareBranchEnvIds(a: string | number, b: string | number): number {
  const na = typeof a === "number" ? a : Number(a);
  const nb = typeof b === "number" ? b : Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return entryIdKey(a).localeCompare(entryIdKey(b));
}

function specsForCode(code: string): BranchEnvSpec[] {
  return BRANCH_ENV_SPECS.filter((s) => s.code === code);
}

/** 列表级展示名：解决多条 API name 同为裸短码（如两个 rct01）无法单条匹配的问题 */
export function buildBranchEnvDisplayLabelMap<T extends BranchEnvEntry>(items: T[]): Map<string, string> {
  const map = new Map<string, string>();
  const pending = new Map<string, T[]>();

  for (const item of items) {
    const key = entryIdKey(item.id);
    const direct = getBranchEnvDisplayLabel(item.name, item.id);
    if (direct) {
      map.set(key, direct);
      continue;
    }
    const code = extractShortCode(normalizeApiName(item.name));
    if (!code) {
      map.set(key, item.name);
      continue;
    }
    const specs = specsForCode(code);
    if (specs.length <= 1) {
      map.set(key, specs[0]?.display ?? item.name);
      continue;
    }
    const list = pending.get(code) ?? [];
    list.push(item);
    pending.set(code, list);
  }

  for (const [, group] of pending) {
    const code = group[0] ? extractShortCode(normalizeApiName(group[0].name)) : null;
    const specs = code ? specsForCode(code) : [];
    assignPendingGroupLabels(group, specs, map);
  }

  return map;
}

function displayIndexFromLabel(label: string): number {
  return BRANCH_ENV_DISPLAY_ORDER.indexOf(label);
}

export function branchEnvDisplayIndex(
  name: string,
  id?: string | number,
  labelMap?: Map<string, string> | null,
): number {
  const label =
    id != null && labelMap?.has(entryIdKey(id))
      ? labelMap.get(entryIdKey(id))!
      : getBranchEnvDisplayLabel(name, id);
  if (!label) return -1;
  return displayIndexFromLabel(label);
}

export function sortBranchEnvEntries<T extends BranchEnvEntry>(items: T[]): T[] {
  const labelMap = buildBranchEnvDisplayLabelMap(items);
  const indexed = items.map((item, apiOrder) => ({
    item,
    apiOrder,
    sortIndex: branchEnvDisplayIndex(item.name, item.id, labelMap),
  }));
  indexed.sort((a, b) => {
    const ai = a.sortIndex;
    const bi = b.sortIndex;
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.apiOrder - b.apiOrder;
  });
  return indexed.map((x) => x.item);
}

export function formatBranchEnvOptionLabel(
  name: string,
  id?: string | number,
  labelMap?: Map<string, string> | null,
): string {
  if (id != null && labelMap?.has(entryIdKey(id))) {
    return labelMap.get(entryIdKey(id))!;
  }
  return getBranchEnvDisplayLabel(name, id) ?? name;
}

/** GMT exec 失败信息：双 rct01 / 未注册命令等场景友好提示 */
export function formatGmtExecErrorMessage(
  raw: string,
  displayLabel?: string,
  envId?: number | null,
): string {
  const text = raw.trim();
  if (
    text.includes("DoesNotExist") &&
    text.includes("Command matching query")
  ) {
    const idPart = envId != null ? `，env id=${envId}` : "";
    const branch = displayLabel ? `（当前：${displayLabel}${idPart}）` : idPart ? `（${idPart.slice(2)}）` : "";
    let switchHint = "";
    if (displayLabel === "(GRPC) rct01") {
      switchHint = " 可尝试切换为 (GSGCI) rct01。";
    } else if (displayLabel === "(GSGCI) rct01") {
      switchHint = " 可尝试切换为 (GRPC) rct01。";
    }
    return `当前分支环境可能未注册 AdminSendMail，请确认选择了正确的 (GRPC)/(GSGCI) 分支${branch}。${switchHint}原始错误：${text}`;
  }
  return text;
}
