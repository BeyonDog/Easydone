import { UPDATE_MANIFEST_URL } from "../updateEndpoint.ts";

const PENDING_UPDATE_VERSION_KEY = "easydone.pendingUpdateVersion";

function parseSemver(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function isNewerVersion(current: string, next: string): boolean {
  const a = parseSemver(current);
  const b = parseSemver(next);
  if (!a || !b) return next !== current;
  for (let i = 0; i < 3; i++) {
    if (b[i] > a[i]) return true;
    if (b[i] < a[i]) return false;
  }
  return false;
}

function resolveManifestUrl(): string | null {
  try {
    const fromEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      ?.VITE_UPDATE_MANIFEST_URL?.trim();
    if (fromEnv) return fromEnv;
  } catch {
    /* node tests may lack import.meta.env */
  }
  return UPDATE_MANIFEST_URL || null;
}

export function versionedInstallerUrl(version: string): string | null {
  const manifestUrl = resolveManifestUrl();
  if (!manifestUrl) return null;
  const base = manifestUrl.replace(/\/[^/?#]*$/, "");
  const v = version.trim().replace(/^v/i, "");
  if (!v) return null;
  return `${base}/easydone_${v}_x64-setup.exe`;
}

export function setPendingUpdateVersion(version: string): void {
  const v = version.trim();
  if (!v || typeof localStorage === "undefined") return;
  localStorage.setItem(PENDING_UPDATE_VERSION_KEY, v);
}

export function clearPendingUpdateVersion(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(PENDING_UPDATE_VERSION_KEY);
}

export function getPendingUpdateVersion(): string | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(PENDING_UPDATE_VERSION_KEY)?.trim() ?? "";
  return v || null;
}

export type PendingUpdateEvaluation =
  | { kind: "none" }
  | { kind: "success"; expectedVersion: string }
  | { kind: "failed"; currentVersion: string; expectedVersion: string; message: string };

export function formatPendingUpdateFailedMessage(
  currentVersion: string,
  expectedVersion: string,
): string {
  const installerUrl = versionedInstallerUrl(expectedVersion);
  const installHint = installerUrl
    ? `请关闭全部 easydone 后手动安装：${installerUrl}`
    : "请关闭全部 easydone 后，打开内网 latest.json 下载带版本号的安装包并手动安装。";
  return `更新未成功覆盖安装（仍为 ${currentVersion}，期望 ${expectedVersion}）。${installHint}`;
}

/** Compare running version with a pending expected version written before install. */
export function evaluatePendingUpdate(
  currentVersion: string,
  pendingVersion: string | null = getPendingUpdateVersion(),
): PendingUpdateEvaluation {
  const expected = pendingVersion?.trim() || null;
  if (!expected) return { kind: "none" };

  // Still behind the version we tried to install → install did not stick.
  if (isNewerVersion(currentVersion, expected)) {
    return {
      kind: "failed",
      currentVersion,
      expectedVersion: expected,
      message: formatPendingUpdateFailedMessage(currentVersion, expected),
    };
  }

  return { kind: "success", expectedVersion: expected };
}
