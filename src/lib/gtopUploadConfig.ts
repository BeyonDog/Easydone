import type { AppConfig } from "../types.ts";
import {
  gtopFetchConfigCsvFilePath,
  gtopSessionSliceFromConfig,
  gtopUploadConfigCsv,
} from "./gtopClient.ts";
import {
  listModifiedConfigCsvFilenames,
  resolveWorkspacePathsForFilenames,
} from "./gtopModifiedConfigCsv.ts";

export type GtopConfigUploadItemResult = {
  localPath: string;
  csvFilename: string;
  ok: boolean;
  message: string;
};

export type GtopConfigBatchUploadResult = {
  ok: boolean;
  okCount: number;
  failCount: number;
  results: GtopConfigUploadItemResult[];
  toast: string;
};

type GtopSessionCheck =
  | {
      ok: true;
      envId: string;
      regionServerId: string;
      slice: ReturnType<typeof gtopSessionSliceFromConfig>;
    }
  | { ok: false; message: string };

export function validateGtopSession(config: AppConfig, gtopLoggedIn: boolean): GtopSessionCheck {
  if (!gtopLoggedIn || !config.gtopCookie.trim()) {
    return { ok: false, message: "请先在设置 → GTOP 中完成 GTOP 登录" };
  }
  const envId = config.gtopEnvId?.trim() ?? "";
  const regionServerId = config.gtopRegionServerId?.trim() ?? "";
  if (!envId) return { ok: false, message: "默认环境未关联，请刷新 GTOP 环境列表" };
  if (!regionServerId) return { ok: false, message: "请先在 GTOP 设置中选择分支环境" };
  return {
    ok: true,
    envId,
    regionServerId,
    slice: gtopSessionSliceFromConfig(config),
  };
}

function basenameFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function isCsvPath(path: string): boolean {
  return basenameFromPath(path).toLowerCase().endsWith(".csv");
}

