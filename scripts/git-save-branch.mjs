/**
 * Save current workspace + latest NSIS build to a GitHub branch (force-with-lease).
 * Usage: node scripts/git-save-branch.mjs --branch main|second|third
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findNsisArtifacts, requireInstallerSignatureFromConfig } from "./publish-update.mjs";
import { resolveGitExe } from "./resolve-git.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAVES_FILE = path.join(root, "Update", "repo-saves.json");
const RESULT_MARKER = "__REPO_SAVE_RESULT__";

const DEFAULT_BRANCHES = ["main", "second", "third"];
const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "target",
  ".DS_Store",
  "Update",
]);
const SKIP_PATH_PREFIXES = ["src-tauri/target", "src-tauri\\target"];

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function loadPublishConfig() {
  return readJsonSafe(path.join(root, "publish.config.json"));
}

function loadGithubConfig() {
  const cfg = loadPublishConfig();
  const gh = cfg?.github ?? {};
  const branches = Array.isArray(gh.branches) && gh.branches.length ? gh.branches : DEFAULT_BRANCHES;
  return {
    remote: gh.remote || "git@github.com:BeyonDog/Easydone.git",
    branches,
    artifactsDir: gh.artifactsDir || "ReleaseArtifacts",
    remoteName: gh.remoteName || "origin",
    token: gh.token || process.env.GITHUB_TOKEN || null,
  };
}

function gitExecutable() {
  const cfg = loadPublishConfig();
  const exe = resolveGitExe(cfg);
  if (!exe) return null;
  return exe;
}

function parseArgs() {
  const idx = process.argv.indexOf("--branch");
  const branch = idx >= 0 ? process.argv[idx + 1]?.trim() : "";
  if (!branch) throw new Error("请指定 --branch main|second|third");
  return branch;
}

function log(msg) {
  console.log(`[repo-save] ${msg}`);
}

function fail(msg) {
  console.error(`[repo-save] ${msg}`);
  process.exit(1);
}

function gitEnv(baseEnv) {
  const env = { ...baseEnv };
  const token = loadGithubConfig().token;
  if (token && !env.GITHUB_TOKEN) env.GITHUB_TOKEN = token;
  return env;
}

function runGit(args, opts = {}) {
  const exe = gitExecutable();
  if (!exe) fail("未找到 Git，请安装并加入 PATH，或在 publish.config.json 的 github.gitPath 中指定 git.exe 路径");
  const env = gitEnv(process.env);
  const useShell = exe === "git" && process.platform === "win32";
  const r = spawnSync(exe, args, {
    cwd: root,
    env,
    encoding: "utf8",
    shell: useShell,
    windowsHide: true,
    ...opts,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  return { ok: r.status === 0, code: r.status, out };
}

function assertGitAvailable() {
  if (!gitExecutable()) {
    fail(
      "未找到 Git，请安装并加入 PATH，或在 publish.config.json 的 github.gitPath 中指定 git.exe 完整路径",
    );
  }
}

function assertInsideRepo() {
  const r = runGit(["rev-parse", "--is-inside-work-tree"]);
  if (!r.ok || r.out !== "true") fail("当前目录不是 Git 仓库，请在 easydone 项目根目录初始化并配置 remote");
}

function ensureRemote(github) {
  const name = github.remoteName;
  let r = runGit(["remote", "get-url", name]);
  if (r.ok && r.out) return r.out.trim();
  log(`添加 remote ${name} → ${github.remote}`);
  r = runGit(["remote", "add", name, github.remote]);
  if (!r.ok) fail(`无法配置 git remote: ${r.out || "unknown"}`);
  r = runGit(["remote", "get-url", name]);
  return r.ok ? r.out.trim() : github.remote;
}

function shouldSkipEntry(relPath, name) {
  if (SKIP_DIR_NAMES.has(name)) return true;
  const norm = relPath.replace(/\\/g, "/");
  for (const p of SKIP_PATH_PREFIXES) {
    if (norm === p || norm.startsWith(`${p}/`)) return true;
  }
  return false;
}

function computeProjectSizeBytes(artifactsRelDir) {
  let total = 0;

  function walk(dir, rel = "") {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const relPath = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (shouldSkipEntry(relPath, ent.name)) continue;
        walk(path.join(dir, ent.name), relPath);
      } else if (ent.isFile()) {
        try {
          total += fs.statSync(path.join(dir, ent.name)).size;
        } catch {
          /* ignore */
        }
      }
    }
  }

  walk(root);
  return total;
}

