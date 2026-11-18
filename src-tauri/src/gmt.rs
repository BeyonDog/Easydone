use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder};

const LOGIN_LABEL_OVERSEAS: &str = "gmt-login-overseas";
const LOGIN_LABEL_CN: &str = "gmt-login-cn";
const LOGIN_LABEL_PRELIVE: &str = "gmt-login-pr";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GmtSessionProbeResult {
    pub logged_in: bool,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GmtEnvEntry {
    pub id: i64,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminAddExpResult {
    pub level_before: i64,
    pub level_after: i64,
    pub exp_before: i64,
    pub exp_after: i64,
}

#[derive(Debug, Deserialize)]
struct AdminAddExpResultRaw {
    level_before: Option<i64>,
    level_after: Option<i64>,
    exp_before: Option<i64>,
    exp_after: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GmtExecResult {
    pub ok: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub add_exp_result: Option<AdminAddExpResult>,
}

#[derive(Debug, Deserialize)]
struct GmtApiEnvelope {
    code: Option<i64>,
    status: Option<String>,
    msg: Option<String>,
}

fn normalize_base_url(raw: &str) -> String {
    let t = raw.trim().trim_end_matches('/');
    if t.is_empty() {
        "https://test-krad.stdgmtool.web.garena.cn".to_string()
    } else {
        t.to_string()
    }
}

fn login_window_label(target: &str) -> Result<&'static str, String> {
    match target.trim() {
        "overseas" => Ok(LOGIN_LABEL_OVERSEAS),
        "cn" => Ok(LOGIN_LABEL_CN),
        "prelive" => Ok(LOGIN_LABEL_PRELIVE),
        other => Err(format!("未知 GMT 登录目标: {other}")),
    }
}

fn login_data_subdirectory(target: &str) -> &'static str {
    match target {
        "cn" => "gmt-login-cn",
        "prelive" => "gmt-login-pr",
        _ => "gmt-login-overseas",
    }
}

fn login_window_title(target: &str) -> &'static str {
    match target {
        "cn" => "GMT 国服登录 (Garena SSO)",
        "prelive" => "GMT 海外(PR)登录 (Garena SSO)",
        _ => "GMT 海外登录 (Garena SSO)",
    }
}

fn login_data_directory(app: &AppHandle, target: &str) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法解析应用数据目录: {e}"))?;
    Ok(base.join(login_data_subdirectory(target)))
}

fn build_headers(cookie: &str, env_header: Option<&str>) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("application/json, text/plain, */*"),
    );
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert("x-csrftoken", HeaderValue::from_static("null"));
    if let Some(env) = env_header.filter(|s| !s.is_empty()) {
        headers.insert(
            "env",
            HeaderValue::from_str(env).map_err(|e| format!("env 头无效: {e}"))?,
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

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())
}

fn parse_envelope_status(text: &str) -> Result<GmtApiEnvelope, String> {
    serde_json::from_str(text).map_err(|e| format!("响应 JSON 解析失败: {e}"))
}

fn envelope_ok(env: &GmtApiEnvelope) -> bool {
    env.status.as_deref() == Some("success") || env.code == Some(0)
}

fn parse_add_exp_result(text: &str) -> Option<AdminAddExpResult> {
    let root: Value = serde_json::from_str(text).ok()?;
    let result = root.get("data")?.get("result")?;
    let raw: AdminAddExpResultRaw = serde_json::from_value(result.clone()).ok()?;
    let level_before = raw.level_before?;
    let level_after = raw.level_after?;
    let exp_before = raw.exp_before?;
    let exp_after = raw.exp_after?;
    Some(AdminAddExpResult {
        level_before,
        level_after,
        exp_before,
        exp_after,
    })
}

fn gmt_exec_success_message(body: &Value) -> String {
    match body.get("name").and_then(|v| v.as_str()) {
        Some("AdminAddExp") => "加经验成功".into(),
        Some("AdminClearTimeoutMatchInfo") => "重置服务器匹配成功".into(),
        Some("AddSproutScore") => "加豆芽分成功".into(),
        Some("AdminModifyRankPoints") => "升段位成功".into(),
        _ => "发放成功".into(),
    }
}