/** 按 basename 去重，保留首次出现的路径 */
export function dedupeCsvPathsByBasename(paths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    const base = basenameFromPath(p);
    const key = base.toLowerCase();
    if (!base || !isCsvPath(p) || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function formatFilenameList(names: string[]): string {
  const maxList = 12;
  const listed = names.slice(0, maxList).join("\n");
  const tail = names.length > maxList ? `\n…等共 ${names.length} 个文件` : "";
  return `${listed}${tail}`;
}

export function formatUploadConfirmMessage(args: {
  envLabel: string;
  serverLabel: string;
  localPaths: string[];
}): string {
  const { envLabel, serverLabel, localPaths } = args;
  const names = localPaths.map((p) => basenameFromPath(p));
  const head = `环境：${envLabel}\n区服：${serverLabel}\n待上传：${names.length} 个文件`;
  if (names.length === 1) {
    return `${head}\n\n${localPaths[0]}\n\n将上传到 GTOP 区服配置（不修改本地文件）。\n\n继续？`;
  }
  return `${head}\n\n${formatFilenameList(names)}\n\n将依次上传到 GTOP 区服配置（不修改本地文件）。\n\n继续？`;
}

export function formatRestoreConfirmMessage(args: {
  envLabel: string;
  serverLabel: string;
  filenames: string[];
}): string {
  const { envLabel, serverLabel, filenames } = args;
  const head = `环境：${envLabel}\n区服：${serverLabel}\n待恢复：${filenames.length} 个已改配置`;
  if (filenames.length === 1) {
    return `${head}\n\n${filenames[0]}\n\n将上传工作区 Config 原版覆盖区服配置（不修改本地文件）。\n\n继续？`;
  }
  return `${head}\n\n${formatFilenameList(filenames)}\n\n将依次上传工作区 Config 原版覆盖区服配置（不修改本地文件）。\n\n继续？`;
}

export function formatSingleRestoreConfirmMessage(args: {
  envLabel: string;
  serverLabel: string;
  csvFilename: string;
  localPath: string;
}): string {
  const { envLabel, serverLabel, csvFilename, localPath } = args;
  return `环境：${envLabel}\n区服：${serverLabel}\n文件：${csvFilename}\n本地：${localPath}\n\n将上传工作区 Config 原版覆盖区服配置（不修改本地文件）。\n\n继续？`;
}

function itemResultToBatch(item: GtopConfigUploadItemResult): GtopConfigBatchUploadResult {
  const batch: GtopConfigBatchUploadResult = {
    ok: item.ok,
    okCount: item.ok ? 1 : 0,
    failCount: item.ok ? 0 : 1,
    results: [item],
    toast: "",
  };
  batch.toast = item.ok
    ? `${item.csvFilename}：已恢复默认配置`
    : `${item.csvFilename}：${item.message}`;
  return batch;
}

export function formatBatchUploadToast(result: GtopConfigBatchUploadResult): string {
  const total = result.okCount + result.failCount;
  if (total === 0) {
    return result.toast;
  }
  if (result.failCount === 0) {
    return `已全部上传成功（${result.okCount} 个）`;
  }
  if (result.okCount === 0) {
    return `全部上传失败（${result.failCount} 个）`;
  }
  return `上传完成：成功 ${result.okCount}，失败 ${result.failCount}`;
}

export async function uploadLocalConfigCsvToGtop(args: {
  config: AppConfig;
  gtopLoggedIn: boolean;
  localPath: string;
}): Promise<GtopConfigUploadItemResult> {
  const session = validateGtopSession(args.config, args.gtopLoggedIn);
  const csvFilename = basenameFromPath(args.localPath);
  if (!session.ok) {
    return { localPath: args.localPath, csvFilename, ok: false, message: session.message };
  }
  if (!csvFilename || !isCsvPath(args.localPath)) {
    return { localPath: args.localPath, csvFilename, ok: false, message: "不是有效的 CSV 文件" };
  }

  try {
    const remoteFilePath = await gtopFetchConfigCsvFilePath(
      session.slice,
      session.envId,
      csvFilename,
    );
    const upload = await gtopUploadConfigCsv({
      slice: session.slice,
      envId: session.envId,
      regionServerId: session.regionServerId,
      filePath: remoteFilePath,
      csvLocalPath: args.localPath,
      csvFilename,
    });
    if (!upload.ok) {
      return {
        localPath: args.localPath,
        csvFilename,
        ok: false,
        message: upload.message || "GTOP 上传失败",
      };
    }
    return {
      localPath: args.localPath,
      csvFilename,
      ok: true,
      message: upload.message || "上传成功",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { localPath: args.localPath, csvFilename, ok: false, message };
  }
}

export async function uploadLocalConfigCsvsToGtop(args: {
  config: AppConfig;
  gtopLoggedIn: boolean;
  localPaths: string[];
  onProgress?: (current: number, total: number, csvFilename: string) => void;
}): Promise<GtopConfigBatchUploadResult> {
  const paths = dedupeCsvPathsByBasename(args.localPaths);
  if (paths.length === 0) {
    return {
      ok: false,
      okCount: 0,
      failCount: 0,
      results: [],
      toast: "未选择有效的 CSV 文件",
    };
  }

  const session = validateGtopSession(args.config, args.gtopLoggedIn);
  if (!session.ok) {
    return {
      ok: false,
      okCount: 0,
      failCount: paths.length,
      results: paths.map((localPath) => ({
        localPath,
        csvFilename: basenameFromPath(localPath),
        ok: false,
        message: session.message,
      })),
      toast: session.message,
    };
  }

  const results: GtopConfigUploadItemResult[] = [];
  let okCount = 0;
  let failCount = 0;
  const total = paths.length;

  for (let i = 0; i < paths.length; i++) {
    const localPath = paths[i];
    const csvFilename = basenameFromPath(localPath);
    args.onProgress?.(i + 1, total, csvFilename);
    const item = await uploadLocalConfigCsvToGtop({
      config: args.config,
      gtopLoggedIn: args.gtopLoggedIn,
      localPath,
    });
    results.push(item);
    if (item.ok) okCount += 1;
    else failCount += 1;
  }

  const batch: GtopConfigBatchUploadResult = {
    ok: failCount === 0,
    okCount,
    failCount,
    results,
    toast: "",
  };
  batch.toast = formatBatchUploadToast(batch);
  return batch;
}

export async function restoreModifiedWorkspaceConfigCsvsViaGtop(args: {
  config: AppConfig;
  gtopLoggedIn: boolean;
  onProgress?: (current: number, total: number, csvFilename: string) => void;
}): Promise<GtopConfigBatchUploadResult> {
  const root = args.config.excelWorkspaceRoot?.trim() ?? "";
  if (!root) {
    return {
      ok: false,
      okCount: 0,
      failCount: 0,
      results: [],
      toast: "请先配置 Excel 工作区路径",
    };
  }

  const filenames = listModifiedConfigCsvFilenames(args.config);
  if (filenames.length === 0) {
    return {
      ok: false,
      okCount: 0,
      failCount: 0,
      results: [],
      toast: "当前没有需要恢复的配置 CSV",
    };
  }

  const resolved = await resolveWorkspacePathsForFilenames(root, filenames);
  const missingResults: GtopConfigUploadItemResult[] = resolved.missingFilenames.map(
    (csvFilename) => ({
      localPath: "",
      csvFilename,
      ok: false,
      message: "工作区 Config 目录下未找到对应 CSV",
    }),
  );

  if (resolved.paths.length === 0) {
    const batch: GtopConfigBatchUploadResult = {
      ok: false,
      okCount: 0,
      failCount: missingResults.length,
      results: missingResults,
      toast: "",
    };
    batch.toast = formatBatchUploadToast(batch);
    return batch;
  }

  const uploadBatch = await uploadLocalConfigCsvsToGtop({
    config: args.config,
    gtopLoggedIn: args.gtopLoggedIn,
    localPaths: resolved.paths,
    onProgress: args.onProgress,
  });

  const results = [...missingResults, ...uploadBatch.results];
  const okCount = uploadBatch.okCount;
  const failCount = missingResults.length + uploadBatch.failCount;
  const batch: GtopConfigBatchUploadResult = {
    ok: failCount === 0,
    okCount,
    failCount,
    results,
    toast: "",
  };
  batch.toast = formatBatchUploadToast(batch);
  return batch;
}

export async function restoreSingleModifiedConfigCsvViaGtop(args: {
  config: AppConfig;
  gtopLoggedIn: boolean;
  csvFilename: string;
}): Promise<GtopConfigBatchUploadResult> {
  const root = args.config.excelWorkspaceRoot?.trim() ?? "";
  const csvFilename = args.csvFilename.trim();
  if (!root) {
    return itemResultToBatch({
      localPath: "",
      csvFilename,
      ok: false,
      message: "请先配置 Excel 工作区路径",
    });
  }
  if (!csvFilename) {
    return itemResultToBatch({
      localPath: "",
      csvFilename: "",
      ok: false,
      message: "配置文件名无效",
    });
  }

  const resolved = await resolveWorkspacePathsForFilenames(root, [csvFilename]);
  if (resolved.missingFilenames.length > 0 || resolved.paths.length === 0) {
    return itemResultToBatch({
      localPath: "",
      csvFilename,
      ok: false,
      message: "工作区 Config 目录下未找到对应 CSV",
    });
  }

  const item = await uploadLocalConfigCsvToGtop({
    config: args.config,
    gtopLoggedIn: args.gtopLoggedIn,
    localPath: resolved.paths[0]!,
  });
  return itemResultToBatch(item);
}
