#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod gmt;
mod gtop;
mod update_preflight;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SavedSnapshot {
    id: String,
    title: String,
    created_at: i64,
    source: String,
    aoa: Vec<Vec<serde_json::Value>>,
    #[serde(default)]
    freeze_through_header: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SendTemplateItem {
    item_id: String,
    qty: i64,
    #[serde(default)]
    label: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SavedSendTemplate {
    id: String,
    title: String,
    created_at: i64,
    #[serde(default)]
    source: String,
    #[serde(default)]
    aoa: Vec<Vec<serde_json::Value>>,
    items: Vec<SendTemplateItem>,
    #[serde(default)]
    freeze_through_header: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct SavedTemplate {
    id: String,
    title: String,
    created_at: i64,
    source: String,
    aoa: Vec<Vec<serde_json::Value>>,
    #[serde(default)]
    items: Vec<SendTemplateItem>,
    #[serde(default)]
    freeze_through_header: Option<String>,
    #[serde(default)]
    card_color: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RecycledTemplate {
    template: SavedTemplate,
    deleted_at: i64,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
struct ItemTableFilter {
    #[serde(default)]
    type_remark_keys: Vec<String>,
    #[serde(default)]
    quality_keys: Vec<String>,
    #[serde(default)]
    defense_none: bool,
    #[serde(default)]
    defense_range: bool,
    defense_min: Option<f64>,
    defense_max: Option<f64>,
    #[serde(default)]
    type_remark_key_order: Option<Vec<String>>,
    #[serde(default)]
    quality_key_order: Option<Vec<String>>,
    #[serde(default)]
    section_order: Option<Vec<String>>,
    #[serde(default)]
    row_keyword: Option<String>,
    #[serde(default)]
    chip_bar_type_remark_order: Option<Vec<String>>,
    #[serde(default)]
    chip_bar_quality_order: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
struct TaskTableFilter {
    #[serde(default)]
    task_type_keys: Vec<String>,
    #[serde(default)]
    chain_keys: Vec<String>,
    #[serde(default)]
    task_type_key_order: Option<Vec<String>>,
    #[serde(default)]
    chain_key_order: Option<Vec<String>>,
    #[serde(default)]
    section_order: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
struct ItemServerWideSendAdvancedSettings {
    #[serde(default = "default_global_mail_type")]
    global_mail_type: String,
    #[serde(default = "default_dist_type")]
    dist_type: String,
    #[serde(default = "default_sender_name")]
    sender_name: String,
    #[serde(default = "default_localization_json")]
    localization_json: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
struct ItemServerWideSendSettings {
    #[serde(default = "default_entries_enabled")]
    entries_enabled: bool,
    #[serde(default)]
    advanced: ItemServerWideSendAdvancedSettings,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
struct GlobalSendLastForm {
    #[serde(default)]
    title: String,
    #[serde(default)]
    content: String,
    #[serde(default = "default_sender_name")]
    sender_name: String,
    #[serde(default)]
    start_time: i64,
    #[serde(default)]
    end_time: i64,
}

fn default_global_mail_type() -> String {
    "GlobalMailType_ATTACHMENT".to_string()
}

fn default_dist_type() -> String {
    "DistType_NONE".to_string()
}

fn default_sender_name() -> String {
    "lang".to_string()
}

fn default_localization_json() -> String {
    "[]".to_string()
}

fn default_entries_enabled() -> bool {
    true
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppConfig {
    #[serde(default)]
    excel_workspace_root: String,
    #[serde(default)]
    gm_assistant_local_path: String,
    #[serde(default)]
    item_remark_column: Option<String>,
    #[serde(default)]
    hidden_item_columns: Vec<String>,
    #[serde(default)]
    hidden_task_columns: Vec<String>,
    #[serde(default)]
    freeze_through_item_header: Option<String>,
    #[serde(default)]
    freeze_through_task_header: Option<String>,
    #[serde(default)]
    item_table_filter: Option<ItemTableFilter>,
    #[serde(default)]
    task_table_filter: Option<TaskTableFilter>,
    #[serde(default)]
    saved_snapshots: Vec<SavedSnapshot>,
    #[serde(default)]
    send_templates: Vec<SavedSendTemplate>,
    #[serde(default)]
    saved_templates: Vec<SavedTemplate>,
    #[serde(default)]
    recycled_templates: Vec<RecycledTemplate>,
    #[serde(default = "default_sidebar_item_card_color")]
    sidebar_item_card_color: String,
    #[serde(default = "default_sidebar_task_card_color")]
    sidebar_task_card_color: String,
    #[serde(default = "default_sidebar_add_exp_card_color")]
    sidebar_add_exp_card_color: String,
    #[serde(default)]
    sidebar_item_card_color_override: Option<String>,
    #[serde(default)]
    sidebar_task_card_color_override: Option<String>,
    #[serde(default)]
    sidebar_template_order: Option<Vec<String>>,
    #[serde(default = "default_theme_accent_hex")]
    theme_accent_hex: String,
    #[serde(default = "default_theme_background_hex")]
    theme_background_hex: String,
    #[serde(default)]
    theme_wallpaper_relative_path: Option<String>,
    #[serde(default = "default_theme_wallpaper_opacity")]
    theme_wallpaper_opacity: f64,
    #[serde(default)]
    initial_item_filter_sheet_shown: bool,
    #[serde(default)]
    initial_task_filter_sheet_shown: bool,
    /// 旧版单一标记，读入后由前端合并到 `initialItem` / `initialTask`
    #[serde(default)]
    initial_filter_hint_shown: Option<bool>,
    #[serde(default = "default_gmt_base_url")]
    gmt_base_url: String,
    #[serde(default)]
    gmt_cookie: String,
    #[serde(default)]
    gmt_env_id: Option<i64>,
    #[serde(default)]
    gmt_env_name: Option<String>,
    #[serde(default)]
    gmt_account_id: String,
    #[serde(default)]
    gmt_tradable: bool,
    #[serde(default = "default_gmt_region")]
    gmt_lock_region: String,
    #[serde(default = "default_gmt_region")]
    gmt_noti_region: String,
    #[serde(default = "default_gtop_base_url")]
    gtop_base_url: String,
    #[serde(default)]
    gtop_cookie: String,
    #[serde(default = "default_gtop_project")]
    gtop_project: String,
    #[serde(default)]
    gtop_env_id: Option<String>,
    #[serde(default)]
    gtop_env_name: Option<String>,
    #[serde(default)]
    gtop_region_server_id: Option<String>,
    #[serde(default)]
    gtop_region_server_name: Option<String>,
    #[serde(default)]
    item_server_wide_send_settings: Option<ItemServerWideSendSettings>,
    #[serde(default)]
    global_send_last_form: Option<GlobalSendLastForm>,
    #[serde(default = "default_excel_auto_refresh_interval_sec")]
    excel_auto_refresh_interval_sec: u64,
}

fn default_excel_auto_refresh_interval_sec() -> u64 {
    1800
}

fn default_gtop_base_url() -> String {
    "https://gtop.gre.garenanow.com".to_string()
}

fn default_gtop_project() -> String {
    "GNG".to_string()
}

fn default_gmt_base_url() -> String {
    "https://test-krad.stdgmtool.web.garena.cn".to_string()
}

fn default_gmt_region() -> String {
    "SG".to_string()
}

fn default_sidebar_item_card_color() -> String {
    "#e5484d".to_string()
}

fn default_sidebar_task_card_color() -> String {
    "#5b8cff".to_string()
}

fn default_sidebar_add_exp_card_color() -> String {
    "#e85d04".to_string()
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            excel_workspace_root: String::new(),
            gm_assistant_local_path: String::new(),
            item_remark_column: None,
            hidden_item_columns: Vec::new(),
            hidden_task_columns: Vec::new(),
            freeze_through_item_header: None,
            freeze_through_task_header: None,
            item_table_filter: None,
            task_table_filter: None,
            saved_snapshots: Vec::new(),
            send_templates: Vec::new(),
            saved_templates: Vec::new(),
            recycled_templates: Vec::new(),
            sidebar_item_card_color: default_sidebar_item_card_color(),
            sidebar_task_card_color: default_sidebar_task_card_color(),
            sidebar_add_exp_card_color: default_sidebar_add_exp_card_color(),
            sidebar_item_card_color_override: None,
            sidebar_task_card_color_override: None,
            sidebar_template_order: None,
            theme_accent_hex: default_theme_accent_hex(),
            theme_background_hex: default_theme_background_hex(),
            theme_wallpaper_relative_path: None,
            theme_wallpaper_opacity: default_theme_wallpaper_opacity(),
            initial_item_filter_sheet_shown: false,
            initial_task_filter_sheet_shown: false,
            initial_filter_hint_shown: None,
            gmt_base_url: default_gmt_base_url(),
            gmt_cookie: String::new(),
            gmt_env_id: None,
            gmt_env_name: None,
            gmt_account_id: String::new(),
            gmt_tradable: false,
            gmt_lock_region: default_gmt_region(),
            gmt_noti_region: default_gmt_region(),
            gtop_base_url: default_gtop_base_url(),
            gtop_cookie: String::new(),
            gtop_project: default_gtop_project(),
            gtop_env_id: None,
            gtop_env_name: None,
            gtop_region_server_id: None,
            gtop_region_server_name: None,
            item_server_wide_send_settings: Some(ItemServerWideSendSettings::default()),
            global_send_last_form: None,
            excel_auto_refresh_interval_sec: default_excel_auto_refresh_interval_sec(),
        }
    }
}

fn default_theme_accent_hex() -> String {
    "#5b8cff".to_string()
}

fn default_theme_background_hex() -> String {
    "#0f1115".to_string()
}

fn default_theme_wallpaper_opacity() -> f64 {
    0.35
}

fn app_config_dir_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn wallpaper_subdir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_config_dir_path(app)?.join("background"))
}

fn normalize_wallpaper_ext(raw: &str) -> Result<String, String> {
    let e = raw.trim().trim_start_matches('.').to_lowercase();
    match e.as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "gif" => Ok(e),
        _ => Err("不支持的图片格式，请使用 png / jpg / jpeg / webp / gif".into()),
    }
}

fn remove_old_wallpapers(dir: &Path) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }
    for ent in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let ent = ent.map_err(|e| e.to_string())?;
        let name = ent.file_name().to_string_lossy().to_string();
        if name.starts_with("wallpaper.") {
            let _ = std::fs::remove_file(ent.path());
        }
    }
    Ok(())
}

fn is_allowed_wallpaper_relative(rel: &str) -> bool {
    let lower = rel.to_lowercase();
    matches!(
        lower.as_str(),
        "background/wallpaper.png"
            | "background/wallpaper.jpg"
            | "background/wallpaper.jpeg"
            | "background/wallpaper.webp"
            | "background/wallpaper.gif"
    )
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let path = config_path(&app)?;
    let text = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_item_table_filter(
    app: tauri::AppHandle,
    filter: Option<ItemTableFilter>,
) -> Result<(), String> {
    let mut config = load_config(app.clone())?;
    config.item_table_filter = filter;
    save_config(app, config)
}

#[tauri::command]
fn save_task_table_filter(
    app: tauri::AppHandle,
    filter: Option<TaskTableFilter>,
) -> Result<(), String> {
    let mut config = load_config(app.clone())?;
    config.task_table_filter = filter;
    save_config(app, config)
}

#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("读取失败: {e}"))?;
    Ok(STANDARD.encode(&bytes))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExcelWorkspaceMtimeFingerprint {
    item: u64,
    mission: u64,
    account: u64,
}

fn file_mtime_ms(path: &Path) -> u64 {
    std::fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn excel_workspace_path(root: &str, parts: &[&str]) -> PathBuf {
    let mut p = PathBuf::from(root);
    for part in parts {
        p.push(part);
    }
    p
}

#[tauri::command]
fn excel_workspace_mtime_fingerprint(root: String) -> Result<ExcelWorkspaceMtimeFingerprint, String> {
    let root = root.trim();
    Ok(ExcelWorkspaceMtimeFingerprint {
        item: file_mtime_ms(&excel_workspace_path(root, &["Excel", "Item.xlsx"])),
        mission: file_mtime_ms(&excel_workspace_path(root, &["Excel", "Mission.xlsx"])),
        account: file_mtime_ms(&excel_workspace_path(root, &["Excel", "Account.xlsx"])),
    })
}

#[tauri::command]
fn write_file_base64(path: String, data_base64: String) -> Result<(), String> {
    let bytes = STANDARD
        .decode(data_base64.trim())
        .map_err(|e| format!("Base64 解码失败: {e}"))?;
    if let Some(parent) = PathBuf::from(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, bytes).map_err(|e| format!("写入失败: {e}"))
}

#[tauri::command]
fn save_theme_wallpaper(
    app: tauri::AppHandle,
    extension: String,
    data_base64: String,
) -> Result<String, String> {
    let ext = normalize_wallpaper_ext(&extension)?;
    let dir = wallpaper_subdir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    remove_old_wallpapers(&dir)?;
    let dest = dir.join(format!("wallpaper.{ext}"));
    let bytes = STANDARD
        .decode(data_base64.trim())
        .map_err(|e| format!("Base64 解码失败: {e}"))?;
    std::fs::write(&dest, bytes).map_err(|e| format!("写入壁纸失败: {e}"))?;
    Ok(format!("background/wallpaper.{ext}"))
}

#[tauri::command]
fn clear_theme_wallpaper(app: tauri::AppHandle) -> Result<(), String> {
    let dir = wallpaper_subdir(&app)?;
    remove_old_wallpapers(&dir)?;
    Ok(())
}

#[tauri::command]
fn theme_wallpaper_absolute_path(
    app: tauri::AppHandle,
    relative_path: Option<String>,
) -> Result<Option<String>, String> {
    let Some(rel) = relative_path else {
        return Ok(None);
    };
    let rel = rel.trim().replace('\\', "/").to_lowercase();
    if rel.is_empty() || rel.contains("..") || !rel.starts_with("background/") {
        return Ok(None);
    }
    if !is_allowed_wallpaper_relative(&rel) {
        return Ok(None);
    }
    let base = app_config_dir_path(&app)?;
    let full = base.join(&rel);
    if !full.is_file() {
        return Ok(None);
    }
    let base_canon = base.canonicalize().map_err(|e| e.to_string())?;
    let full_canon = full.canonicalize().map_err(|e| e.to_string())?;
    if !full_canon.starts_with(&base_canon) {
        return Ok(None);
    }
    Ok(Some(full_canon.to_string_lossy().to_string()))
}

fn prevent_default_shortcuts() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    use tauri_plugin_prevent_default::Flags;

    #[cfg(debug_assertions)]
    {
        tauri_plugin_prevent_default::Builder::new()
            .with_flags(Flags::all().difference(Flags::FIND | Flags::RELOAD | Flags::DEV_TOOLS))
            .build()
    }
    #[cfg(not(debug_assertions))]
    {
        tauri_plugin_prevent_default::Builder::new()
            .with_flags(Flags::all().difference(Flags::FIND))
            .build()
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(prevent_default_shortcuts())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let icon_bytes = include_bytes!("../icons/icon.ico");
                match image::load_from_memory(icon_bytes) {
                    Ok(img) => {
                        let rgba = img.to_rgba8();
                        let (w, h) = rgba.dimensions();
                        let icon = tauri::image::Image::new_owned(rgba.into_raw(), w, h);
                        if let Err(e) = window.set_icon(icon) {
                            eprintln!("[easydone] set window icon failed: {e}");
                        }
                    }
                    Err(e) => eprintln!("[easydone] icon.ico decode failed: {e}"),
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            save_item_table_filter,
            save_task_table_filter,
            read_file_base64,
            excel_workspace_mtime_fingerprint,
            write_file_base64,
            save_theme_wallpaper,
            clear_theme_wallpaper,
            theme_wallpaper_absolute_path,
            gmt::gmt_session_probe,
            gmt::gmt_fetch_envs,
            gmt::gmt_exec,
            gmt::gmt_open_login_window,
            gmt::gmt_collect_login_cookies,
            gmt::gmt_close_login_window,
            gtop::gtop_session_probe,
            gtop::gtop_fetch_envs,
            gtop::gtop_fetch_region_servers,
            gtop::gtop_fetch_task_csv_file_path,
            gtop::gtop_upload_task_csv,
            gtop::gtop_make_temp_task_csv,
            gtop::read_text_file,
            gtop::write_text_file,
            gtop::path_is_file,
            gtop::copy_file_clear_readonly,
            gtop::gtop_open_login_window,
            gtop::gtop_collect_login_cookies,
            gtop::gtop_close_login_window,
            update_preflight::preflight_update_manifest,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
