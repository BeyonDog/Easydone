import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppConfig } from "./types.ts";
import { ServerWideSendSettingsTab } from "./ServerWideSendSettingsTab.tsx";
import { TemplateRecycleBinTab } from "./TemplateRecycleBinTab.tsx";
import { GtopSettingsSection } from "./GtopSettingsSection.tsx";
import { SettingsUpdateSection } from "./SettingsUpdateSection.tsx";
import { SidebarColorSettings } from "./SidebarColorSettings.tsx";
import {
  applyThemeCssVarsToDocument,
  DEFAULT_THEME_ACCENT_HEX,
  DEFAULT_THEME_BACKGROUND_HEX,
  normalizeThemeAccentHex,
  normalizeThemeBackgroundHex,
} from "./lib/themeAccent.ts";
import {
  applyWallpaperCssVarsToDocument,
  clampThemeWallpaperOpacity,
  normalizeThemeWallpaperRelativePath,
  resolveWallpaperAssetUrl,
  wallpaperDataUrlFromBase64,
} from "./lib/wallpaper.ts";
import {
  DEFAULT_SIDEBAR_ITEM_CARD_COLOR,
  DEFAULT_SIDEBAR_TASK_CARD_COLOR,
  normalizeSidebarCardColor,
  sidebarItemDefaultColor,
  sidebarTaskDefaultColor,
} from "./lib/sidebarCardColor.ts";
import { normalizeItemServerWideSendSettings } from "./lib/itemServerWideSendSettings.ts";
import { excelItemPath, excelMissionPath } from "./lib/paths.ts";
import {
  DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC,
  normalizeExcelAutoRefreshIntervalSec,
} from "./lib/excelWorkspaceFingerprint.ts";

const MAX_WALLPAPER_BASE64_CHARS = 14_000_000;

async function pickFolder(title: string) {
  const d = await open({ directory: true, multiple: false, title });
  return typeof d === "string" ? d : "";
}

export type SettingsModalProps = {
  config: AppConfig;
  settingsOpen: boolean;
  onClose: () => void;
  onPersist: (next: AppConfig) => void | Promise<void>;
  onLoadExcelData: (next: AppConfig) => void;
  gtopLoggedIn: boolean;
  onOpenGtopLogin: () => void;
  onCompleteGtopLogin: () => void;
  appUpdaterConfigured: boolean;
  appUpdaterChecking: boolean;
  appUpdaterStatusMessage: string | null;
  appUpdaterCurrentVersion: string;
  appUpdaterManifestUrl: string;
  onAppUpdaterCheck: () => void;
  onPurgeRecycledTemplate: (id: string) => void | Promise<void>;
  onRestoreRecycledTemplate: (id: string) => void | Promise<void>;
};

