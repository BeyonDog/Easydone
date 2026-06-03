/**
 * Quick check: tauri build receives signing env (no "no private key" error).
 * Usage: node scripts/verify-signing-build.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadSigningEnv } from "./publish-update.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { keyPath, env } = loadSigningEnv();

console.log("[verify] signing key:", keyPath);
console.log("[verify] CI:", env.CI);
console.log(
  "[verify] password env:",
  env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD == null
    ? "unset"
    : "(set — should be unset for passwordless)",
);
console.log("[verify] running npm run tauri build …");

const r = spawnSync("npm", ["run", "tauri", "build"], {
  cwd: root,
  env,
  stdio: "pipe",
  shell: true,
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});

const text = `${r.stdout || ""}${r.stderr || ""}`;
const privateKeyError = /no private key/i.test(text);

console.log("[verify] exit code:", r.status);
console.log("[verify] private key error:", privateKeyError);

if (privateKeyError) {
  const i = text.search(/no private key/i);
  console.log(text.slice(Math.max(0, i - 300), i + 400));
  process.exit(1);
}

if (r.status !== 0) {
  console.log(text.slice(-1500));
  process.exit(r.status ?? 1);
}

const nsisDir = path.join(root, "src-tauri", "target", "release", "bundle", "nsis");
const sigExists =
  fs.existsSync(nsisDir) && fs.readdirSync(nsisDir).some((f) => f.endsWith(".exe.sig"));

console.log("[verify] NSIS sig present:", sigExists);
console.log("[verify] OK — build completed without private key error");
process.exit(sigExists ? 0 : 1);
