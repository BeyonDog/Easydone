export const UPDATE_UP_TO_DATE_MESSAGE = "当前已是最新版本";

/** Full installer when in-app updater pubkey no longer matches published signature. */
export const MANUAL_INSTALL_DOWNLOAD_URL =
  "http://121.4.117.140:4174/api/files/file-c59f663c-958e-45dc-a048-23bcf117dcdb/download";

export const UPDATER_KEY_MISMATCH_INTRO =
  "更新包签名与当前客户端内置公钥不一致，无法自动安装。请下载完整安装包手动安装后重启。";

export function isUpdaterSignatureKeyMismatch(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  return (
    lower.includes("different key") ||
    lower.includes("signature was created with a different key")
  );
}

export function formatUpdaterSignatureKeyMismatchError(): string {
  return `${UPDATER_KEY_MISMATCH_INTRO}\n${MANUAL_INSTALL_DOWNLOAD_URL}`;
}

/** Map download/install errors (e.g. Tauri updater signature mismatch). */
export function formatUpdateInstallError(raw: string): string {
  if (isUpdaterSignatureKeyMismatch(raw)) return formatUpdaterSignatureKeyMismatchError();
  return raw.trim() || "更新安装失败";
}

export function isManifestNotFound(raw: string): boolean {
  const trimmed = raw.trim();
  return /^HTTP 404\b/i.test(trimmed) || /\bHTTP 404\b/i.test(trimmed);
}

/** @param urlPart already formatted e.g. "（http://…/latest.json）" or "" */
export function formatUpdateCheckErrorWithUrlPart(raw: string, urlPart: string): string {
  const trimmed = raw.trim();

  if (isManifestNotFound(trimmed)) {
    return UPDATE_UP_TO_DATE_MESSAGE;
  }
  if (/^HTTP 40[0-9]\b/i.test(trimmed) || /^HTTP 50[0-9]\b/i.test(trimmed)) {
    return `更新清单请求失败${urlPart}：${trimmed}。请确认发版机已运行 start-update-server.bat，且 Update 目录中已有 latest.json。`;
  }
  if (/^HTTP \d{3}\b/i.test(trimmed)) {
    return `更新清单请求失败${urlPart}：${trimmed}。请确认发版机已运行 start-update-server.bat，且 Update 目录中已有 latest.json。`;
  }
  if (
    trimmed.startsWith("CONNECTION:") ||
    /^READ_BODY:/i.test(trimmed) ||
    /connection refused|timed out|timeout|dns|unreachable/i.test(trimmed)
  ) {
    const detail = trimmed.replace(/^CONNECTION:\s*/i, "");
    return `无法连接更新服务器${urlPart}。${detail ? `（${detail}）` : ""}请检查：更新 HTTP 是否在 8080 运行、防火墙、发版机 IP 是否正确。`;
  }
  if (/^NOT_JSON:/i.test(trimmed) || /不是 JSON/i.test(trimmed)) {
    return `无法读取内网更新清单${urlPart}。请确认发版机已运行 start-update-server.bat，且 Update 目录中已有 latest.json。`;
  }
  if (/^FORMAT:/i.test(trimmed) || /格式不正确/i.test(trimmed)) {
    return `${trimmed.replace(/^FORMAT:\s*/i, "")}。请重新发版生成 latest.json。`;
  }
  if (/^PARSE_JSON:/i.test(trimmed)) {
    return `更新清单 JSON 无效${urlPart}。请重新发版。`;
  }

  const lower = trimmed.toLowerCase();
  const manifestHint =
    "请确认发版机已运行 start-update-server.bat，且 Update 目录中已有 latest.json。";
  if (lower.includes("could not fetch a valid release json")) {
    return `无法读取内网更新清单${urlPart}。${manifestHint}`;
  }
  if (lower.includes("failed to fetch") || (lower.includes("fetch") && lower.includes("network"))) {
    return `无法连接更新服务器${urlPart}。WebView 无法访问内网 HTTP 时请确认已安装最新客户端（预检走 Rust）。${manifestHint}`;
  }
  if (/更新清单请求失败/.test(trimmed)) {
    return `${trimmed}。${manifestHint}`;
  }
  if (/latest\.json 格式不正确/.test(trimmed)) {
    return `${trimmed}。请重新发版生成清单。`;
  }
  if (isUpdaterSignatureKeyMismatch(trimmed)) {
    return formatUpdaterSignatureKeyMismatchError();
  }
  return trimmed;
}
