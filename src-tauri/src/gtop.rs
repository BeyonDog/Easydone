use reqwest::header::{HeaderMap, HeaderValue, ACCEPT};
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};

const LOGIN_WINDOW_LABEL: &str = "gtop-login";
const DEFAULT_BASE: &str = "https://gtop.gre.garenanow.com";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GtopSessionProbeResult {
    pub logged_in: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GtopEnvEntry {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GtopRegionServerEntry {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GtopUploadResult {
    pub ok: bool,
    pub message: String,
}

fn normalize_base_url(raw: &str) -> String {
    let t = raw.trim().trim_end_matches('/');
    if t.is_empty() {
        DEFAULT_BASE.to_string()
    } else {
        t.to_string()
    }
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())
}

fn build_gtop_headers(cookie: &str, project: &str) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("application/json, text/plain, */*"),
    );
    let proj = project.trim();
    if !proj.is_empty() {
        headers.insert(
            "project",
            HeaderValue::from_str(proj).map_err(|e| format!("project 头无效: {e}"))?,
        );
    }
    let c = cookie.trim();
    if !c.is_empty() {
        headers.insert(
            "cookie",
            HeaderValue::from_str(c).map_err(|e| format!("Cookie 无效: {e}"))?,
        );
    }
    Ok(headers)
}

#[tauri::command]
pub async fn gtop_session_probe(
    base_url: String,
    cookie: String,
    project: String,
) -> Result<GtopSessionProbeResult, String> {
    if cookie.trim().is_empty() {
        return Ok(GtopSessionProbeResult {
            logged_in: false,
            message: "未登录：请先在 GTOP 登录窗口完成 SSO".into(),
        });
    }
    let envs = gtop_fetch_envs_internal(&base_url, &cookie, &project).await;
    match envs {
        Ok(list) if !list.is_empty() => Ok(GtopSessionProbeResult {
            logged_in: true,
            message: String::new(),
        }),
        Ok(_) => Ok(GtopSessionProbeResult {
            logged_in: false,
            message: "会话无效或无可访问环境".into(),
        }),
        Err(e) => Ok(GtopSessionProbeResult {
            logged_in: false,
            message: e,
        }),
    }
}

async fn gtop_fetch_envs_internal(
    base_url: &str,
    cookie: &str,
    project: &str,
) -> Result<Vec<GtopEnvEntry>, String> {
    let base = normalize_base_url(base_url);
    let url = format!("{base}/api/env/getByUser");
    let client = client()?;
    let headers = build_gtop_headers(cookie, project)?;
    let resp = client
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }
    let root: Value = serde_json::from_str(&text).map_err(|e| format!("JSON 解析失败: {e}"))?;
    let data = root
        .get("data")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut out = Vec::new();
    for item in data {
        let id = json_id_string(item.get("id"));
        let name = item
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !id.is_empty() && !name.is_empty() {
            out.push(GtopEnvEntry { id, name });
        }
    }
    Ok(out)
}

fn json_id_string(v: Option<&Value>) -> String {
    match v {
        Some(Value::String(s)) => s.trim().to_string(),
        Some(Value::Number(n)) => n.to_string(),
        _ => String::new(),
    }
}

#[tauri::command]
pub async fn gtop_fetch_envs(
    base_url: String,
    cookie: String,
    project: String,
) -> Result<Vec<GtopEnvEntry>, String> {
    gtop_fetch_envs_internal(&base_url, &cookie, &project).await
}

