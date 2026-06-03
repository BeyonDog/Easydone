/**
 * Verify LAN update HTTP server and latest.json on the publish machine.
 * Usage: node scripts/verify-update-server.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function main() {
  const cfgPath = path.join(root, "publish.config.json");
  if (!fs.existsSync(cfgPath)) {
    console.error("缺少 publish.config.json");
    process.exit(1);
  }
  const cfg = readJson(cfgPath);
  const requireSig = cfg.requireInstallerSignature === true;
  const base = (cfg.publicBaseUrl || "").replace(/\/$/, "");
  const manifestName = cfg.manifestFileName || "latest.json";
  const installerName = cfg.installerFileName || "easydone-setup.exe";
  const manifestUrl = `${base}/${manifestName}`;
  const outputDir = cfg.outputDir || path.join(root, "Update");

  console.log("[verify-update] 输出目录:", outputDir);
  console.log("[verify-update] 清单 URL:", manifestUrl);

  const localManifest = path.join(outputDir, manifestName);
  const localExe = path.join(outputDir, installerName);
  console.log("[verify-update] 本地清单:", fs.existsSync(localManifest) ? "存在" : "缺失");
  console.log("[verify-update] 本地安装包:", fs.existsSync(localExe) ? "存在" : "缺失");

  void (async () => {
    try {
      const res = await fetch(manifestUrl, { cache: "no-store" });
      console.log("[verify-update] HTTP 状态:", res.status, res.statusText);
      const text = await res.text();
      if (!res.ok) {
        console.error("[verify-update] 失败: 非 2xx 响应");
        console.error(text.slice(0, 200));
        process.exit(1);
      }
      if (!text.trim().startsWith("{")) {
        console.error("[verify-update] 失败: 响应不是 JSON");
        console.error(text.slice(0, 200));
        process.exit(1);
      }
      const manifest = JSON.parse(text);
      console.log("[verify-update] 清单 version:", manifest.version);
      const platform = manifest.platforms?.["windows-x86_64"];
      if (!platform?.url) {
        console.error("[verify-update] 失败: 缺少 windows-x86_64.url");
        process.exit(1);
      }
      if (!platform.signature) {
        if (requireSig) {
          console.error("[verify-update] 失败: 缺少 windows-x86_64.signature");
          process.exit(1);
        }
        console.warn("[verify-update] 警告: 清单无 signature，应用内自动更新不可用");
      }
      console.log("[verify-update] 安装包 URL:", platform.url);
      console.log("[verify-update] 校验通过");
    } catch (e) {
      console.error("[verify-update] 请求失败:", e instanceof Error ? e.message : e);
      console.error("请确认 start-update-server.bat 已运行且 8080 未被错误进程占用");
      process.exit(1);
    }
  })();
}

main();
