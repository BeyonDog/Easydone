/**
 * Enforce a single updater signing key pair (no rotation).
 * Usage: node scripts/signing-key-guard.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH = path.join(root, "keys", "signing-key.lock.json");
const TAURI_CONF = path.join(root, "src-tauri", "tauri.conf.json");
const DEFAULT_KEY = path.join(root, "keys", "easydone-updater.key");
const DEFAULT_PUB = path.join(root, "keys", "easydone-updater.key.pub");

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function readPublishConfig() {
  return readJsonSafe(path.join(root, "publish.config.json"));
}

export function isKeyRotationForbidden(cfg = null) {
  const c = cfg ?? readPublishConfig();
  return c?.forbidKeyRotation !== false;
}

export function loadLock() {
  return readJsonSafe(LOCK_PATH);
}

export function readTauriPubkey() {
  const conf = readJsonSafe(TAURI_CONF);
  const pk = conf?.plugins?.updater?.pubkey;
  if (!pk || typeof pk !== "string" || !pk.trim()) {
    throw new Error("src-tauri/tauri.conf.json 缺少 plugins.updater.pubkey");
  }
  return pk.trim();
}

export function readPubFile(pubPath = DEFAULT_PUB) {
  if (!fs.existsSync(pubPath)) {
    throw new Error(`缺少公钥文件: ${pubPath}`);
  }
  const text = fs.readFileSync(pubPath, "utf8").trim();
  if (!text) throw new Error(`公钥文件为空: ${pubPath}`);
  return text;
}

function assertPrivateKeyExists(keyPath = DEFAULT_KEY) {
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `缺少签名私钥: ${keyPath}。仅首次发版可运行 npm run signing:init，禁止 signer generate -f 覆盖已有密钥`,
    );
  }
  const text = fs.readFileSync(keyPath, "utf8").trim();
  if (!text) throw new Error(`签名私钥文件为空: ${keyPath}`);
}

/**
 * @returns {{ ok: true, pubkey: string } | { ok: false, message: string }}
 */
export function checkSigningKeyConsistent(options = {}) {
  const cfg = options.config ?? readPublishConfig();
  if (!isKeyRotationForbidden(cfg)) {
    return { ok: true, pubkey: readTauriPubkey(), rotationAllowed: true };
  }

  try {
    assertPrivateKeyExists();
    const tauriPk = readTauriPubkey();
    const pubPk = readPubFile();
    const lock = loadLock();
    if (!lock?.pubkey?.trim()) {
      return {
        ok: false,
        message: `缺少密钥锁定文件 ${path.relative(root, LOCK_PATH)}，请勿换钥`,
      };
    }
    const locked = lock.pubkey.trim();
    if (tauriPk !== pubPk) {
      return {
        ok: false,
        message:
          "tauri.conf.json 的 pubkey 与 keys/easydone-updater.key.pub 不一致。禁止换钥，否则同事自动更新将失败（different key）",
      };
    }
    if (tauriPk !== locked) {
      return {
        ok: false,
        message:
          "当前公钥与 keys/signing-key.lock.json 中锁定的公钥不一致。禁止换钥；请恢复 lock / tauri.conf / .pub 为同一密钥对",
      };
    }
    return { ok: true, pubkey: tauriPk };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export function assertSigningKeyConsistent(options = {}) {
  const r = checkSigningKeyConsistent(options);
  if (!r.ok) throw new Error(r.message);
  return r;
}

function main() {
  const r = checkSigningKeyConsistent();
  if (r.ok) {
    if (r.rotationAllowed) {
      console.log("[signing-guard] 已通过（forbidKeyRotation=false，未强制锁定）");
    } else {
      console.log("[signing-guard] 更新密钥已锁定，与 tauri.conf 一致");
    }
    process.exit(0);
  }
  console.error(`[signing-guard] ${r.message}`);
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.normalize(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main();
}