#[tauri::command]
pub async fn gtop_fetch_region_servers(
    base_url: String,
    cookie: String,
    project: String,
    env_id: String,
) -> Result<Vec<GtopRegionServerEntry>, String> {
    let base = normalize_base_url(&base_url);
    let url = format!("{base}/api/regionServer/listByUser");
    let client = client()?;
    let headers = build_gtop_headers(&cookie, &project)?;
    let body = serde_json::json!({ "env_id": env_id.trim() });
    let resp = client
        .post(&url)
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }
    let root: Value = serde_json::from_str(&text).map_err(|e| format!("JSON 解析失败: {e}"))?;
    let data = root
        .get("data")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut out = Vec::new();
    for item in data {
        let id = json_id_string(item.get("id"));
        let name = item
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !id.is_empty() && !name.is_empty() {
            out.push(GtopRegionServerEntry { id, name });
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn gtop_fetch_item_csv_file_path(
    base_url: String,
    cookie: String,
    project: String,
    env_id: String,
) -> Result<String, String> {
    let base = normalize_base_url(&base_url);
    let url = format!(
        "{base}/api/p4Config/content/getByEnvAndFilenames?env_id={}&filenames=Item.csv",
        urlencoding::encode(env_id.trim())
    );
    let client = client()?;
    let headers = build_gtop_headers(&cookie, &project)?;
    let resp = client
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }
    let root: Value = serde_json::from_str(&text).map_err(|e| format!("JSON 解析失败: {e}"))?;
    let path = root
        .get("data")
        .and_then(|v| v.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "未返回 Item.csv 上传路径".to_string())?;
    Ok(path)
}

#[tauri::command]
pub async fn gtop_fetch_task_csv_file_path(
    base_url: String,
    cookie: String,
    project: String,
    env_id: String,
) -> Result<String, String> {
    let base = normalize_base_url(&base_url);
    let url = format!(
        "{base}/api/p4Config/content/getByEnvAndFilenames?env_id={}&filenames=Task.csv",
        urlencoding::encode(env_id.trim())
    );
    let client = client()?;
    let headers = build_gtop_headers(&cookie, &project)?;
    let resp = client
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }
    let root: Value = serde_json::from_str(&text).map_err(|e| format!("JSON 解析失败: {e}"))?;
    let path = root
        .get("data")
        .and_then(|v| v.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "未返回 Task.csv 上传路径".to_string())?;
    Ok(path)
}

#[tauri::command]
pub async fn gtop_upload_item_csv(
    base_url: String,
    cookie: String,
    project: String,
    env_id: String,
    region_server_id: String,
    file_path: String,
    csv_file_path: String,
) -> Result<GtopUploadResult, String> {
    let bytes = std::fs::read(&csv_file_path).map_err(|e| format!("读取临时 CSV 失败: {e}"))?;
    let base = normalize_base_url(&base_url);
    let url = format!("{base}/api/regionServer/task/file/upload");
    let client = client()?;
    let headers = build_gtop_headers(&cookie, &project)?;
    let part = Part::bytes(bytes)
        .file_name("Item.csv")
        .mime_str("text/csv")
        .map_err(|e| e.to_string())?;
    let form = Form::new()
        .part("file", part)
        .text("region_server_ids", region_server_id.trim().to_string())
        .text("env_id", env_id.trim().to_string())
        .text("permission_tag", "area:manage:upload")
        .text("file_paths", file_path.trim().to_string());
    let resp = client
        .post(&url)
        .headers(headers)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("上传失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Ok(GtopUploadResult {
            ok: false,
            message: format!("HTTP {status}: {text}"),
        });
    }
    Ok(GtopUploadResult {
        ok: true,
        message: if text.len() > 200 {
            format!("上传成功（{} 字节响应）", text.len())
        } else if text.trim().is_empty() {
            "上传成功".into()
        } else {
            text
        },
    })
}

