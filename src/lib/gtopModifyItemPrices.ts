import { invoke } from "@tauri-apps/api/core";
import type { AppConfig } from "../types.ts";
import {
  gtopFetchItemCsvFilePath,
  gtopMakeTempItemCsv,
  gtopSessionSliceFromConfig,
  gtopUploadItemCsv,
} from "./gtopClient.ts";
import {
  parseItemPriceCell,
  patchItemCsvPrices,
  readItemPricesFromCsv,
  type ItemPricePatch,
} from "./gtopItemCsvPatch.ts";
import { resolveItemCsvPath } from "./resolveItemCsv.ts";

export type GtopItemPriceOpResult = {
  ok: boolean;
  message: string;
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

function failOp(message: string, toast = message): GtopItemPriceOpResult {
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

function formatPriceChange(label: string, oldVal?: string, newVal?: string): string | null {
  if (newVal === undefined) return null;
  const o = oldVal?.trim() || "空";
  return `${label} ${o}→${newVal}`;
}

export async function uploadItemCsvContentToGtop(args: {
  config: AppConfig;
  envId: string;
  regionServerId: string;
  csvText: string;
}): Promise<GtopItemPriceOpResult> {
  const slice = gtopSessionSliceFromConfig(args.config);
  try {
    const tempPath = await gtopMakeTempItemCsv(args.csvText);
    const remoteFilePath = await gtopFetchItemCsvFilePath(slice, args.envId);
    const upload = await gtopUploadItemCsv({
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

export async function modifyItemPricesViaGtop(args: {
  config: AppConfig;
  gtopLoggedIn: boolean;
  itemId: string;
  changes: ItemPricePatch;
}): Promise<GtopItemPriceOpResult> {
  const session = validateGtopSession(args.config, args.gtopLoggedIn);
  if (!session.ok) return failOp(session.message);

  const csvPath = await resolveItemCsvPath(args.config.excelWorkspaceRoot);
  if (!csvPath) {
    return failOp("未找到工作区 Config/Item.csv 或 Config/item.csv");
  }

  let csvText: string;
  try {
    csvText = await invoke<string>("read_text_file", { path: csvPath });
  } catch (e) {
    return failOp(e instanceof Error ? e.message : String(e));
  }

  const patched = patchItemCsvPrices(csvText, args.itemId, args.changes);
  if (!patched.ok) {
    return failOp(patched.message);
  }

  const upload = await uploadItemCsvContentToGtop({
    config: args.config,
    envId: session.envId,
    regionServerId: session.regionServerId,
    csvText: patched.text,
  });
  if (!upload.ok) return upload;

  const parts = [
    formatPriceChange("BaseValue", patched.oldBaseValue, patched.newBaseValue),
    formatPriceChange("StdPrice", patched.oldStdPrice, patched.newStdPrice),
  ].filter(Boolean);
  const branch = args.config.gtopRegionServerName?.trim() || session.regionServerId;
  const detail = parts.length > 0 ? parts.join("，") : "已更新";
  const toast = `物品 ${args.itemId}：${detail} · 区服 ${branch}（未修改本地 Item.csv）`;
  return { ok: true, message: upload.message || toast, toast };
}

export async function restoreItemDefaultPricesViaGtop(args: {
  config: AppConfig;
  gtopLoggedIn: boolean;
  itemId: string;
}): Promise<GtopItemPriceOpResult> {
  const session = validateGtopSession(args.config, args.gtopLoggedIn);
  if (!session.ok) return failOp(session.message);

  const csvPath = await resolveItemCsvPath(args.config.excelWorkspaceRoot);
  if (!csvPath) {
    return failOp("未找到工作区 Config/Item.csv 或 Config/item.csv");
  }

  let csvText: string;
  try {
    csvText = await invoke<string>("read_text_file", { path: csvPath });
  } catch (e) {
    return failOp(e instanceof Error ? e.message : String(e));
  }

  const idKey = args.itemId.trim();
  const defaults = readItemPricesFromCsv(csvText, idKey);
  if (!defaults) {
    return failOp(`Item.csv 中未找到物品 ID ${idKey}`);
  }

  const baseParsed = parseItemPriceCell(defaults.baseValue, "BaseValue");
  if (!baseParsed.ok) return failOp(baseParsed.message);
  const stdParsed = parseItemPriceCell(defaults.stdPrice, "StdPrice");
  if (!stdParsed.ok) return failOp(stdParsed.message);

  const result = await modifyItemPricesViaGtop({
    config: args.config,
    gtopLoggedIn: args.gtopLoggedIn,
    itemId: idKey,
    changes: { baseValue: baseParsed.value, stdPrice: stdParsed.value },
  });
  if (!result.ok) return result;

  const branch = args.config.gtopRegionServerName?.trim() || session.regionServerId;
  const baseDisplay = defaults.baseValue.trim() || "0";
  const stdDisplay = defaults.stdPrice.trim() || "0";
  const toast = `物品 ${idKey}：已还原默认价格 BaseValue ${baseDisplay}，StdPrice ${stdDisplay} · 区服 ${branch}（未修改本地 Item.csv）`;
  return { ok: true, message: result.message || toast, toast };
}
