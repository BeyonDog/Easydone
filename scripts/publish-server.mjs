/**
 * Local publish GUI server (port 1421).
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { exec, spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isSigningPasswordConfigured, loadSigningEnv } from "./publish-update.mjs";
import { isGitAvailable as resolveIsGitAvailable } from "./resolve-git.mjs";
import { ensurePublishConfig } from "./ensure-publish-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guiDir = path.join(root, "publish-gui");
const PORT = Number(process.env.PUBLISH_GUI_PORT || 1421);
const LOG_FILE = path.join(root, "Update", "publish-gui.log");
const JOB_RESULT_FILE = path.join(root, "Update", "publish-job-last.json");
const REPO_SAVES_FILE = path.join(root, "Update", "repo-saves.json");
const DEFAULT_REPO_BRANCHES = ["main", "second", "third"];

const SIGNING_STALL_MS = 45_000;

/** @type {{ running: boolean, kind: string | null, log: string, result: object | null, error: string | null, child: import('node:child_process').ChildProcess | null, startedAt: number | null }} */
const publishJob = {
  running: false,
  kind: null,
  log: "",
  result: null,
  error: null,
  child: null,
  startedAt: null,
};

/** @type {{ running: boolean, branch: string | null, log: string, result: object | null, error: string | null, child: import('node:child_process').ChildProcess | null, startedAt: number | null }} */
const repoSaveJob = {
  running: false,
  branch: null,
  log: "",
  result: null,
  error: null,
  child: null,
  startedAt: null,
};

function publishConfigForGit() {
  const pubCfg = readJsonSafe(path.join(root, "publish.config.json"));
  const pubExample = readJsonSafe(path.join(root, "publish.config.example.json"));
  return pubCfg || pubExample || null;
}

function isGitAvailable() {
  return resolveIsGitAvailable(publishConfigForGit());
}

function githubConfigFromPublish(pubCfg, pubExample) {
  const cfg = pubCfg || pubExample || {};
  const gh = cfg.github ?? {};
  return {
    remote: gh.remote || "git@github.com:BeyonDog/Easydone.git",
    branches:
      Array.isArray(gh.branches) && gh.branches.length ? gh.branches : DEFAULT_REPO_BRANCHES,
    artifactsDir: gh.artifactsDir || "ReleaseArtifacts",
  };
}

function defaultRepoSaves(branches = DEFAULT_REPO_BRANCHES) {
  const slots = {};
  for (const b of branches) {
    slots[b] = { savedAt: null, sizeBytes: null, commit: null, ok: null, error: null, remoteUrl: null };
  }
  return { slots };
}

function readRepoSaves() {
  const pubCfg = readJsonSafe(path.join(root, "publish.config.json"));
  const pubExample = readJsonSafe(path.join(root, "publish.config.example.json"));
  const gh = githubConfigFromPublish(pubCfg, pubExample);
  const data = readJsonSafe(REPO_SAVES_FILE);
  const base = defaultRepoSaves(gh.branches);
  if (!data?.slots || typeof data.slots !== "object") return base;
  for (const b of gh.branches) {
    if (data.slots[b]) base.slots[b] = { ...base.slots[b], ...data.slots[b] };
  }
  return base;
}

function healRepoSaveJobState() {
  if (repoSaveJob.running && repoSaveJob.child == null) {
    repoSaveJob.running = false;
  }
}

function resetRepoSaveJob() {
  if (repoSaveJob.child) {
    try {
      repoSaveJob.child.kill();
    } catch {
      /* ignore */
    }
  }
  repoSaveJob.running = false;
  repoSaveJob.branch = null;
  repoSaveJob.child = null;
  repoSaveJob.log = "";
  repoSaveJob.result = null;
  repoSaveJob.error = null;
  repoSaveJob.startedAt = null;
}

function appendRepoSaveLog(chunk) {
  const text = chunk.toString();
  repoSaveJob.log += text;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, text, "utf8");
  } catch {
    /* ignore */
  }
}

function parseRepoResultFromLog(log) {
  return parseJsonAfterMarker(log, "__REPO_SAVE_RESULT__");
}

