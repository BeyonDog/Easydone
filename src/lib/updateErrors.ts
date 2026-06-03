import { updateManifestUrl } from "./updateManifest";
import {
  UPDATE_UP_TO_DATE_MESSAGE,
  formatUpdateCheckErrorWithUrlPart,
  isManifestNotFound,
} from "./updateErrorText";

export { UPDATE_UP_TO_DATE_MESSAGE, isManifestNotFound };

/** Map Rust/JS preflight errors to user-facing Chinese. */
export function formatUpdateCheckError(raw: string): string {
  const url = updateManifestUrl();
  const urlPart = url ? `（${url}）` : "";
  return formatUpdateCheckErrorWithUrlPart(raw, urlPart);
}

export function manifestPreflightError(status: number, url: string): string {
  return formatUpdateCheckError(`HTTP ${status}：${url}`);
}

export function manifestFormatError(): string {
  return formatUpdateCheckError("FORMAT: latest.json 格式不正确：缺少 version 或 windows-x86_64 平台信息");
}

export function mapInvokePreflightError(e: unknown, url: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (raw && raw !== "[object Object]") {
    return formatUpdateCheckError(raw);
  }
  return formatUpdateCheckError(`CONNECTION: 预检失败：${url}`);
}
