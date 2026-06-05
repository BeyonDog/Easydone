/**
 * First-time only: generate updater signing key (never overwrites existing).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyPath = path.join(root, "keys", "easydone-updater.key");
const pubPath = path.join(root, "keys", "easydone-updater.key.pub");

if (fs.existsSync(keyPath)) {
  console.error(
    "[signing:init] 已存在私钥，禁止覆盖。项目策略为「永不换钥」；若必须轮换请设置 publish.config.json forbidKeyRotation: false 并人工处理全员安装。",
  );
  process.exit(1);
}

console.log("[signing:init] 生成新密钥对（仅此一次）…");
const r = spawnSync("npm", ["run", "tauri", "signer", "generate", "--", "--ci", "-w", keyPath], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

if (r.status !== 0) {
  process.exit(r.status ?? 1);
}

if (!fs.existsSync(pubPath)) {
  console.error(`[signing:init] 未找到 ${pubPath}，请检查 tauri signer 输出`);
  process.exit(1);
}

const pub = fs.readFileSync(pubPath, "utf8").trim();
console.log("[signing:init] 请将以下公钥写入 src-tauri/tauri.conf.json → plugins.updater.pubkey：");
console.log(pub);
console.log("[signing:init] 然后运行 npm run signing:check 确认与 keys/signing-key.lock.json 一致（或更新 lock 文件，仅首次搭建）。");