function copyNsisToArtifacts(branch, artifactsDir) {
  const requireSig = requireInstallerSignatureFromConfig(loadPublishConfig());
  let nsis;
  try {
    nsis = findNsisArtifacts({ requireInstallerSignature: requireSig });
  } catch (e) {
    fail(
      e instanceof Error
        ? e.message
        : "未找到 NSIS 安装包，请先在内网发版 GUI 执行「仅构建」或「构建并发布」",
    );
  }
  const destDir = path.join(root, artifactsDir, branch);
  fs.mkdirSync(destDir, { recursive: true });
  const destExe = path.join(destDir, "easydone-setup.exe");
  const destSig = path.join(destDir, "easydone-setup.exe.sig");
  fs.copyFileSync(nsis.exePath, destExe);
  log(`已复制安装包 → ${path.relative(root, destExe)}`);
  if (nsis.sigPath) {
    fs.copyFileSync(nsis.sigPath, destSig);
    log(`已复制签名 → ${path.relative(root, destSig)}`);
  } else {
    log("未包含 .sig 签名文件（应用内自动更新不可用）");
  }
  return { destExe, destSig: nsis.sigPath ? destSig : null };
}

function readSavesFile() {
  const data = readJsonSafe(SAVES_FILE);
  if (data && typeof data === "object" && data.slots) return data;
  const slots = {};
  for (const b of DEFAULT_BRANCHES) {
    slots[b] = { savedAt: null, sizeBytes: null, commit: null, ok: null, error: null };
  }
  return { slots };
}

function writeSavesSlot(branch, slot) {
  const data = readSavesFile();
  data.slots[branch] = { ...data.slots[branch], ...slot };
  fs.mkdirSync(path.dirname(SAVES_FILE), { recursive: true });
  fs.writeFileSync(SAVES_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function emitResult(obj) {
  console.log(`${RESULT_MARKER}${JSON.stringify(obj)}`);
}

function main() {
  const branch = parseArgs();
  const github = loadGithubConfig();
  if (!github.branches.includes(branch)) {
    fail(`分支「${branch}」未在 publish.config.json → github.branches 中配置`);
  }

  assertGitAvailable();
  assertInsideRepo();
  const remoteUrl = ensureRemote(github);

  copyNsisToArtifacts(branch, github.artifactsDir);
  const sizeBytes = computeProjectSizeBytes(path.join(github.artifactsDir, branch));

  const savedAt = new Date().toISOString();
  const msg = `存档: ${branch} @ ${savedAt.replace("T", " ").slice(0, 19)}`;

  let r = runGit(["add", "-A"]);
  if (!r.ok) fail(`git add 失败: ${r.out}`);

  r = runGit(["commit", "-m", msg, "--allow-empty"]);
  if (!r.ok) fail(`git commit 失败: ${r.out}`);
  log(r.out || "已提交");

  r = runGit(["rev-parse", "--short", "HEAD"]);
  const commit = r.ok ? r.out.trim() : "";

  r = runGit(["fetch", github.remoteName, branch]);
  if (!r.ok) fail(`git fetch ${branch} 失败: ${r.out}`);
  log(`已同步远程 ${branch} → ${github.remoteName}/${branch}`);

  r = runGit(["push", "--force-with-lease", `${github.remoteName}`, `HEAD:${branch}`]);
  if (!r.ok) {
    writeSavesSlot(branch, {
      savedAt,
      sizeBytes,
      commit,
      ok: false,
      error: r.out || "git push 失败",
      remoteUrl,
    });
    fail(r.out || "git push 失败，请检查网络与 GitHub 权限");
  }
  log(r.out || `已推送到 ${github.remoteName}/${branch}`);

  const result = {
    kind: "repo-save",
    branch,
    savedAt,
    sizeBytes,
    commit,
    remoteUrl,
    pushed: true,
  };
  writeSavesSlot(branch, {
    savedAt,
    sizeBytes,
    commit,
    ok: true,
    error: null,
    remoteUrl,
  });
  emitResult(result);
  log("存档完成");
}

main();
