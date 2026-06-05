/**
 * Build signed NSIS installer and publish latest.json + artifacts to LAN folder.
 *
 * Modes (decoupled):
 *   --build-only     tauri build only; no version bump, no Update/ copy
 *   --publish-only   copy existing NSIS → Update/ + latest.json
 *   (default)        build then publish
 *
 * Env:
 *   TAURI_SIGNING_PRIVATE_KEY_PATH  (default: keys/easydone-updater.key)
 *   TAURI_SIGNING_PRIVATE_KEY_PASSWORD  (or publish.config.json signingKeyPassword)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { assertSigningKeyConsistent } from "./signing-key-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readPublishConfigOptional() {
  const cfgPath = path.join(root, "publish.config.json");
  if (!fs.existsSync(cfgPath)) return null;
  return readJson(cfgPath);
}

/** @returns {string | null} */
export function getSigningKeyPassword() {
  const fromEnv = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
  if (fromEnv != null && String(fromEnv).length > 0) return String(fromEnv);
  const cfg = readPublishConfigOptional();
  const fromCfg = cfg?.signingKeyPassword;
  if (fromCfg != null && String(fromCfg).length > 0) return String(fromCfg);
  return null;
}

export function isSigningPasswordConfigured() {
  return getSigningKeyPassword() != null;
}

/** @param {object | null | undefined} cfg */
export function requireInstallerSignatureFromConfig(cfg = null) {
  const c = cfg ?? readPublishConfigOptional();
  return c?.requireInstallerSignature === true;
}

function loadConfig() {
  const cfg = readPublishConfigOptional();
  if (!cfg) {
    throw new Error("缺少 publish.config.json，请从 publish.config.example.json 复制并填写内网路径。");
  }
  if (!cfg.outputDir || !cfg.publicBaseUrl) {
    throw new Error("publish.config.json 需包含 outputDir 与 publicBaseUrl");
  }
  return {
    outputDir: cfg.outputDir,
    publicBaseUrl: cfg.publicBaseUrl.replace(/\/$/, ""),
    manifestFileName: cfg.manifestFileName || "latest.json",
    installerFileName: cfg.installerFileName || "easydone-setup.exe",
    requireInstallerSignature: requireInstallerSignatureFromConfig(cfg),
  };
}

function readVersion() {
  const pkg = readJson(path.join(root, "package.json"));
  const tauri = readJson(path.join(root, "src-tauri", "tauri.conf.json"));
  const v = pkg.version || tauri.version;
  if (!v) throw new Error("无法读取版本号");
  return v;
}

