/** Tauri static updater manifest (with optional size for UI). */
export type UpdatePlatformArtifact = {
  signature: string;
  url: string;
  size?: number;
};

export type UpdateManifest = {
  version: string;
  notes?: string;
  pub_date?: string;
  size?: number;
  platforms: Record<string, UpdatePlatformArtifact>;
};

import { UPDATE_MANIFEST_URL } from "../updateEndpoint";

const WINDOWS_TARGET = "windows-x86_64";

export function updateManifestUrl(): string | null {
  const fromEnv = import.meta.env.VITE_UPDATE_MANIFEST_URL?.trim();
  return fromEnv || UPDATE_MANIFEST_URL;
}

export function isUpdaterConfigured(): boolean {
  return Boolean(updateManifestUrl());
}

export async function fetchUpdateManifest(signal?: AbortSignal): Promise<UpdateManifest | null> {
  const url = updateManifestUrl();
  if (!url) return null;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`更新清单请求失败 (${res.status})`);
  return (await res.json()) as UpdateManifest;
}

export function windowsArtifact(manifest: UpdateManifest): UpdatePlatformArtifact | null {
  return manifest.platforms[WINDOWS_TARGET] ?? null;
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