function repoJobPayload() {
  healRepoSaveJobState();
  let result = repoSaveJob.result;
  if (!result && !repoSaveJob.running && repoSaveJob.log) {
    result = parseRepoResultFromLog(repoSaveJob.log);
  }
  return {
    running: repoSaveJob.running,
    branch: repoSaveJob.branch,
    log: repoSaveJob.log,
    result,
    error: repoSaveJob.error,
    startedAt: repoSaveJob.startedAt,
  };
}

function anyJobRunning() {
  healPublishJobState();
  healRepoSaveJobState();
  return (
    (publishJob.running && publishJob.child != null) ||
    (repoSaveJob.running && repoSaveJob.child != null)
  );
}

function startRepoSave(branch) {
  const scriptPath = path.join(root, "scripts", "git-save-branch.mjs");
  repoSaveJob.running = true;
  repoSaveJob.branch = branch;
  repoSaveJob.log = "";
  repoSaveJob.result = null;
  repoSaveJob.error = null;
  repoSaveJob.startedAt = Date.now();

  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(
      LOG_FILE,
      `[publish-gui] repo save ${branch} started ${new Date().toISOString()}\n`,
      "utf8",
    );
  } catch {
    /* ignore */
  }

  const child = spawn(process.execPath, [scriptPath, "--branch", branch], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  repoSaveJob.child = child;

  child.stdout?.on("data", appendRepoSaveLog);
  child.stderr?.on("data", appendRepoSaveLog);

  child.on("close", (code) => {
    repoSaveJob.running = false;
    repoSaveJob.child = null;
    if (code === 0) {
      repoSaveJob.result = parseRepoResultFromLog(repoSaveJob.log);
      if (!repoSaveJob.result) {
        repoSaveJob.error = "存档完成但未解析到结果";
      }
    } else {
      repoSaveJob.error =
        repoSaveJob.log.trim().split("\n").pop() || `进程退出码 ${code}`;
    }
  });

  child.on("error", (e) => {
    repoSaveJob.running = false;
    repoSaveJob.child = null;
    repoSaveJob.error = e.message;
  });
}

function computeStallReason() {
  if (!publishJob.running || isSigningPasswordConfigured()) return null;
  if (!/expect a prompt for password/i.test(publishJob.log)) return null;
  if (publishJob.startedAt == null) return null;
  if (Date.now() - publishJob.startedAt < SIGNING_STALL_MS) return null;
  return "signing_password";
}

function appendJobLog(chunk) {
  const text = chunk.toString();
  publishJob.log += text;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, text, "utf8");
  } catch {
    /* ignore log file errors */
  }
}

