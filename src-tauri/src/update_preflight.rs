use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePlatformArtifact {
    pub signature: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateManifestDto {
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pub_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    pub platforms: HashMap<String, UpdatePlatformArtifact>,
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())
}

/// Fetch and validate LAN update manifest (bypasses WebView fetch restrictions on http://).
#[tauri::command]
pub async fn preflight_update_manifest(url: String) -> Result<UpdateManifestDto, String> {
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err("URL_EMPTY: 未配置更新清单地址".to_string());
    }

    let client = http_client()?;
    let res = client.get(&url).send().await.map_err(|e| {
        format!("CONNECTION: {e}")
    })?;

    let status = res.status();
    if !status.is_success() {
        return Err(format!("HTTP {}", status.as_u16()));
    }

    let text = res.text().await.map_err(|e| format!("READ_BODY: {e}"))?;
    if !text.trim().starts_with('{') {
        return Err("NOT_JSON: 响应不是 JSON（可能为 404 页面或目录列表）".to_string());
    }

    let manifest: UpdateManifestDto =
        serde_json::from_str(&text).map_err(|e| format!("PARSE_JSON: {e}"))?;

    if manifest.version.trim().is_empty() {
        return Err("FORMAT: latest.json 缺少 version".to_string());
    }

    let win = manifest
        .platforms
        .get("windows-x86_64")
        .ok_or_else(|| "FORMAT: latest.json 缺少 platforms.windows-x86_64".to_string())?;

    if win.url.trim().is_empty() || win.signature.trim().is_empty() {
        return Err("FORMAT: windows-x86_64 缺少 url 或 signature".to_string());
    }

    Ok(manifest)
}
