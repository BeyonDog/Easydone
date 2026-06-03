/** 与现 UI 主强调色一致，用作默认与非法配置回退 */
export const DEFAULT_THEME_ACCENT_HEX = "#5b8cff";

/** 与默认深色页面对齐，用作背景默认与非法配置回退 */
export const DEFAULT_THEME_BACKGROUND_HEX = "#0f1115";

function parseHex6(hex: string): { r: number; g: number; b: number } | null {
  const t = hex.trim();
  const m = /^#([0-9a-f]{6})$/i.exec(t);
  if (!m) return null;
  const v = m[1]!;
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

export function normalizeThemeAccentHex(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_THEME_ACCENT_HEX;
  const t = input.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(t)) return DEFAULT_THEME_ACCENT_HEX;
  return t;
}

export function normalizeThemeBackgroundHex(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_THEME_BACKGROUND_HEX;
  const t = input.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(t)) return DEFAULT_THEME_BACKGROUND_HEX;
  return t;
}

/** sRGB 相对亮度 (0–1)，用于主按钮上文字颜色与深浅界面判定 */
function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const R = lin(rgb.r);
  const G = lin(rgb.g);
  const B = lin(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function mixRgb(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
  return {
    r: Math.round(a.r * (1 - t) + b.r * t),
    g: Math.round(a.g * (1 - t) + b.g * t),
    b: Math.round(a.b * (1 - t) + b.b * t),
  };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** 0–360 色相, 0–100 饱和度与亮度 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d > 1e-8) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case R:
        h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
        break;
      case G:
        h = ((B - R) / d + 2) / 6;
        break;
      default:
        h = ((R - G) / d + 4) / 6;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/** 深色底：向白抬高；浅色底：向白再抬高（接近卡片更亮）或向黑压边 */
function liftTowardWhite(rgb: { r: number; g: number; b: number }, t: number) {
  return mixRgb(rgb, WHITE, t);
}

function edgeTowardContrast(rgb: { r: number; g: number; b: number }, darkUi: boolean, t: number) {
  return darkUi ? mixRgb(rgb, WHITE, t) : mixRgb(rgb, BLACK, t);
}

function buildThemeCssVars(accentHex: string, backgroundHex: string): Record<string, string> {
  const accentRgb = parseHex6(accentHex) ?? parseHex6(DEFAULT_THEME_ACCENT_HEX)!;
  const bgRgb = parseHex6(backgroundHex) ?? parseHex6(DEFAULT_THEME_BACKGROUND_HEX)!;
  const { h } = rgbToHsl(accentRgb.r, accentRgb.g, accentRgb.b);
  const darkBase = { r: 15, g: 17, b: 21 };
  const primaryBgRgb = mixRgb(accentRgb, darkBase, 0.42);
  const lum = relativeLuminance(primaryBgRgb);
  const primaryText = lum > 0.52 ? "#0f1115" : "#f1f3f5";

  const bgLum = relativeLuminance(bgRgb);
  const darkUi = bgLum < 0.35;

  const page = rgbToHex(bgRgb);
  const inputBg = page;

  const topbar = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.05 : 0.06));
  const sidebar = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.03 : 0.04));
  const tableBg = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.025 : 0.035));
  const tableHeader = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.06 : 0.08));
  const card = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.06 : 0.09));
  const cardActive = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.09 : 0.11));
  const context = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.06 : 0.09));
  const contextHover = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.1 : 0.12));
  const modal = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.06 : 0.09));
  const btnBg = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.08 : 0.1));
  const toastBg = rgbToHex(liftTowardWhite(bgRgb, darkUi ? 0.12 : 0.14));

  const border = rgbToHex(edgeTowardContrast(bgRgb, darkUi, darkUi ? 0.12 : 0.14));
  const borderStrong = rgbToHex(edgeTowardContrast(bgRgb, darkUi, darkUi ? 0.18 : 0.2));
  const topbarBorder = rgbToHex(edgeTowardContrast(bgRgb, darkUi, darkUi ? 0.11 : 0.13));
  const sidebarBorder = topbarBorder;
  const tableBorder = border;
  const contextBorder = borderStrong;
  const modalBorder = borderStrong;
  const btnBorder = borderStrong;
  const toastBorder = borderStrong;
  const inputBorder = border;
  const cardHoverBorder = borderStrong;

  const shadow = darkUi ? "0 8px 24px rgba(0, 0, 0, 0.45)" : "0 8px 24px rgba(0, 0, 0, 0.12)";

  let textVars: Record<string, string>;
  if (darkUi) {
    textVars = {
      "--app-text": hsl(h, 6, 92),
      "--app-text-muted": hsl(h, 5, 64),
      "--app-text-dim": hsl(h, 5, 52),
      "--app-text-soft": hsl(h, 8, 78),
      "--app-btn-text": hsl(h, 6, 92),
      "--app-input-text": hsl(h, 8, 78),
      "--app-help-muted": hsl(h, 5, 64),
    };
  } else {
    textVars = {
      "--app-text": hsl(h, 10, 14),
      "--app-text-muted": hsl(h, 8, 38),
      "--app-text-dim": hsl(h, 7, 32),
      "--app-text-soft": hsl(h, 9, 22),
      "--app-btn-text": hsl(h, 10, 18),
      "--app-input-text": hsl(h, 10, 16),
      "--app-help-muted": hsl(h, 8, 38),
    };
  }

  return {
    ...textVars,
    "--app-accent": accentHex,
    "--app-page-bg": page,
    "--app-topbar-bg": topbar,
    "--app-topbar-border": topbarBorder,
    "--app-sidebar-bg": sidebar,
    "--app-sidebar-border": sidebarBorder,
    "--app-border": border,
    "--app-border-strong": borderStrong,
    "--app-card-bg": card,
    "--app-card-hover-border": cardHoverBorder,
    "--app-card-active-bg": cardActive,
    "--app-card-active-border": accentHex,
    "--app-table-bg": tableBg,
    "--app-row-sticky-bg": tableBg,
    "--app-table-header-bg": tableHeader,
    "--app-table-border": tableBorder,
    "--app-context-bg": context,
    "--app-context-border": contextBorder,
    "--app-context-hover": contextHover,
    "--app-shadow": shadow,
    "--app-modal-bg": modal,
    "--app-modal-border": modalBorder,
    "--app-btn-bg": btnBg,
    "--app-btn-border": btnBorder,
    "--app-btn-primary-bg": rgbToHex(primaryBgRgb),
    "--app-btn-primary-border": accentHex,
    "--app-btn-primary-text": primaryText,
    "--app-input-bg": inputBg,
    "--app-input-border": inputBorder,
    "--app-toast-bg": toastBg,
    "--app-toast-border": toastBorder,
    "--app-error": darkUi ? "#ff8a8a" : "#c62828",
  };
}

export function applyThemeCssVarsToDocument(accentHexRaw: string, backgroundHexRaw: string): void {
  const accentHex = normalizeThemeAccentHex(accentHexRaw);
  const backgroundHex = normalizeThemeBackgroundHex(backgroundHexRaw);
  const el = document.documentElement;
  const vars = buildThemeCssVars(accentHex, backgroundHex);
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value);
  }
}