function parseJsonAfterMarker(log, marker) {
  const idx = log.lastIndexOf(marker);
  if (idx < 0) return null;
  const rest = log.slice(idx + marker.length);
  const line = rest.split(/\r?\n/)[0]?.trim();
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    const brace = line.indexOf("{");
    if (brace >= 0) {
      try {
        return JSON.parse(line.slice(brace));
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

function parseResultFromLog(log, kind = publishJob.kind) {
  for (const marker of ["__PUBLISH_RESULT__", "__JOB_RESULT__"]) {
    const parsed = parseJsonAfterMarker(log, marker);
    if (parsed) return parsed;
  }
  const actionKind = kind === "build" ? "build" : kind === "publish" ? "publish" : "build-publish";
  if ((actionKind === "build" || actionKind === "build-publish") && /构建完成/.test(log)) {
    const m = log.match(/\[publish\] 安装包: (.+)/);
    if (m) {
      return {
        kind: "build",
        exePath: m[1].trim(),
        hint: "本地测试：运行上述 setup.exe；未写入 Update/",
      };
    }
  }
  return null;
}

function writeJobResultFile(result) {
  if (!result) return;
  try {
    fs.mkdirSync(path.dirname(JOB_RESULT_FILE), { recursive: true });
    fs.writeFileSync(JOB_RESULT_FILE, `${JSON.stringify(result)}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

function readJobResultFile() {
  try {
    if (!fs.existsSync(JOB_RESULT_FILE)) return null;
    return JSON.parse(fs.readFileSync(JOB_RESULT_FILE, "utf8"));
  } catch {
    return null;
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** Clear stale running=true when child process already exited. */
function healPublishJobState() {
  if (publishJob.running && publishJob.child == null) {
    publishJob.running = false;
  }
}

function resetPublishJob() {
  if (publishJob.child) {
    try {
      publishJob.child.kill();
    } catch {
      /* ignore */
    }
  }
  publishJob.running = false;
  publishJob.child = null;
  publishJob.kind = null;
  publishJob.log = "";
  publishJob.result = null;
  publishJob.error = null;
  publishJob.startedAt = null;
}

function projectStatus() {
  healPublishJobState();
  healRepoSaveJobState();
  const pkg = readJsonSafe(path.join(root, "package.json"));
  const tauri = readJsonSafe(path.join(root, "src-tauri", "tauri.conf.json"));
  const pubCfg = readJsonSafe(path.join(root, "publish.config.json"));
  const pubExample = readJsonSafe(path.join(root, "publish.config.example.json"));
  const keyExists = fs.existsSync(path.join(root, "keys", "easydone-updater.key"));
  const gh = githubConfigFromPublish(pubCfg, pubExample);
  return {
    productName: tauri?.productName || pkg?.name || "easydone",
    currentVersion: pkg?.version || tauri?.version || "0.0.0",
    hasPublishConfig: Boolean(pubCfg),
    publishConfig: pubCfg || pubExample,
    hasSigningKey: keyExists,
    signingPasswordConfigured: isSigningPasswordConfigured(),
    guiPort: PORT,
    publishRunning: publishJob.running,
    jobKind: publishJob.kind,
    gitAvailable: isGitAvailable(),
    githubConfigured: Boolean(gh.remote),
    repoSaveRunning: repoSaveJob.running,
    repoBranches: gh.branches,
    savesSummary: readRepoSaves(),
  };
}

function sendJson(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function openBrowser(url) {
  if (process.env.PUBLISH_GUI_OPEN_BROWSER === "0") return;
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

/**
 * @param {"build" | "publish" | "build-publish"} action
 * @param {string} version
 * @param {string} notes
 */
function startJob(action, version, notes) {
  const scriptPath = path.join(root, "scripts", "publish-update.mjs");
  const args = [scriptPath];

  if (action === "build") {
    args.push("--build-only");
  } else if (action === "publish") {
    args.push("--publish-only");
    if (version) args.push("--version", version);
    args.push("--notes", notes ?? "");
  } else {
    if (version) args.push("--version", version);
    args.push("--notes", notes ?? "");
  }

  let signingEnv;
  try {
    signingEnv = loadSigningEnv().env;
  } catch (e) {
    throw e;
  }

  publishJob.running = true;
  publishJob.kind = action;
  publishJob.log = "";
  publishJob.result = null;
  publishJob.error = null;
  publishJob.startedAt = Date.now();

  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(
      LOG_FILE,
      `[publish-gui] job ${action} started ${new Date().toISOString()}\n`,
      "utf8",
    );
  } catch {
    /* ignore */
  }

  const child = spawn(process.execPath, args, {
    cwd: root,
    env: signingEnv,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  publishJob.child = child;

  child.stdout?.on("data", appendJobLog);
  child.stderr?.on("data", appendJobLog);

  child.on("close", (code) => {
    publishJob.running = false;
    publishJob.child = null;
    if (code === 0) {
      publishJob.result =
        parseResultFromLog(publishJob.log, action) ?? readJobResultFile();
      if (publishJob.result) {
        writeJobResultFile(publishJob.result);
      } else {
        const label =
          action === "build" ? "构建" : action === "publish" ? "发布" : "构建并发布";
        publishJob.error = `${label}完成但未解析到任务结果`;
      }
    } else {
      publishJob.error =
        publishJob.log.trim().split("\n").pop() || `进程退出码 ${code}`;
    }
  });

  child.on("error", (e) => {
    publishJob.running = false;
    publishJob.child = null;
    publishJob.error = e.message;
  });
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function jobPayload() {
  healPublishJobState();
  let result = publishJob.result;
  if (!result && !publishJob.running && publishJob.log) {
    result = parseResultFromLog(publishJob.log, publishJob.kind) ?? readJobResultFile();
  }
  return {
    running: publishJob.running,
    kind: publishJob.kind,
    log: publishJob.log,
    result,
    error: publishJob.error,
    stallReason: computeStallReason(),
    startedAt: publishJob.startedAt,
    signingPasswordConfigured: isSigningPasswordConfigured(),
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/api/status" && req.method === "GET") {
    return sendJson(res, 200, projectStatus());
  }

  if (
    (url.pathname === "/api/publish/job" || url.pathname === "/api/job") &&
    req.method === "GET"
  ) {
    return sendJson(res, 200, jobPayload());
  }

  if (url.pathname === "/api/job/reset" && req.method === "POST") {
    resetPublishJob();
    return sendJson(res, 200, { ok: true, reset: true });
  }

  if (url.pathname === "/api/repo/saves" && req.method === "GET") {
    return sendJson(res, 200, readRepoSaves());
  }

  if (url.pathname === "/api/repo/job" && req.method === "GET") {
    return sendJson(res, 200, repoJobPayload());
  }

  if (url.pathname === "/api/repo/reset" && req.method === "POST") {
    resetRepoSaveJob();
    return sendJson(res, 200, { ok: true, reset: true });
  }

  if (url.pathname === "/api/repo/save" && req.method === "POST") {
    if (anyJobRunning()) {
      return sendJson(res, 409, {
        ok: false,
        error: "已有任务进行中（构建/发布或代码存档），请等待完成",
      });
    }
    try {
      const body = await readBody(req);
      const branch = body.branch?.trim();
      const pubCfg = readJsonSafe(path.join(root, "publish.config.json"));
      const pubExample = readJsonSafe(path.join(root, "publish.config.example.json"));
      const gh = githubConfigFromPublish(pubCfg, pubExample);
      if (!branch || !gh.branches.includes(branch)) {
        return sendJson(res, 400, {
          ok: false,
          error: `branch 须为: ${gh.branches.join(", ")}`,
        });
      }
      if (!isGitAvailable()) {
        return sendJson(res, 400, { ok: false, error: "未找到 Git，请安装并加入 PATH" });
      }
      startRepoSave(branch);
      return sendJson(res, 202, { ok: true, started: true, branch });
    } catch (e) {
      return sendJson(res, 500, {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (url.pathname === "/api/job" && req.method === "POST") {
    healPublishJobState();
    if (anyJobRunning()) {
      return sendJson(res, 409, {
        ok: false,
        error: "已有任务进行中，请等待完成",
      });
    }
    try {
      const body = await readBody(req);
      const action = body.action || "build-publish";
      if (!["build", "publish", "build-publish"].includes(action)) {
        return sendJson(res, 400, { ok: false, error: `未知 action: ${action}` });
      }
      startJob(action, body.version?.trim() || "", body.notes ?? "");
      return sendJson(res, 202, { ok: true, started: true, kind: action });
    } catch (e) {
      return sendJson(res, 500, {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (url.pathname === "/api/publish" && req.method === "POST") {
    healPublishJobState();
    if (anyJobRunning()) {
      return sendJson(res, 409, {
        ok: false,
        error: "已有任务进行中，请等待完成",
      });
    }
    try {
      const body = await readBody(req);
      startJob("build-publish", body.version?.trim() || "", body.notes ?? "");
      return sendJson(res, 202, { ok: true, started: true, kind: "build-publish" });
    } catch (e) {
      return sendJson(res, 500, {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let filePath = path.join(guiDir, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(guiDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    return res.end("Not found");
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[publish-gui] 端口 ${PORT} 已被占用。请关闭占用进程或设置环境变量 PUBLISH_GUI_PORT 为其他端口。`,
    );
  } else {
    console.error("[publish-gui] server error:", err.message);
  }
  process.exit(1);
});

const cfgBootstrap = ensurePublishConfig(root);
if (cfgBootstrap.error) {
  console.error(`[publish-gui] ${cfgBootstrap.error}`);
} else if (cfgBootstrap.created) {
  console.log(
    "[publish-gui] 已从 publish.config.example.json 生成 publish.config.json，请核对 outputDir / publicBaseUrl。",
  );
}

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`[publish-gui] ${url}`);
  console.log("[publish-gui] 请保持此窗口打开；关闭后网页将无法访问。");
  openBrowser(url);
});