function writeProjectVersion(version) {
  const pkgPath = path.join(root, "package.json");
  const tauriPath = path.join(root, "src-tauri", "tauri.conf.json");
  const pkg = readJson(pkgPath);
  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  const tauri = readJson(tauriPath);
  tauri.version = version;
  fs.writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`, "utf8");
  const cargoPath = path.join(root, "src-tauri", "Cargo.toml");
  let cargo = fs.readFileSync(cargoPath, "utf8");
  cargo = cargo.replace(/^version = ".*"$/m, `version = "${version}"`);
  fs.writeFileSync(cargoPath, cargo, "utf8");
}

/**
 * @param {{ version?: string, notes?: string }} opts
 * @returns {{ version: string, notes: string }}
 */
function prepareVersion(opts = {}) {
  const requested = opts.version?.trim();
  const current = readVersion();
  const version = requested || current;
  if (requested && requested !== current) {
    console.log(`[publish] 版本号 ${current} → ${version}`);
    writeProjectVersion(version);
  }
  return { version, notes: (opts.notes ?? "").trim() };
}

/**
 * @param {{ requireInstallerSignature?: boolean }} [options]
 * @returns {{ exePath: string, sigPath: string | null, exeName: string }}
 */
export function findNsisArtifacts(options = {}) {
  const requireSig =
    options.requireInstallerSignature ?? requireInstallerSignatureFromConfig();
  const nsisDir = path.join(root, "src-tauri", "target", "release", "bundle", "nsis");
  if (!fs.existsSync(nsisDir)) {
    throw new Error(`未找到 NSIS 输出目录: ${nsisDir}，请先执行「仅构建」或「构建并发布」`);
  }
  const files = fs.readdirSync(nsisDir);
  const setupCandidates = files
    .filter((f) => f.endsWith("-setup.exe"))
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(nsisDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  const exe =
    setupCandidates[0]?.name ?? files.find((f) => f.endsWith(".exe") && !f.endsWith(".sig"));
  if (!exe) throw new Error(`NSIS 目录中无安装包: ${nsisDir}`);
  const sig = `${exe}.sig`;
  const sigFull = path.join(nsisDir, sig);
  if (!files.includes(sig)) {
    if (requireSig) {
      throw new Error(`缺少签名文件: ${sigFull}`);
    }
    console.warn(`[publish] 未找到签名文件: ${sigFull}（仍将仅发布安装包）`);
    return {
      exePath: path.join(nsisDir, exe),
      sigPath: null,
      exeName: exe,
    };
  }
  return {
    exePath: path.join(nsisDir, exe),
    sigPath: sigFull,
    exeName: exe,
  };
}

export function loadSigningEnv() {
  const keyPath = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH || path.join(root, "keys", "easydone-updater.key");
  if (!fs.existsSync(keyPath)) {
    throw new Error(`签名私钥不存在: ${keyPath}，仅首次请运行 npm run signing:init（禁止覆盖已有密钥）`);
  }
  const keyContent = fs.readFileSync(keyPath, "utf8").trim();
  if (!keyContent) {
    throw new Error(`签名私钥文件为空: ${keyPath}`);
  }
  const env = { ...process.env };
  env.TAURI_SIGNING_PRIVATE_KEY_PATH = keyPath;
  env.TAURI_SIGNING_PRIVATE_KEY = keyContent;
  // Never pass empty password — Windows CLI may hang waiting for stdin (publish GUI uses stdio ignore).
  delete env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD;
  const password = getSigningKeyPassword();
  if (password) {
    env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = password;
  }
  if (!env.CI) {
    env.CI = "true";
  }
  return {
    keyPath,
    env,
    signingPasswordConfigured: password != null,
  };
}

function runUnlockBuild() {
  const unlock = path.join(root, "scripts", "unlock-build.mjs");
  const r = spawnSync(process.execPath, [unlock], { cwd: root, stdio: "inherit" });
  if (r.status !== 0) throw new Error("构建前无法释放 easydone.exe，请先关闭正在运行的 easydone");
}

function runBuild() {
  assertSigningKeyConsistent();
  runUnlockBuild();
  const { keyPath, env, signingPasswordConfigured } = loadSigningEnv();
  console.log(`[publish] signing key: ${keyPath}`);
  console.log(
    `[publish] signing password: ${signingPasswordConfigured ? "已配置（环境变量或 publish.config.json）" : "未配置"}`,
  );
  console.log("[publish] npm run tauri build …");
  const r = spawnSync("npm", ["run", "tauri", "build"], { cwd: root, env, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error("tauri build 失败");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

/**
 * @param {{ outputDir: string, publicBaseUrl: string, manifestFileName: string, installerFileName: string, version: string, requireInstallerSignature?: boolean }} ctx
 */
export async function verifyPublishArtifacts(ctx) {
  const manifestPath = path.join(ctx.outputDir, ctx.manifestFileName);
  const destExe = path.join(ctx.outputDir, ctx.installerFileName);
  const issues = [];
  const requireSig = ctx.requireInstallerSignature === true;

  if (!fs.existsSync(manifestPath)) issues.push(`缺少清单: ${manifestPath}`);
  if (!fs.existsSync(destExe)) issues.push(`缺少安装包: ${destExe}`);

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = readJson(manifestPath);
      if (manifest.version !== ctx.version) {
        issues.push(`清单版本 ${manifest.version} 与发布版本 ${ctx.version} 不一致`);
      }
      const platform = manifest.platforms?.["windows-x86_64"];
      if (!platform?.url) {
        issues.push("latest.json 缺少 windows-x86_64.url");
      } else if (requireSig && !platform.signature) {
        issues.push("latest.json 缺少 windows-x86_64.signature");
      }
    } catch (e) {
      issues.push(`清单 JSON 无效: ${e instanceof Error ? e.message : e}`);
    }
  }

  const manifestUrl = `${ctx.publicBaseUrl}/${ctx.manifestFileName}`;
  try {
    const res = await fetch(manifestUrl, { cache: "no-store" });
    if (!res.ok) {
      issues.push(`HTTP 无法访问 ${manifestUrl} (status ${res.status})，请确认 start-update-server 已运行`);
    }
  } catch (e) {
    issues.push(
      `HTTP 请求失败 ${manifestUrl}: ${e instanceof Error ? e.message : e}（请确认更新 HTTP 服务与防火墙）`,
    );
  }

  return {
    ok: issues.length === 0,
    issues,
    manifestUrl,
    manifestPath,
    destExe,
  };
}

/** @param {{ version: string, notes: string }} versionCtx */
async function copyAndPublishManifest(cfg, versionCtx, artifacts) {
  const { exePath, sigPath, exeName } = artifacts;
  const { version, notes } = versionCtx;
  const stat = fs.statSync(exePath);
  const signature = sigPath ? fs.readFileSync(sigPath, "utf8").trim() : "";
  const destExe = path.join(cfg.outputDir, cfg.installerFileName);
  const destSig = `${destExe}.sig`;

  if (!sigPath) {
    console.warn("[publish] 无安装包签名，应用内自动更新将不可用");
  }

  console.log(`[publish] 复制安装包 → ${destExe}`);
  copyFile(exePath, destExe);
  if (sigPath) {
    copyFile(sigPath, destSig);
  }

  const artifactUrl = `${cfg.publicBaseUrl}/${cfg.installerFileName}`;
  const manifest = {
    version,
    notes,
    pub_date: new Date().toISOString(),
    size: stat.size,
    platforms: {
      "windows-x86_64": {
        signature,
        url: artifactUrl,
        size: stat.size,
      },
    },
  };

  const manifestPath = path.join(cfg.outputDir, cfg.manifestFileName);
  console.log(`[publish] 写入 ${manifestPath}`);
  ensureDir(cfg.outputDir);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const verify = await verifyPublishArtifacts({
    outputDir: cfg.outputDir,
    publicBaseUrl: cfg.publicBaseUrl,
    manifestFileName: cfg.manifestFileName,
    installerFileName: cfg.installerFileName,
    version,
    requireInstallerSignature: cfg.requireInstallerSignature,
  });

  if (!verify.ok) {
    console.warn("[publish] 发布校验未通过:");
    for (const issue of verify.issues) console.warn(`  - ${issue}`);
    throw new Error(`发布校验失败:\n${verify.issues.join("\n")}`);
  }

  console.log(`[publish] 校验通过: ${verify.manifestUrl}`);

  const keyPath = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH || path.join(root, "keys", "easydone-updater.key");

  return {
    kind: "publish",
    version,
    notes,
    size: stat.size,
    exeName,
    sourceExe: exePath,
    destExe,
    manifestPath,
    artifactUrl,
    manifestUrl: verify.manifestUrl,
    verify,
    publicKeyPath: path.join(root, "keys", "easydone-updater.key.pub"),
    signingKeyPath: keyPath,
    colleagueHint: `请确认同事版本低于 ${version}，且同事可访问 ${verify.manifestUrl}`,
  };
}

/** Local build only: no version bump, no Update/ copy. */
export async function buildOnly() {
  runBuild();
  const requireSig = requireInstallerSignatureFromConfig();
  const { exePath, sigPath, exeName } = findNsisArtifacts({
    requireInstallerSignature: requireSig,
  });
  console.log("[publish] 构建完成（未发布到内网）");
  console.log(`[publish] 安装包: ${exePath}`);
  return {
    kind: "build",
    exePath,
    sigPath,
    exeName,
    hint: "本地测试：运行上述 setup.exe；未写入 Update/，同事不会收到更新",
  };
}

/**
 * Publish existing NSIS artifacts to Update/ (no tauri build).
 * @param {{ version?: string, notes?: string }} opts
 * @param {{ version?: string, notes?: string }} [preset] already-applied version (build-publish)
 */
export async function publishArtifacts(opts = {}, preset = null) {
  assertSigningKeyConsistent();
  const cfg = loadConfig();
  const versionCtx = preset ?? prepareVersion(opts);
  const artifacts = findNsisArtifacts({
    requireInstallerSignature: cfg.requireInstallerSignature,
  });
  return copyAndPublishManifest(cfg, versionCtx, artifacts);
}

/**
 * @param {{ version?: string, notes?: string }} opts
 */
export async function publishUpdate(opts = {}) {
  const versionCtx = prepareVersion(opts);
  runBuild();
  return publishArtifacts(opts, versionCtx);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const notesIdx = process.argv.indexOf("--notes");
  const versionIdx = process.argv.indexOf("--version");
  const notes = notesIdx >= 0 ? process.argv[notesIdx + 1] : "";
  const version = versionIdx >= 0 ? process.argv[versionIdx + 1] : undefined;
  const buildOnlyFlag = process.argv.includes("--build-only");
  const publishOnlyFlag = process.argv.includes("--publish-only");

  try {
    let result;
    if (buildOnlyFlag) {
      result = await buildOnly();
    } else if (publishOnlyFlag) {
      result = await publishArtifacts({ notes, version });
    } else {
      result = await publishUpdate({ notes, version });
    }
    console.log(JSON.stringify(result, null, 2));
    const marker = result.kind === "build" ? "__JOB_RESULT__" : "__PUBLISH_RESULT__";
    console.log(`${marker}${JSON.stringify(result)}`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
