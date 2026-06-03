import { convertFileSrc, invoke } from "@tauri-apps/api/core";

export const DEFAULT_THEME_WALLPAPER_OPACITY = 0.35;

export function clampThemeWallpaperOpacity(n: unknown): number {
  const x = typeof n === "number" && Number.isFinite(n) ? n : DEFAULT_THEME_WALLPAPER_OPACITY;
  return Math.max(0, Math.min(1, x));
}

export function normalizeThemeWallpaperRelativePath(input: unknown): string | null {
  if (input == null) return null;
  if (typeof input !== "string") return null;
  const t = input.trim().replace(/\\/g, "/").toLowerCase();
  if (!t || t.includes("..") || !t.startsWith("background/")) return null;
  const ok =
    t === "background/wallpaper.png" ||
    t === "background/wallpaper.jpg" ||
    t === "background/wallpaper.jpeg" ||
    t === "background/wallpaper.webp" ||
    t === "background/wallpaper.gif";
  return ok ? t : null;
}

export function extToMime(ext: string): string {
  const e = ext.trim().toLowerCase().replace(/^\./, "");
  switch (e) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export function wallpaperDataUrlFromBase64(extension: string, dataBase64: string): string {
  return `data:${extToMime(extension)};base64,${dataBase64.trim()}`;
}

export async function resolveWallpaperAssetUrl(relativePath: string | null): Promise<string | null> {
  const rel = normalizeThemeWallpaperRelativePath(relativePath);
  if (!rel) return null;
  const abs = await invoke<string | null>("theme_wallpaper_absolute_path", { relativePath: rel });
  if (!abs) return null;
  return convertFileSrc(abs);
}

export function applyWallpaperCssVarsToDocument(imageCssUrl: string | null, opacity: number): void {
  const el = document.documentElement;
  const op = Math.max(0, Math.min(1, opacity));
  if (imageCssUrl) {
    const safe = imageCssUrl.replace(/\\/g, "/").replace(/"/g, "%22");
    el.style.setProperty("--app-wallpaper-image", `url("${safe}")`);
    el.style.setProperty("--app-wallpaper-opacity", String(op));
  } else {
    el.style.setProperty("--app-wallpaper-image", "none");
    el.style.setProperty("--app-wallpaper-opacity", "0");
  }
}