#[tauri::command]
pub async fn gmt_session_probe(
    base_url: String,
    cookie: String,
    env_header: Option<String>,
) -> Result<GmtSessionProbeResult, String> {
    let base = normalize_base_url(&base_url);
    if cookie.trim().is_empty() {
        return Ok(GmtSessionProbeResult {
            logged_in: false,
            message: "未登录：请先在 GMT 登录窗口完成 SSO".into(),
        });
    }
    let url = format!("{base}/api/gmtauth/user_perms");
    let client = client()?;
    let headers = build_headers(&cookie, env_header.as_deref())?;
    let resp = client
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Ok(GmtSessionProbeResult {
            logged_in: false,
            message: format!("HTTP {status}: {text}"),
        });
    }
    let env = parse_envelope_status(&text)?;
    if envelope_ok(&env) {
        Ok(GmtSessionProbeResult {
            logged_in: true,
            message: String::new(),
        })
    } else {
        Ok(GmtSessionProbeResult {
            logged_in: false,
            message: env.msg.unwrap_or_else(|| "会话无效".into()),
        })
    }
}

#[tauri::command]
pub async fn gmt_fetch_envs(
    base_url: String,
    cookie: String,
    env_header: Option<String>,
) -> Result<Vec<GmtEnvEntry>, String> {
    let base = normalize_base_url(&base_url);
    let url = format!("{base}/api/system/envs/list?size=0");
    let client = client()?;
    let headers = build_headers(&cookie, env_header.as_deref())?;
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
    if root.get("status").and_then(|v| v.as_str()) != Some("success") {
        return Err(root
            .get("msg")
            .and_then(|v| v.as_str())
            .unwrap_or("拉取区服失败")
            .to_string());
    }
    let data = root
        .get("data")
        .and_then(|d| d.get("data"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut out: Vec<GmtEnvEntry> = Vec::new();
    for item in data {
        let id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(-1);
        let name = item
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let protocol = item.get("protocol").and_then(|v| v.as_i64());
        if id >= 0 && !name.is_empty() {
            out.push(GmtEnvEntry { id, name, protocol });
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn gmt_exec(
    base_url: String,
    cookie: String,
    env_header: Option<String>,
    body_json: String,
) -> Result<GmtExecResult, String> {
    let base = normalize_base_url(&base_url);
    let url = format!("{base}/api/cmd/commands/exec");
    let body: Value =
        serde_json::from_str(&body_json).map_err(|e| format!("请求体 JSON 无效: {e}"))?;
    let client = client()?;
    let headers = build_headers(&cookie, env_header.as_deref())?;
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
        return Ok(GmtExecResult {
            ok: false,
            message: format!("HTTP {status}: {text}"),
            add_exp_result: None,
        });
    }
    let env = parse_envelope_status(&text)?;
    if envelope_ok(&env) {
        Ok(GmtExecResult {
            ok: true,
            message: gmt_exec_success_message(&body),
            add_exp_result: parse_add_exp_result(&text),
        })
    } else {
        Ok(GmtExecResult {
            ok: false,
            message: env.msg.unwrap_or_else(|| text),
            add_exp_result: None,
        })
    }
}

#[tauri::command]
pub async fn gmt_open_login_window(
    app: AppHandle,
    target: String,
    base_url: String,
) -> Result<(), String> {
    let label = login_window_label(&target)?;
    let base = normalize_base_url(&base_url);
    let parsed: Url = base.parse().map_err(|e| format!("URL 无效: {e}"))?;
    let url = WebviewUrl::External(parsed);
    if let Some(w) = app.get_webview_window(label) {
        w.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }
    let data_dir = login_data_directory(&app, &target)?;
    std::fs::create_dir_all(&data_dir).map_err(|e| format!("无法创建登录数据目录: {e}"))?;
    WebviewWindowBuilder::new(&app, label, url)
        .title(login_window_title(&target))
        .inner_size(960.0, 720.0)
        .center()
        .data_directory(data_dir)
        .build()
        .map_err(|e| format!("无法打开登录窗口: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn gmt_collect_login_cookies(app: AppHandle, target: String) -> Result<String, String> {
    let label = login_window_label(&target)?;
    let w = app
        .get_webview_window(label)
        .ok_or("请先打开 GMT 登录窗口")?;
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
pub async fn gmt_close_login_window(app: AppHandle, target: Option<String>) -> Result<(), String> {
    let labels: Vec<&str> = if let Some(t) = target {
        vec![login_window_label(&t)?]
    } else {
        vec![
            LOGIN_LABEL_OVERSEAS,
            LOGIN_LABEL_CN,
            LOGIN_LABEL_PRELIVE,
        ]
    };
    for label in labels {
        if let Some(w) = app.get_webview_window(label) {
            w.close().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
