import type { AppConfig, GtopModifiedConfigCsvState } from "../types.ts";
import { listConfigCsvFiles } from "./gtopClient.ts";

export type GtopModifiedConfigContext = {
  workspaceRoot: string;
  envId: string;
  regionServerId: string;
};

export type ResolveWorkspacePathsResult = {
  paths: string[];
  missingFilenames: string[];
};

function basenameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

export function gtopModifiedConfigContext(config: AppConfig): GtopModifiedConfigContext {
  return {
    workspaceRoot: config.excelWorkspaceRoot?.trim() ?? "",
    envId: config.gtopEnvId?.trim() ?? "",
    regionServerId: config.gtopRegionServerId?.trim() ?? "",
  };
}

export function contextsMatch(
  a: GtopModifiedConfigContext,
  b: GtopModifiedConfigContext,
): boolean {
  return (
    a.workspaceRoot === b.workspaceRoot &&
    a.envId === b.envId &&
    a.regionServerId === b.regionServerId &&
    a.workspaceRoot !== "" &&
    a.envId !== "" &&
    a.regionServerId !== ""
  );
}

function stateForContext(
  config: AppConfig,
  ctx: GtopModifiedConfigContext,
): GtopModifiedConfigCsvState {
  const stored = config.gtopModifiedConfigCsv;
  if (stored && contextsMatch(stored, ctx)) {
    return {
      workspaceRoot: ctx.workspaceRoot,
      envId: ctx.envId,
      regionServerId: ctx.regionServerId,
      filenames: [...stored.filenames],
    };
  }
  return {
    workspaceRoot: ctx.workspaceRoot,
    envId: ctx.envId,
    regionServerId: ctx.regionServerId,
    filenames: [],
  };
}

export function listModifiedConfigCsvFilenames(config: AppConfig): string[] {
  const ctx = gtopModifiedConfigContext(config);
  if (!ctx.workspaceRoot || !ctx.envId || !ctx.regionServerId) return [];
  return stateForContext(config, ctx).filenames;
}

function appendFilename(filenames: string[], csvFilename: string): string[] {
  const name = csvFilename.trim();
  if (!name) return filenames;
  const key = name.toLowerCase();
  if (filenames.some((f) => f.toLowerCase() === key)) return filenames;
  return [...filenames, name];
}

export function markModifiedConfigCsv(config: AppConfig, csvFilename: string): AppConfig {
  const ctx = gtopModifiedConfigContext(config);
  if (!ctx.workspaceRoot || !ctx.envId || !ctx.regionServerId) return config;
  const state = stateForContext(config, ctx);
  const filenames = appendFilename(state.filenames, csvFilename);
  if (filenames.length === state.filenames.length) return config;
  return {
    ...config,
    gtopModifiedConfigCsv: { ...state, filenames },
  };
}

export function markModifiedConfigCsvBatch(
  config: AppConfig,
  csvFilenames: Iterable<string>,
): AppConfig {
  let next = config;
  for (const name of csvFilenames) {
    next = markModifiedConfigCsv(next, name);
  }
  return next;
}

export function clearModifiedConfigCsv(config: AppConfig, csvFilename: string): AppConfig {
  const ctx = gtopModifiedConfigContext(config);
  if (!ctx.workspaceRoot || !ctx.envId || !ctx.regionServerId) return config;
  const state = stateForContext(config, ctx);
  const key = csvFilename.trim().toLowerCase();
  if (!key) return config;
  const filenames = state.filenames.filter((f) => f.toLowerCase() !== key);
  if (filenames.length === state.filenames.length) return config;
  return {
    ...config,
    gtopModifiedConfigCsv:
      filenames.length > 0 ? { ...state, filenames } : null,
  };
}

export function clearModifiedConfigCsvBatch(
  config: AppConfig,
  csvFilenames: Iterable<string>,
): AppConfig {
  let next = config;
  for (const name of csvFilenames) {
    next = clearModifiedConfigCsv(next, name);
  }
  return next;
}

export function matchFilenamesToConfigPaths(
  configPaths: string[],
  filenames: string[],
): ResolveWorkspacePathsResult {
  const byBasename = new Map<string, string>();
  for (const p of configPaths) {
    const base = basenameFromPath(p);
    if (!base) continue;
    const key = base.toLowerCase();
    if (!byBasename.has(key)) byBasename.set(key, p);
  }

  const paths: string[] = [];
  const missingFilenames: string[] = [];
  const seen = new Set<string>();

  for (const name of filenames) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const path = byBasename.get(key);
    if (path) paths.push(path);
    else missingFilenames.push(name);
  }

  return { paths, missingFilenames };
}

export async function resolveWorkspacePathsForFilenames(
  workspaceRoot: string,
  filenames: string[],
): Promise<ResolveWorkspacePathsResult> {
  const root = workspaceRoot.trim();
  if (!root || filenames.length === 0) {
    return { paths: [], missingFilenames: [...filenames] };
  }

  let configPaths: string[];
  try {
    configPaths = await listConfigCsvFiles(root);
  } catch {
    return { paths: [], missingFilenames: [...filenames] };
  }

  return matchFilenamesToConfigPaths(configPaths, filenames);
}