export function SettingsModal({
  config,
  settingsOpen,
  onClose,
  onPersist,
  onLoadExcelData,
  gtopLoggedIn,
  onOpenGtopLogin,
  onCompleteGtopLogin,
  appUpdaterConfigured,
  appUpdaterChecking,
  appUpdaterStatusMessage,
  appUpdaterCurrentVersion,
  appUpdaterManifestUrl,
  onAppUpdaterCheck,
  onPurgeRecycledTemplate,
  onRestoreRecycledTemplate,
}: SettingsModalProps) {
  const [settingsTab, setSettingsTab] = useState<"general" | "serverWide" | "gtop" | "recycle">("general");
  const [ex, setEx] = useState(config.excelWorkspaceRoot ?? "");
  const [themeHex, setThemeHex] = useState(config.themeAccentHex ?? DEFAULT_THEME_ACCENT_HEX);
  const [themeBgHex, setThemeBgHex] = useState(config.themeBackgroundHex ?? DEFAULT_THEME_BACKGROUND_HEX);
  const [wallRelDraft, setWallRelDraft] = useState<string | null>(() =>
    normalizeThemeWallpaperRelativePath(config.themeWallpaperRelativePath ?? null),
  );
  const [wallOpacityPct, setWallOpacityPct] = useState(() =>
    Math.round(clampThemeWallpaperOpacity(config.themeWallpaperOpacity) * 100),
  );
  const [wallPending, setWallPending] = useState<{ ext: string; dataBase64: string } | null>(null);
  const [sidebarItemHex, setSidebarItemHex] = useState(DEFAULT_SIDEBAR_ITEM_CARD_COLOR);
  const [sidebarTaskHex, setSidebarTaskHex] = useState(DEFAULT_SIDEBAR_TASK_CARD_COLOR);
  const [serverWideDraft, setServerWideDraft] = useState(() =>
    normalizeItemServerWideSendSettings(config.itemServerWideSendSettings),
  );
  const [autoRefreshSec, setAutoRefreshSec] = useState(String(DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC));
  const [showItemTypeInTable, setShowItemTypeInTable] = useState(Boolean(config.showItemTypeInTable));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    setEx(config.excelWorkspaceRoot);
    setServerWideDraft(normalizeItemServerWideSendSettings(config.itemServerWideSendSettings));
    setThemeHex(config.themeAccentHex);
    setThemeBgHex(config.themeBackgroundHex);
    setWallRelDraft(normalizeThemeWallpaperRelativePath(config.themeWallpaperRelativePath));
    setWallOpacityPct(Math.round(clampThemeWallpaperOpacity(config.themeWallpaperOpacity) * 100));
    setWallPending(null);
    setSidebarItemHex(sidebarItemDefaultColor(config));
    setSidebarTaskHex(sidebarTaskDefaultColor(config));
    setAutoRefreshSec(String(normalizeExcelAutoRefreshIntervalSec(config.excelAutoRefreshIntervalSec)));
    setShowItemTypeInTable(Boolean(config.showItemTypeInTable));
  }, [settingsOpen, config]);

  useEffect(() => {
    if (!settingsOpen) return;
    applyThemeCssVarsToDocument(themeHex, themeBgHex);
    let cancelled = false;
    void (async () => {
      const op = clampThemeWallpaperOpacity(wallOpacityPct / 100);
      if (wallPending) {
        applyWallpaperCssVarsToDocument(wallpaperDataUrlFromBase64(wallPending.ext, wallPending.dataBase64), op);
        return;
      }
      const rel = normalizeThemeWallpaperRelativePath(wallRelDraft);
      if (!rel) {
        if (!cancelled) applyWallpaperCssVarsToDocument(null, 0);
        return;
      }
      const url = await resolveWallpaperAssetUrl(rel);
      if (cancelled) return;
      applyWallpaperCssVarsToDocument(url, op);
    })();
    return () => {
      cancelled = true;
    };
  }, [themeHex, themeBgHex, wallRelDraft, wallOpacityPct, wallPending, settingsOpen]);

  const pickWallpaper = async () => {
    const p = await open({
      multiple: false,
      title: "选择壁纸",
      filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
    });
    if (typeof p !== "string" || !p.trim()) return;
    const extMatch = /\.([a-zA-Z0-9]+)$/.exec(p);
    const ext = (extMatch?.[1] ?? "png").toLowerCase();
    if (!["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      setErr("不支持的图片格式");
      return;
    }
    try {
      const b64 = await invoke<string>("read_file_base64", { path: p });
      if (b64.length > MAX_WALLPAPER_BASE64_CHARS) {
        setErr("图片过大，请选择较小的文件");
        return;
      }
      setWallPending({ ext, dataBase64: b64 });
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const save = async () => {
    setErr(null);
    const er = ex.trim();
    if (!er) {
      setErr("Excel 工作区无效");
      return;
    }
    const ip = excelItemPath(er);
    const mp = excelMissionPath(er);
    try {
      await invoke("read_file_base64", { path: ip });
      await invoke("read_file_base64", { path: mp });
    } catch {
      setErr(`Excel 文件未找到\n${ip}\n${mp}`);
      return;
    }

    let nextWpRel: string | null = normalizeThemeWallpaperRelativePath(wallRelDraft);
    const nextWpOp = clampThemeWallpaperOpacity(wallOpacityPct / 100);

    try {
      if (wallPending) {
        const rel = await invoke<string>("save_theme_wallpaper", {
          extension: wallPending.ext,
          dataBase64: wallPending.dataBase64,
        });
        nextWpRel = normalizeThemeWallpaperRelativePath(rel);
      } else if (wallRelDraft === null) {
        if (config.themeWallpaperRelativePath) {
          await invoke("clear_theme_wallpaper");
        }
        nextWpRel = null;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      return;
    }

    const next = {
      ...config,
      excelWorkspaceRoot: er,
      gmAssistantLocalPath: "",
      themeAccentHex: normalizeThemeAccentHex(themeHex),
      themeBackgroundHex: normalizeThemeBackgroundHex(themeBgHex),
      themeWallpaperRelativePath: nextWpRel,
      themeWallpaperOpacity: nextWpOp,
      sidebarItemCardColor: normalizeSidebarCardColor(sidebarItemHex, DEFAULT_SIDEBAR_ITEM_CARD_COLOR),
      sidebarTaskCardColor: normalizeSidebarCardColor(sidebarTaskHex, DEFAULT_SIDEBAR_TASK_CARD_COLOR),
      itemServerWideSendSettings: normalizeItemServerWideSendSettings(serverWideDraft),
      excelAutoRefreshIntervalSec: normalizeExcelAutoRefreshIntervalSec(autoRefreshSec),
      showItemTypeInTable,
    };
    await onPersist(next);
    onClose();
    onLoadExcelData(next);
  };

  const restorePreviewFromSavedConfig = () => {
    applyThemeCssVarsToDocument(config.themeAccentHex, config.themeBackgroundHex);
    void (async () => {
      const rel = normalizeThemeWallpaperRelativePath(config.themeWallpaperRelativePath);
      const op = clampThemeWallpaperOpacity(config.themeWallpaperOpacity);
      if (!rel) {
        applyWallpaperCssVarsToDocument(null, 0);
        return;
      }
      const url = await resolveWallpaperAssetUrl(rel);
      applyWallpaperCssVarsToDocument(url, op);
    })();
  };

  const closeSettings = () => {
    restorePreviewFromSavedConfig();
    onClose();
  };

  return (
    <div className="modal-back">
      <div className="modal settings-modal modal--sheet">
        <div className="settings-modal-head">
          <h2>设置</h2>
          <button type="button" className="btn settings-modal-close" aria-label="关闭" onClick={closeSettings}>
            ×
          </button>
        </div>
        <div className="btn-row settings-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={settingsTab === "general"}
            className={`btn${settingsTab === "general" ? " active" : ""}`}
            onClick={() => setSettingsTab("general")}
          >
            常规
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={settingsTab === "serverWide"}
            className={`btn${settingsTab === "serverWide" ? " active" : ""}`}
            onClick={() => setSettingsTab("serverWide")}
          >
            全服发送
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={settingsTab === "gtop"}
            className={`btn${settingsTab === "gtop" ? " active" : ""}`}
            onClick={() => setSettingsTab("gtop")}
          >
            GTOP 接取任务
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={settingsTab === "recycle"}
            className={`btn${settingsTab === "recycle" ? " active" : ""}`}
            onClick={() => setSettingsTab("recycle")}
          >
            回收站
          </button>
        </div>
        <div className="btn-row modal-actions-top">
          <button type="button" className="btn" onClick={closeSettings}>
            取消
          </button>
          {settingsTab === "gtop" || settingsTab === "recycle" ? (
            <button type="button" className="btn primary" onClick={onClose}>
              关闭
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={() => void save()}>
              保存
            </button>
          )}
        </div>
        <div className="modal-scroll-body">
          {settingsTab === "serverWide" ? (
            <ServerWideSendSettingsTab draft={serverWideDraft} onChange={setServerWideDraft} />
          ) : null}
          {settingsTab === "gtop" ? (
            <GtopSettingsSection
              config={config}
              gtopLoggedIn={gtopLoggedIn}
              onPersist={onPersist}
              onOpenGtopLogin={onOpenGtopLogin}
              onCompleteGtopLogin={onCompleteGtopLogin}
            />
          ) : null}
          {settingsTab === "recycle" ? (
            <TemplateRecycleBinTab
              config={config}
              recycledTemplates={config.recycledTemplates ?? []}
              onPurge={onPurgeRecycledTemplate}
              onRestore={onRestoreRecycledTemplate}
            />
          ) : null}
          {settingsTab === "general" ? (
            <>
              <div className="field">
                <label>Excel 工作区</label>
                <div className="path">{ex || "未选择"}</div>
                <div className="btn-row">
                  <button type="button" className="btn" onClick={() => void pickFolder("Excel 工作区").then(setEx)}>
                    选择文件夹
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="settings-excel-auto-refresh">Excel 后台同步间隔（秒）</label>
                <input
                  id="settings-excel-auto-refresh"
                  type="number"
                  min={0}
                  step={60}
                  className="bookmark"
                  value={autoRefreshSec}
                  onChange={(e) => setAutoRefreshSec(e.target.value)}
                />
                <p className="help" style={{ marginTop: "0.35rem" }}>
                  0 表示关闭；默认 {DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC}（30 分钟）。文件未变更时不重新读盘，主表不闪屏。
                </p>
              </div>
              <div className="field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={showItemTypeInTable}
                    onChange={(e) => setShowItemTypeInTable(e.target.checked)}
                  />
                  显示道具类型
                </label>
                <p className="help" style={{ marginTop: "0.35rem" }}>
                  开启后，物品表「物品ID」列显示为「ID(类型名)」，如 1180147(皮肤礼包)。复制与发送仍使用纯数字 ID。
                </p>
              </div>
              <div className="field">
                <label htmlFor="settings-theme-accent">主题强调色</label>
                <div className="btn-row" style={{ marginTop: 0, alignItems: "center" }}>
                  <input
                    id="settings-theme-accent"
                    type="color"
                    value={themeHex}
                    onChange={(e) => setThemeHex(e.target.value)}
                    style={{
                      width: "3rem",
                      height: "2rem",
                      padding: 0,
                      border: "1px solid var(--app-btn-border)",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: "transparent",
                    }}
                  />
                  <span className="path" style={{ flex: 1, minWidth: 0 }}>
                    {themeHex}
                  </span>
                  <button type="button" className="btn" onClick={() => setThemeHex(DEFAULT_THEME_ACCENT_HEX)}>
                    恢复默认色
                  </button>
                </div>
                <p className="help" style={{ marginTop: "0.35rem" }}>
                  用于界面强调色，保存后写入配置。
                </p>
              </div>
              <div className="field">
                <label htmlFor="settings-theme-bg">背景底色</label>
                <div className="btn-row" style={{ marginTop: 0, alignItems: "center" }}>
                  <input
                    id="settings-theme-bg"
                    type="color"
                    value={themeBgHex}
                    onChange={(e) => setThemeBgHex(e.target.value)}
                    style={{
                      width: "3rem",
                      height: "2rem",
                      padding: 0,
                      border: "1px solid var(--app-btn-border)",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: "transparent",
                    }}
                  />
                  <span className="path" style={{ flex: 1, minWidth: 0 }}>
                    {themeBgHex}
                  </span>
                  <button type="button" className="btn" onClick={() => setThemeBgHex(DEFAULT_THEME_BACKGROUND_HEX)}>
                    恢复默认背景
                  </button>
                </div>
                <p className="help" style={{ marginTop: "0.35rem" }}>
                  浅色背景时会自动切换为深色文字以保证可读性。
                </p>
              </div>
              <SettingsUpdateSection
                configured={appUpdaterConfigured}
                checking={appUpdaterChecking}
                statusMessage={appUpdaterStatusMessage}
                currentVersion={appUpdaterCurrentVersion}
                manifestUrl={appUpdaterManifestUrl}
                onCheck={onAppUpdaterCheck}
              />
              <SidebarColorSettings
                itemHex={sidebarItemHex}
                taskHex={sidebarTaskHex}
                onItemHexChange={setSidebarItemHex}
                onTaskHexChange={setSidebarTaskHex}
              />
              <div className="field">
                <label>桌面壁纸</label>
                <div className="btn-row" style={{ marginTop: 0, flexWrap: "wrap", gap: "0.35rem" }}>
                  <button type="button" className="btn" onClick={() => void pickWallpaper()}>
                    选择本地图片…
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setWallPending(null);
                      setWallRelDraft(null);
                    }}
                  >
                    清除壁纸
                  </button>
                </div>
                <p className="help" style={{ marginTop: "0.35rem" }}>
                  选图后先预览，点「保存」后写入应用目录；取消关闭设置不保存新图。
                </p>
                <div style={{ marginTop: "0.5rem" }}>
                  <label htmlFor="settings-wall-opacity" style={{ display: "block", marginBottom: "0.25rem" }}>
                    壁纸不透明度 {wallOpacityPct}%
                  </label>
                  <input
                    id="settings-wall-opacity"
                    type="range"
                    min={0}
                    max={100}
                    value={wallOpacityPct}
                    onChange={(e) => setWallOpacityPct(Number(e.target.value))}
                    style={{ width: "100%", maxWidth: "280px" }}
                  />
                </div>
                {wallPending ? <p className="help">已选择图片（待保存）</p> : null}
              </div>
            </>
          ) : null}
          {err ? <div className="error">{err}</div> : null}
        </div>
      </div>
    </div>
  );
}
