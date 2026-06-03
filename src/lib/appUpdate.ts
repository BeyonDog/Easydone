import { invoke, isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  formatUpdateCheckError,
  isManifestNotFound,
  mapInvokePreflightError,
  manifestFormatError,
  manifestPreflightError,
} from "./updateErrors";
import {
  formatBytes,
  isUpdaterConfigured,
  updateManifestUrl,
  windowsArtifact,
  type UpdateManifest,
} from "./updateManifest";

export type UpdateOffer = {
  update: Update;
  manifest: UpdateManifest | null;
  currentVersion: string;
  displaySize: string;
};

export type UpdateCheckResult =
  | { kind: "unconfigured" }
  | { kind: "none"; currentVersion: string }
  | { kind: "available"; offer: UpdateOffer }
  | { kind: "error"; message: string };

function parseSemver(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function isNewerVersion(current: string, next: string): boolean {
  const a = parseSemver(current);
  const b = parseSemver(next);
  if (!a || !b) return next !== current;
  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i]) return true;
    if (b[i] < a[i]) return false;
  }
  return false;
}

async function fetchManifestViaHttp(url: string): Promise<UpdateManifest> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text.trim().startsWith("{")) {
    throw new Error("NOT_JSON: 响应不是 JSON");
  }
  return JSON.parse(text) as UpdateManifest;
}

async function fetchManifestViaRust(url: string): Promise<UpdateManifest> {
  return invoke<UpdateManifest>("preflight_update_manifest", { url });
}

function validateManifestShape(manifest: UpdateManifest): string | null {
  if (!manifest.version?.trim()) {
    return manifestFormatError();
  }
  const artifact = windowsArtifact(manifest);
  if (!artifact?.url?.trim() || !artifact?.signature?.trim()) {
    return manifestFormatError();
  }
  return null;
}

export type PreflightUpdateResult =
  | { ok: true; manifest: UpdateManifest }
  | { ok: false; reason: "not_found" }
  | { ok: false; message: string };

/** Validate manifest is reachable and has required fields before Tauri check(). */
export async function preflightUpdateManifest(): Promise<PreflightUpdateResult> {
  const url = updateManifestUrl();
  if (!url) {
    return { ok: false, message: "未配置更新地址" };
  }

  try {
    let manifest: UpdateManifest;
    if (isTauri()) {
      try {
        manifest = await fetchManifestViaRust(url);
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        if (isManifestNotFound(raw)) {
          return { ok: false, reason: "not_found" };
        }
        return { ok: false, message: mapInvokePreflightError(e, url) };
      }
    } else {
      try {
        manifest = await fetchManifestViaHttp(url);
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        if (/^HTTP \d+/.test(raw)) {
          const status = Number(raw.replace(/^HTTP\s+/, ""));
          if (status === 404) {
            return { ok: false, reason: "not_found" };
          }
          return { ok: false, message: manifestPreflightError(status, url) };
        }
        return { ok: false, message: formatUpdateCheckError(raw) };
      }
    }

    const shapeErr = validateManifestShape(manifest);
    if (shapeErr) {
      return { ok: false, message: shapeErr };
    }
    return { ok: true, manifest };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return { ok: false, message: formatUpdateCheckError(raw) };
  }
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (!isUpdaterConfigured()) return { kind: "unconfigured" };

  const preflight = await preflightUpdateManifest();
  if (!preflight.ok) {
    if ("reason" in preflight) {
      const currentVersion = await getVersion();
      return { kind: "none", currentVersion };
    }
    return { kind: "error", message: preflight.message };
  }

  try {
    const currentVersion = await getVersion();
    const update = await check();
    if (!update) return { kind: "none", currentVersion };

    const manifest = preflight.manifest;
    const artifact = windowsArtifact(manifest);
    const size = manifest.size ?? artifact?.size;
    const displaySize = formatBytes(size);

    return {
      kind: "available",
      offer: {
        update,
        manifest,
        currentVersion,
        displaySize,
      },
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return { kind: "error", message: formatUpdateCheckError(raw) };
  }
}

export type DownloadProgress = {
  phase: "idle" | "downloading" | "installing" | "done" | "error";
  percent: number;
  message: string;
};

export async function downloadAndInstallUpdate(
  offer: UpdateOffer,
  onProgress: (p: DownloadProgress) => void,
): Promise<void> {
  onProgress({ phase: "downloading", percent: 0, message: "正在下载更新…" });
  let downloaded = 0;
  let contentLength = 0;

  await offer.update.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        contentLength = event.data.contentLength ?? 0;
        onProgress({
          phase: "downloading",
          percent: 0,
          message: contentLength
            ? `正在下载（${formatBytes(contentLength)}）…`
            : "正在下载更新…",
        });
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        if (contentLength > 0) {
          const percent = Math.min(99, Math.round((downloaded / contentLength) * 100));
          onProgress({
            phase: "downloading",
            percent,
            message: `已下载 ${formatBytes(downloaded)} / ${formatBytes(contentLength)}`,
          });
        }
        break;
      case "Finished":
        onProgress({ phase: "installing", percent: 100, message: "正在安装，应用将自动退出…" });
        break;
    }
  });

  onProgress({ phase: "done", percent: 100, message: "安装完成，正在重启…" });
  await relaunch();
}
