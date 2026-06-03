/**
 * Create publish.config.json from publish.config.example.json when missing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @returns {{ created: boolean, error?: string }}
 */
export function ensurePublishConfig(projectRoot = root) {
  const cfgPath = path.join(projectRoot, "publish.config.json");
  const examplePath = path.join(projectRoot, "publish.config.example.json");
  if (fs.existsSync(cfgPath)) return { created: false };
  if (!fs.existsSync(examplePath)) {
    return { created: false, error: "缺少 publish.config.example.json" };
  }
  fs.copyFileSync(examplePath, cfgPath);
  return { created: true };
}

const isCli =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCli) {
  const r = ensurePublishConfig();
  if (r.error) {
    console.error(`[publish-config] ${r.error}`);
    process.exit(1);
  }
  if (r.created) {
    console.log("[publish-config] 已从 publish.config.example.json 生成 publish.config.json");
    console.log("[publish-config] 请核对 outputDir 与 publicBaseUrl 是否符合本机内网环境。");
  } else {
    console.log("[publish-config] publish.config.json 已存在，无需创建。");
  }
}
