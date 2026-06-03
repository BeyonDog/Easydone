import { invoke } from "@tauri-apps/api/core";
import type { AppConfig } from "../types.ts";
import { parseTaskRowForComplete } from "./completeTask.ts";
import {
  gtopFetchTaskCsvFilePath,
  gtopMakeTempTaskCsv,
  gtopSessionSliceFromConfig,
  gtopUploadTaskCsv,
} from "./gtopClient.ts";
import { patchTaskCsvClearPreTaskIds } from "./gtopTaskCsvPatch.ts";
import { resolveTaskCsvPath } from "./resolveTaskCsv.ts";
import type { SheetMatrix } from "./xlsxHelpers.ts";

export type GtopTaskCsvOpResult = {
  ok: boolean;
  message: string;
  toast: string;
};

export type AcceptTasksViaGtopResult = GtopTaskCsvOpResult & {
  acceptedCount: number;
};

type GtopSessionCheck = {
  ok: true;
  envId: string;
  regionServerId: string;
  slice: ReturnType<typeof gtopSessionSliceFromConfig>;
} | {
  ok: false;
  message: string;
};

function failAccept(message: string, toast = message): AcceptTasksViaGtopResult {
  return { ok: false, message, toast, acceptedCount: 0 };
}

function failOp(message: string, toast = message): GtopTaskCsvOpResult {
  return { ok: false, message, toast };
}

function validateGtopSession(config: AppConfig, gtopLoggedIn: boolean): GtopSessionCheck {
  if (!gtopLoggedIn || !config.gtopCookie.trim()) {
    return { ok: false, message: "请先在设置 → GTOP 接取任务中完成 GTOP 登录" };
  }
  const envId = config.gtopEnvId?.trim() ?? "";
  const regionServerId = config.gtopRegionServerId?.trim() ?? "";
  if (!envId) return { ok: false, message: "请先在 GTOP 设置中选择默认环境" };
  if (!regionServerId) return { ok: false, message: "请先在 GTOP 设置中选择分支环境" };
  return {
    ok: true,
    envId,
    regionServerId,
    slice: gtopSessionSliceFromConfig(config),
  };
}

export async function uploadTaskCsvContentToGtop(args: {
  config: AppConfig;
  envId: string;
  regionServerId: string;
  csvText: string;
}): Promise<GtopTaskCsvOpResult> {
  const slice = gtopSessionSliceFromConfig(args.config);
  try {
    const tempPath = await gtopMakeTempTaskCsv(args.csvText);
    const remoteFilePath = await gtopFetchTaskCsvFilePath(slice, args.envId);
    const upload = await gtopUploadTaskCsv({
      slice,
      envId: args.envId,
      regionServerId: args.regionServerId,
      filePath: remoteFilePath,
      csvFilePath: tempPath,
    });
    if (!upload.ok) {
      return failOp(upload.message || "GTOP 上传失败");
    }
    return { ok: true, message: upload.message, toast: upload.message };
  } catch (e) {
    return failOp(e instanceof Error ? e.message : String(e));
  }
}

function collectSelectedTaskIds(taskAoa: SheetMatrix, selectedDataIdxs: Iterable<number>): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const dataIdx of selectedDataIdxs) {
    const parsed = parseTaskRowForComplete(taskAoa, dataIdx);
    if (!parsed?.taskId) continue;
    if (seen.has(parsed.taskId)) continue;
    seen.add(parsed.taskId);
    ids.push(parsed.taskId);
  }
  return ids;
}

export async function restoreDefaultTaskCsvViaGtop(args: {
  config: AppConfig;
  gtopLoggedIn: boolean;
}): Promise<GtopTaskCsvOpResult> {
  const session = validateGtopSession(args.config, args.gtopLoggedIn);
  if (!session.ok) return failOp(session.message);

  const csvPath = await resolveTaskCsvPath(args.config.excelWorkspaceRoot);
  if (!csvPath) {
    return failOp("未找到工作区 Config/task.csv 或 Config/Task.csv");
  }

  let csvText: string;
  try {
    csvText = await invoke<string>("read_text_file", { path: csvPath });
  } catch (e) {
    return failOp(e instanceof Error ? e.message : String(e));
  }

  const upload = await uploadTaskCsvContentToGtop({
    config: args.config,
    envId: session.envId,
    regionServerId: session.regionServerId,
    csvText,
  });
  if (!upload.ok) return upload;

  const envLabel = args.config.gtopEnvName?.trim() || session.envId;
  const serverLabel = args.config.gtopRegionServerName?.trim() || session.regionServerId;
  const toast = `已恢复默认 task.csv · 环境：${envLabel} · 区服：${serverLabel}`;
  return { ok: true, message: upload.message || toast, toast };
}

export async function acceptTasksViaGtop(args: {
  config: AppConfig;
  gtopLoggedIn: boolean;
  taskAoa: SheetMatrix | null;
  selectedDataIdxs: Iterable<number>;
}): Promise<AcceptTasksViaGtopResult> {
  const session = validateGtopSession(args.config, args.gtopLoggedIn);
  if (!session.ok) return failAccept(session.message);

  if (!args.taskAoa || args.taskAoa.length < 2) {
    return failAccept("当前无任务表数据");
  }

  const taskIds = collectSelectedTaskIds(args.taskAoa, args.selectedDataIdxs);
  if (taskIds.length === 0) {
    return failAccept("请先勾选要接取的任务行");
  }

  const csvPath = await resolveTaskCsvPath(args.config.excelWorkspaceRoot);
  if (!csvPath) {
    return failAccept("未找到工作区 Config/task.csv 或 Config/Task.csv");
  }

  let csvText: string;
  try {
    csvText = await invoke<string>("read_text_file", { path: csvPath });
  } catch (e) {
    return failAccept(e instanceof Error ? e.message : String(e));
  }

  const patched = patchTaskCsvClearPreTaskIds(csvText, new Set(taskIds));
  if (!patched.ok) {
    return failAccept(patched.message);
  }

  const upload = await uploadTaskCsvContentToGtop({
    config: args.config,
    envId: session.envId,
    regionServerId: session.regionServerId,
    csvText: patched.text,
  });

  if (!upload.ok) {
    return failAccept(upload.message, upload.toast);
  }

  const branch = args.config.gtopRegionServerName ?? session.regionServerId;
  const toast = `已接取 ${taskIds.length} 个任务并上传到 ${branch}（已清除 PreTaskID，未修改本地 task.csv）`;
  return {
    ok: true,
    message: upload.message || toast,
    toast,
    acceptedCount: taskIds.length,
  };
}