#[tauri::command]
pub async fn gtop_upload_task_csv(
    base_url: String,
    cookie: String,
    project: String,
    env_id: String,
    region_server_id: String,
    file_path: String,
    csv_file_path: String,
) -> Result<GtopUploadResult, String> {
    let bytes = std::fs::read(&csv_file_path).map_err(|e| format!("读取临时 CSV 失败: {e}"))?;
    let base = normalize_base_url(&base_url);
    let url = format!("{base}/api/regionServer/task/file/upload");
    let client = client()?;
    let headers = build_gtop_headers(&cookie, &project)?;
    let part = Part::bytes(bytes)
        .file_name("Task.csv")
        .mime_str("text/csv")
        .map_err(|e| e.to_string())?;
    let form = Form::new()
        .part("file", part)
        .text("region_server_ids", region_server_id.trim().to_string())
        .text("env_id", env_id.trim().to_string())
        .text("permission_tag", "area:manage:upload")
        .text("file_paths", file_path.trim().to_string());
    let resp = client
        .post(&url)
        .headers(headers)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("上传失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Ok(GtopUploadResult {
            ok: false,
            message: format!("HTTP {status}: {text}"),
        });
    }
    Ok(GtopUploadResult {
        ok: true,
        message: if text.len() > 200 {
            format!("上传成功（{} 字节响应）", text.len())
        } else if text.trim().is_empty() {
            "上传成功".into()
        } else {
            text
        },
    })
}

#[tauri::command]
pub async fn gtop_fetch_config_csv_file_path(
    base_url: String,
    cookie: String,
    project: String,
    env_id: String,
    csv_filename: String,
) -> Result<String, String> {
    let name = csv_filename.trim();
    if name.is_empty() {
        return Err("配置文件名不能为空".into());
    }
    let base = normalize_base_url(&base_url);
    let url = format!(
        "{base}/api/p4Config/content/getByEnvAndFilenames?env_id={}&filenames={}",
        urlencoding::encode(env_id.trim()),
        urlencoding::encode(name)
    );
    let client = client()?;
    let headers = build_gtop_headers(&cookie, &project)?;
    let resp = client
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("HTTP {status}: {text}"));
    }
    let root: Value = serde_json::from_str(&text).map_err(|e| format!("JSON 解析失败: {e}"))?;
    let path = root
        .get("data")
        .and_then(|v| v.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("未返回 {name} 上传路径"))?;
    Ok(path)
}

#[tauri::command]
pub async fn gtop_upload_config_csv(
    base_url: String,
    cookie: String,
    project: String,
    env_id: String,
    region_server_id: String,
    file_path: String,
    csv_local_path: String,
    csv_filename: String,
) -> Result<GtopUploadResult, String> {
    let name = csv_filename.trim();
    if name.is_empty() {
        return Err("配置文件名不能为空".into());
    }
    let bytes =
        std::fs::read(&csv_local_path).map_err(|e| format!("读取 CSV 失败: {e}"))?;
    let base = normalize_base_url(&base_url);
    let url = format!("{base}/api/regionServer/task/file/upload");
    let client = client()?;
    let headers = build_gtop_headers(&cookie, &project)?;
    let part = Part::bytes(bytes)
        .file_name(name.to_string())
        .mime_str("text/csv")
        .map_err(|e| e.to_string())?;
    let form = Form::new()
        .part("file", part)
        .text("region_server_ids", region_server_id.trim().to_string())
        .text("env_id", env_id.trim().to_string())
        .text("permission_tag", "area:manage:upload")
        .text("file_paths", file_path.trim().to_string());
    let resp = client
        .post(&url)
        .headers(headers)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("上传失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Ok(GtopUploadResult {
            ok: false,
            message: format!("HTTP {status}: {text}"),
        });
    }
    Ok(GtopUploadResult {
        ok: true,
        message: if text.len() > 200 {
            format!("上传成功（{} 字节响应）", text.len())
        } else if text.trim().is_empty() {
            "上传成功".into()
        } else {
            text
        },
    })
}

#[tauri::command]
pub fn list_config_csv_files(workspace_root: String) -> Result<Vec<String>, String> {
    let root = workspace_root.trim();
    if root.is_empty() {
        return Ok(vec![]);
    }
    let config_dir = std::path::Path::new(root).join("Config");
    if !config_dir.is_dir() {
        return Ok(vec![]);
    }
    let mut paths: Vec<String> = Vec::new();
    for ent in std::fs::read_dir(&config_dir).map_err(|e| format!("读取 Config 目录失败: {e}"))? {
        let ent = ent.map_err(|e| e.to_string())?;
        let path = ent.path();
        if !path.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_lowercase())
            .unwrap_or_default();
        if ext != "csv" {
            continue;
        }
        paths.push(path.to_string_lossy().to_string());
    }
    paths.sort_by(|a, b| {
        let fa = std::path::Path::new(a)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(a);
        let fb = std::path::Path::new(b)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(b);
        fa.cmp(fb)
    });
    Ok(paths)
}

