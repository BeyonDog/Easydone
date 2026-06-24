import { invoke } from "@tauri-apps/api/core";

export const DEFAULT_GTOP_BASE_URL = "https://gtop.gre.garenanow.com";
export const DEFAULT_GTOP_PROJECT = "GNG";

export type GtopEnvEntry = { id: string; name: string };
export type GtopRegionServerEntry = { id: string; name: string };

export type GtopSessionSlice = {
  gtopBaseUrl: string;
  gtopCookie: string;
  gtopProject: string;
};

export type GtopUploadResult = { ok: boolean; message: string };

export async function gtopSessionProbe(
  slice: GtopSessionSlice,
): Promise<{ loggedIn: boolean; message: string }> {
  return invoke("gtop_session_probe", {
    baseUrl: slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: slice.gtopCookie,
    project: slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
  });
}

export async function gtopFetchEnvs(slice: GtopSessionSlice): Promise<GtopEnvEntry[]> {
  return invoke("gtop_fetch_envs", {
    baseUrl: slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: slice.gtopCookie,
    project: slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
  });
}

export async function gtopFetchRegionServers(
  slice: GtopSessionSlice,
  envId: string,
): Promise<GtopRegionServerEntry[]> {
  return invoke("gtop_fetch_region_servers", {
    baseUrl: slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: slice.gtopCookie,
    project: slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
    envId,
  });
}

export async function gtopFetchTaskCsvFilePath(
  slice: GtopSessionSlice,
  envId: string,
): Promise<string> {
  return invoke("gtop_fetch_task_csv_file_path", {
    baseUrl: slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: slice.gtopCookie,
    project: slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
    envId,
  });
}

export async function gtopFetchItemCsvFilePath(
  slice: GtopSessionSlice,
  envId: string,
): Promise<string> {
  return invoke("gtop_fetch_item_csv_file_path", {
    baseUrl: slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: slice.gtopCookie,
    project: slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
    envId,
  });
}

export async function gtopUploadTaskCsv(args: {
  slice: GtopSessionSlice;
  envId: string;
  regionServerId: string;
  filePath: string;
  csvFilePath: string;
}): Promise<GtopUploadResult> {
  return invoke("gtop_upload_task_csv", {
    baseUrl: args.slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: args.slice.gtopCookie,
    project: args.slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
    envId: args.envId,
    regionServerId: args.regionServerId,
    filePath: args.filePath,
    csvFilePath: args.csvFilePath,
  });
}

export async function gtopMakeTempTaskCsv(patchedUtf8: string): Promise<string> {
  return invoke("gtop_make_temp_task_csv", { patchedUtf8 });
}

export async function gtopUploadItemCsv(args: {
  slice: GtopSessionSlice;
  envId: string;
  regionServerId: string;
  filePath: string;
  csvFilePath: string;
}): Promise<GtopUploadResult> {
  return invoke("gtop_upload_item_csv", {
    baseUrl: args.slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: args.slice.gtopCookie,
    project: args.slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
    envId: args.envId,
    regionServerId: args.regionServerId,
    filePath: args.filePath,
    csvFilePath: args.csvFilePath,
  });
}

export async function gtopMakeTempItemCsv(patchedUtf8: string): Promise<string> {
  return invoke("gtop_make_temp_item_csv", { patchedUtf8 });
}

export async function gtopFetchConfigCsvFilePath(
  slice: GtopSessionSlice,
  envId: string,
  csvFilename: string,
): Promise<string> {
  return invoke("gtop_fetch_config_csv_file_path", {
    baseUrl: slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: slice.gtopCookie,
    project: slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
    envId,
    csvFilename,
  });
}

export async function gtopUploadConfigCsv(args: {
  slice: GtopSessionSlice;
  envId: string;
  regionServerId: string;
  filePath: string;
  csvLocalPath: string;
  csvFilename: string;
}): Promise<GtopUploadResult> {
  return invoke("gtop_upload_config_csv", {
    baseUrl: args.slice.gtopBaseUrl.trim() || DEFAULT_GTOP_BASE_URL,
    cookie: args.slice.gtopCookie,
    project: args.slice.gtopProject.trim() || DEFAULT_GTOP_PROJECT,
    envId: args.envId,
    regionServerId: args.regionServerId,
    filePath: args.filePath,
    csvLocalPath: args.csvLocalPath,
    csvFilename: args.csvFilename,
  });
}

export async function listConfigCsvFiles(workspaceRoot: string): Promise<string[]> {
  return invoke("list_config_csv_files", { workspaceRoot });
}

export async function gtopOpenLoginWindow(baseUrl: string): Promise<void> {
  await invoke("gtop_open_login_window", {
    baseUrl: baseUrl.trim() || DEFAULT_GTOP_BASE_URL,
  });
}

export async function gtopCollectLoginCookies(): Promise<string> {
  return invoke("gtop_collect_login_cookies");
}

export async function gtopCloseLoginWindow(): Promise<void> {
  await invoke("gtop_close_login_window");
}

export function gtopSessionSliceFromConfig(c: {
  gtopBaseUrl?: string;
  gtopCookie?: string;
  gtopProject?: string;
}): GtopSessionSlice {
  return {
    gtopBaseUrl: c.gtopBaseUrl?.trim() || DEFAULT_GTOP_BASE_URL,
    gtopCookie: c.gtopCookie ?? "",
    gtopProject: c.gtopProject?.trim() || DEFAULT_GTOP_PROJECT,
  };
}
