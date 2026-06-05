/**
 * Push signing key + publish configs to a dedicated GitHub repo (easydoneKey).
 * Usage: node scripts/backup-key-repo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveGitExe } from "./resolve-git.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKTREE = path.join(root, ".key-backup-worktree");
const META_FILE = path.join(root, "Update", "key-backup.json");
const RESULT_MARKER = "__KEY_BACKUP_RESULT__";

const BACKUP_FILES = [
  { src: path.join(root, "keys", "easydone-updater.key"), dest: "easydone-updater.key" },
  { src: path.join(root, "publish.config.json"), dest: "publish.config.json" },
  { src: path.join(root, "publish.config.example.json"), dest: "publish.config.example.json" },
];

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

export function collectBackupSources() {
  return BACKUP_FILES.map(({ src, dest }) => ({ src, dest, exists: fs.existsSync(src) }));
}

export function missingBackupSources() {
  return collectBackupSources().filter((f) => !f.exists);
}

function loadKeyBackupConfig() {
  const cfg = loadPublishConfig();
  const kb = cfg?.keyBackup ?? {};
  const gh = cfg?.github ?? {};
  return {
    remote: kb.remote || "https://github.com/BeyonDog/easydoneKey.git",
    remoteName: kb.remoteName || "origin",
    branch: kb.branch || "main",
    token: gh.token || process.env.GITHUB_TOKEN || null,
  };
}

function gitConfigForResolve() {
  const cfg = loadPublishConfig() || {};
  const gh = cfg.github ?? {};
  const kb = cfg.keyBackup ?? {};
  return { github: { gitPath: kb.gitPath || gh.gitPath } };
}

function gitExecutable() {
  return resolveGitExe(gitConfigForResolve());
}

function log(msg) {
  console.log(`[key-backup] ${msg}`);
}

function fail(msg) {
  console.error(`[key-backup] ${msg}`);
  process.exit(1);
}

function gitEnv(baseEnv) {
  const env = { ...baseEnv };
  const token = loadKeyBackupConfig().token;
  if (token && !env.GITHUB_TOKEN) env.GITHUB_TOKEN = token;
  return env;
}

function runGit(args, opts = {}) {
  const exe = gitExecutable();
  if (!exe) {
    fail(
      "未找到 Git，请安装并加入 PATH，或在 publish.config.json 的 github.gitPath / keyBackup.gitPath 中指定 git.exe 路径",
    );
  }
  const cwd = opts.cwd ?? WORKTREE;
  const env = gitEnv(process.env);
  const useShell = exe === "git" && process.platform === "win32";
  const extra = opts.extraGitConfig || [];
  const gitArgs = [...extra, ...args];
  const r = spawnSync(exe, gitArgs, {
    cwd,
    env,
    encoding: "utf8",
    shell: useShell,
    windowsHide: true,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  return { ok: r.status === 0, code: r.status, out };
}

function assertGitAvailable() {
  if (!gitExecutable()) {
    fail(
      "未找到 Git，请安装并加入 PATH，或在 publish.config.json 的 github.gitPath / keyBackup.gitPath 中指定 git.exe 完整路径",
    );
  }
}

function assertSourcesExist() {
  const missing = missingBackupSources();
  if (missing.length) {
    fail(`缺少备份文件：${missing.map((m) => m.src).join("；")}`);
  }
}

function prepareWorktree() {
  fs.rmSync(WORKTREE, { recursive: true, force: true });
  fs.mkdirSync(WORKTREE, { recursive: true });
  for (const { src, dest } of BACKUP_FILES) {
    fs.copyFileSync(src, path.join(WORKTREE, dest));
  }
  const savedAt = new Date().toISOString();
  const readme = `# easydone 发版凭据备份

此仓库由发版机「备份到 GitHub」自动推送，包含签名私钥与 publish 配置。

**请勿公开分享。** 若仓库为 Public，任何人可下载并伪造签名更新包。

最近备份时间：${savedAt}
`;
  fs.writeFileSync(path.join(WORKTREE, "README.md"), readme, "utf8");
  return savedAt;
}

function ensureGitIdentity() {
  let r = runGit(["config", "user.name"], { cwd: WORKTREE });
  if (!r.ok || !r.out) {
    runGit(["config", "user.name", "Easydone Key Backup"], { cwd: WORKTREE });
  }
  r = runGit(["config", "user.email"], { cwd: WORKTREE });
  if (!r.ok || !r.out) {
    runGit(["config", "user.email", "easydone-key-backup@local"], { cwd: WORKTREE });
  }
}

function gitExtraConfigForToken(token) {
  if (!token || !loadKeyBackupConfig().remote.startsWith("https://")) return [];
  return ["-c", `http.extraHeader=Authorization: bearer ${token}`];
}

function emitResult(obj) {
  console.log(`${RESULT_MARKER}${JSON.stringify(obj)}`);
}

function writeMetaFile(result) {
  fs.mkdirSync(path.dirname(META_FILE), { recursive: true });
  fs.writeFileSync(META_FILE, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

function main() {
  assertGitAvailable();
  assertSourcesExist();
  const kb = loadKeyBackupConfig();
  const savedAt = prepareWorktree();

  let r = runGit(["init", "-b", kb.branch], { cwd: WORKTREE });
  if (!r.ok) fail(`git init 失败: ${r.out}`);

  ensureGitIdentity();

  r = runGit(["remote", "add", kb.remoteName, kb.remote], { cwd: WORKTREE });
  if (!r.ok && !/already exists/i.test(r.out)) {
    fail(`git remote add 失败: ${r.out}`);
  }

  const extra = gitExtraConfigForToken(kb.token);

  r = runGit(["add", "-A"], { cwd: WORKTREE, extraGitConfig: extra });
  if (!r.ok) fail(`git add 失败: ${r.out}`);

  const msg = `backup: ${savedAt.replace("T", " ").slice(0, 19)}`;
  r = runGit(["commit", "-m", msg], { cwd: WORKTREE, extraGitConfig: extra });
  if (!r.ok) fail(`git commit 失败: ${r.out}`);
  log(r.out || "已提交");

  r = runGit(["fetch", kb.remoteName, kb.branch], { cwd: WORKTREE, extraGitConfig: extra });
  if (!r.ok && r.out && !/couldn't find remote ref|could not read from remote/i.test(r.out)) {
    log(`fetch 提示（空仓库可忽略）: ${r.out}`);
  }

  r = runGit(
    ["push", "--force-with-lease", kb.remoteName, `HEAD:${kb.branch}`],
    { cwd: WORKTREE, extraGitConfig: extra },
  );
  if (!r.ok) fail(r.out || "git push 失败，请检查网络、GITHUB_TOKEN 与仓库权限");

  log(r.out || `已推送到 ${kb.remoteName}/${kb.branch}`);

  r = runGit(["rev-parse", "--short", "HEAD"], { cwd: WORKTREE, extraGitConfig: extra });
  const commit = r.ok ? r.out.trim() : "";

  const result = {
    kind: "key-backup",
    savedAt,
    commit,
    remoteUrl: kb.remote,
    branch: kb.branch,
    pushed: true,
  };
  writeMetaFile(result);
  emitResult(result);
  log("凭据备份完成");
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.normalize(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main();
}