#[tauri::command]
pub fn gtop_make_temp_task_csv(app: AppHandle, patched_utf8: String) -> Result<String, String> {
    gtop_make_temp_named_csv(app, patched_utf8, "Task")
}

#[tauri::command]
pub fn gtop_make_temp_item_csv(app: AppHandle, patched_utf8: String) -> Result<String, String> {
    gtop_make_temp_named_csv(app, patched_utf8, "Item")
}

fn gtop_make_temp_named_csv(
    app: AppHandle,
    patched_utf8: String,
    prefix: &str,
) -> Result<String, String> {
    let cache = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?;
    let dir = cache.join("gtop-upload");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let name = format!(
        "{prefix}_{}.csv",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    let dest = dir.join(name);
    std::fs::write(&dest, patched_utf8.as_bytes()).map_err(|e| format!("写入临时 CSV 失败: {e}"))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("读取失败: {e}"))
}

#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content.as_bytes()).map_err(|e| format!("写入失败: {e}"))
}

#[tauri::command]
pub fn path_is_file(path: String) -> Result<bool, String> {
    Ok(PathBuf::from(path).is_file())
}

#[tauri::command]
pub fn copy_file_clear_readonly(src: String, dest: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&dest).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::copy(&src, &dest).map_err(|e| format!("复制失败: {e}"))?;
    clear_readonly_attr(&dest)?;
    Ok(())
}

fn clear_readonly_attr(path: &str) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        const FILE_ATTRIBUTE_NORMAL: u32 = 0x80;
        let wide: Vec<u16> = std::ffi::OsStr::new(path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let ok = unsafe {
            windows_sys::Win32::Storage::FileSystem::SetFileAttributesW(
                wide.as_ptr(),
                FILE_ATTRIBUTE_NORMAL,
            )
        };
        if ok == 0 {
            return Err("无法取消只读属性".into());
        }
        Ok(())
    }
    #[cfg(not(windows))]
    {
        use std::os::unix::fs::PermissionsExt;
        let meta = std::fs::metadata(path).map_err(|e| e.to_string())?;
        let mut perms = meta.permissions();
        perms.set_mode(0o644);
        std::fs::set_permissions(path, perms).map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
pub async fn gtop_open_login_window(app: AppHandle, base_url: String) -> Result<(), String> {
    let base = normalize_base_url(&base_url);
    let parsed: Url = base.parse().map_err(|e| format!("URL 无效: {e}"))?;
    let url = WebviewUrl::External(parsed);
    if let Some(w) = app.get_webview_window(LOGIN_WINDOW_LABEL) {
        w.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, LOGIN_WINDOW_LABEL, url)
        .title("GTOP 登录 (Garena SSO)")
        .inner_size(960.0, 720.0)
        .center()
        .build()
        .map_err(|e| format!("无法打开 GTOP 登录窗口: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn gtop_collect_login_cookies(app: AppHandle) -> Result<String, String> {
    let w = app
        .get_webview_window(LOGIN_WINDOW_LABEL)
        .ok_or("请先打开 GTOP 登录窗口")?;
    let cookies = w.cookies().map_err(|e| format!("读取 Cookie 失败: {e}"))?;
    if cookies.is_empty() {
        return Err("未获取到 Cookie，请确认已在窗口内完成登录".into());
    }
    let header = cookies
        .iter()
        .map(|c| format!("{}={}", c.name(), c.value()))
        .collect::<Vec<_>>()
        .join("; ");
    Ok(header)
}

#[tauri::command]
pub async fn gtop_close_login_window(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(LOGIN_WINDOW_LABEL) {
        w.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}
