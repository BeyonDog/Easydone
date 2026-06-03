const $ = (id) => document.getElementById(id);

const BTN_IDS = ["btn-build", "btn-publish-only", "btn-build-publish"];

let repoBranches = ["main", "second", "third"];
let repoPollTimer = null;
let repoJobFinishedLocally = false;
let activeRepoBranch = null;

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function classifyLogLine(line) {
  const t = line.toLowerCase();
  if (/error|失败|failed|panic|fatal/.test(t)) return "log-line-err";
  if (/finished|构建完成|发布成功|校验通过|completed successfully/.test(t)) return "log-line-ok";
  if (/warn|blocking waiting/.test(t)) return "log-line-warn";
  if (/\[publish\]|compiling|vite|bundling/.test(t)) return "log-line-info";
  return "log-line";
}

function renderColoredLog(text) {
  const lines = text.split("\n");
  return lines
    .map((line) => {
      const cls = classifyLogLine(line);
      return `<span class="log-line ${cls}">${escapeHtml(line) || " "}</span>`;
    })
    .join("\n");
}

function setButtonsDisabled(disabled) {
  for (const id of BTN_IDS) {
    const el = $(id);
    if (el) el.disabled = disabled;
  }
  setSaveSlotButtonsDisabled(disabled);
}

function setSaveSlotButtonsDisabled(disabled) {
  document.querySelectorAll("[data-repo-save-btn]").forEach((el) => {
    el.disabled = disabled;
  });
}

function formatSavedAt(iso) {
  if (!iso) return "从未保存";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

function branchSlotClass(branch) {
  if (branch === "main") return "save-slot--main";
  if (branch === "second") return "save-slot--second";
  if (branch === "third") return "save-slot--third";
  return "";
}

function renderSaveSlots(savesData) {
  const container = $("save-slots");
  if (!container) return;
  const slots = savesData?.slots ?? {};
  container.innerHTML = repoBranches
    .map((branch) => {
      const s = slots[branch] ?? {};
      const errLine =
        s.ok === false && s.error
          ? `<p class="save-slot-meta" style="color:var(--error)">上次失败：${escapeHtml(s.error.slice(0, 120))}</p>`
          : "";
      return `
        <article class="save-slot ${branchSlotClass(branch)}">
          <h3 class="save-slot-title">${escapeHtml(branch)}</h3>
          <p class="save-slot-meta">上次保存：<strong>${escapeHtml(formatSavedAt(s.savedAt))}</strong></p>
          <p class="save-slot-meta">项目大小：<strong>${formatBytes(s.sizeBytes)}</strong></p>
          ${s.commit ? `<p class="save-slot-meta">提交：<strong>${escapeHtml(s.commit)}</strong></p>` : ""}
          ${errLine}
          <button type="button" class="btn-secondary save-slot-btn" data-repo-save-btn data-branch="${escapeHtml(branch)}">保存到 ${escapeHtml(branch)}</button>
        </article>
      `;
    })
    .join("");
  container.querySelectorAll("[data-repo-save-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const branch = btn.getAttribute("data-branch");
      if (branch) void startRepoSave(branch);
    });
  });
}

function updateRepoGitHint(data) {
  const el = $("repo-git-hint");
  if (!el) return;
  if (!data.gitAvailable) {
    el.textContent =
      "未检测到 Git：请安装 Git 并加入 PATH；若已安装仍提示此项，可在 publish.config.json 的 github.gitPath 填写 git.exe 完整路径（发版服务会自动尝试常见安装目录）。";
    el.className = "hint repo-git-hint err";
    return;
  }
  el.className = "hint repo-git-hint";
  const remote = data.publishConfig?.github?.remote || "git@github.com:BeyonDog/Easydone.git";
  el.textContent = `远程仓库：${remote}。HTTPS 推送可在 publish.config.json 配置 github.token 或设置环境变量 GITHUB_TOKEN。`;
}

function setResetButtonEnabled(enabled) {
  const resetBtn = $("btn-reset-job");
  if (resetBtn) resetBtn.disabled = !enabled;
}

function setPublishFieldsForBuildOnly(buildOnly) {
  const versionInput = $("publish-version");
  const notesInput = $("publish-notes");
  const hint = $("build-only-hint");
  if (versionInput) versionInput.disabled = buildOnly;
  if (notesInput) notesInput.disabled = buildOnly;
  if (hint) hint.hidden = !buildOnly;
}

function showConnectionError(message) {
  $("status-line").textContent = message;
  $("status-line").style.color = "#e5484d";
  $("config-hint").textContent =
    "请先双击 start-publish-gui.bat 并保持命令行窗口打开，然后刷新本页。";
  $("config-hint").style.color = "#e5484d";
  setButtonsDisabled(true);
  setSaveSlotButtonsDisabled(true);
  setResetButtonEnabled(false);
}

function setJobStatus(text, kind) {
  const el = $("job-status");
  if (!el) return;
  el.hidden = !text;
  el.textContent = text;
  el.className = "job-status";
  if (kind) el.classList.add(kind);
}

function parseJsonAfterMarker(log, marker) {
  const idx = log.lastIndexOf(marker);
  if (idx < 0) return null;
  const line = log.slice(idx + marker.length).split(/\r?\n/)[0]?.trim();
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    const brace = line.indexOf("{");
    if (brace >= 0) {
      try {
        return JSON.parse(line.slice(brace));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseResultFromClientLog(log, kind) {
  for (const marker of ["__PUBLISH_RESULT__", "__JOB_RESULT__"]) {
    const parsed = parseJsonAfterMarker(log, marker);
    if (parsed) return parsed;
  }
  if ((kind === "build" || kind === "build-publish") && /构建完成/.test(log)) {
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

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

let pollTimer = null;
let activeAction = null;
let jobFinishedLocally = false;

function applyConfigFromStatus(data) {
  $("status-line").textContent = `${data.productName} · 发版控制台`;
  $("status-line").style.color = "";
  $("current-version").textContent = data.currentVersion;
  $("publish-version").value = data.currentVersion;

  const cfg = data.publishConfig;
  const hint = $("config-hint");
  hint.style.color = "";
  if (!data.hasPublishConfig) {
    hint.textContent =
      "未找到 publish.config.json，请从 publish.config.example.json 复制并填写 outputDir / publicBaseUrl。";
    hint.style.color = "#e5484d";
    setButtonsDisabled(true);
    setResetButtonEnabled(false);
    return false;
  }
  if (!data.hasSigningKey) {
    hint.textContent =
      "未找到 keys/easydone-updater.key，请先运行: npm run tauri signer generate -- --ci -w keys/easydone-updater.key";
    hint.style.color = "#e5484d";
    setButtonsDisabled(true);
    setResetButtonEnabled(false);
    return false;
  }
  const lines = [`输出目录: ${cfg.outputDir}`, `公网基址: ${cfg.publicBaseUrl}`];
  if (cfg.requireInstallerSignature !== true) {
    lines.push("当前允许无 .sig 发布；应用内更新需签名后才可用。");
    if (!data.signingPasswordConfigured) {
      hint.style.color = "#f5d90a";
    }
  }
  if (!data.signingPasswordConfigured) {
    lines.push(
      "加密签名钥：请在 publish.config.json 填写 signingKeyPassword，或设置环境变量 TAURI_SIGNING_PRIVATE_KEY_PASSWORD（发版 GUI 无法交互输入密码）。",
    );
    hint.style.color = "#f5d90a";
  }
  hint.textContent = lines.join("\n");
  if (data.repoSaveRunning) {
    setButtonsDisabled(true);
    setSaveSlotButtonsDisabled(true);
  }
  return true;
}

async function refreshVersionOnly() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return;
    const data = await res.json();
    $("current-version").textContent = data.currentVersion;
    $("publish-version").value = data.currentVersion;
  } catch {
    /* ignore */
  }
}

async function fetchRepoSaves() {
  const res = await fetch("/api/repo/saves");
  if (!res.ok) return { slots: {} };
  return res.json();
}

async function syncJobUi() {
  const [statusRes, jobRes, savesRes] = await Promise.all([
    fetch("/api/status"),
    fetch("/api/job"),
    fetch("/api/repo/saves"),
  ]);
  if (!statusRes.ok || !jobRes.ok) throw new Error("无法连接发版服务");
  const data = await statusRes.json();
  const job = await jobRes.json();
  if (Array.isArray(data.repoBranches) && data.repoBranches.length) {
    repoBranches = data.repoBranches;
  }
  const savesData = savesRes.ok ? await savesRes.json() : data.savesSummary ?? { slots: {} };
  renderSaveSlots(savesData);
  updateRepoGitHint(data);
  const configOk = applyConfigFromStatus(data);
  if (!configOk) return;

  if (data.repoSaveRunning && !repoPollTimer) {
    void syncRepoJobUi();
  } else if (!data.repoSaveRunning && !data.publishRunning) {
    setButtonsDisabled(false);
    setSaveSlotButtonsDisabled(false);
  } else if (data.publishRunning) {
    setSaveSlotButtonsDisabled(true);
  }

  const log = $("log");

  if (job.running) {
    jobFinishedLocally = false;
    setButtonsDisabled(true);
    setSaveSlotButtonsDisabled(true);
    setResetButtonEnabled(true);
    log.hidden = false;
    updateRunningJobStatus(job);
    if (!pollTimer) startJobPolling();
    return;
  }

  stopPolling();
  jobFinishedLocally = true;
  setButtonsDisabled(false);
  setResetButtonEnabled(true);
  setPublishFieldsForBuildOnly(false);
  activeAction = null;

  if (!job.log) return;

  log.hidden = false;
  const clientResult = job.result ?? parseResultFromClientLog(job.log, job.kind);
  const enrichedJob = clientResult ? { ...job, result: clientResult } : job;

  if (clientResult) {
    finishJob(enrichedJob, log);
  } else if (job.error) {
    showJobFailure(job, log);
  } else {
    renderJobLog(job, log);
  }
}

async function loadStatus() {
  try {
    await syncJobUi();
  } catch {
    showConnectionError("无法连接发版服务");
  }
}

function renderJobLog(job, logEl) {
  const tail = job.log.length > 12000 ? job.log.slice(-12000) : job.log;
  logEl.innerHTML = renderColoredLog(tail || "（等待输出…）");
  logEl.scrollTop = logEl.scrollHeight;
}

function showBuildSuccess(job, logEl) {
  const r = job.result;
  jobFinishedLocally = true;
  stopPolling();
  setJobStatus("构建完成（未发布到内网）", "ok");
  logEl.classList.remove("error");
  logEl.innerHTML = [
    `<span class="log-line log-line-ok">本地构建完成</span>`,
    `<span class="log-line">安装包: ${escapeHtml(r.exePath || "")}</span>`,
    `<span class="log-line">${escapeHtml(r.hint || "可本地双击安装包测试")}</span>`,
    `<span class="log-line log-line-info">--- 构建日志（末尾）---</span>`,
    renderColoredLog(job.log.slice(-4000)),
  ].join("\n");
  setButtonsDisabled(false);
  setResetButtonEnabled(true);
  setPublishFieldsForBuildOnly(false);
  activeAction = null;
}

function showPublishSuccess(job, logEl) {
  const r = job.result;
  jobFinishedLocally = true;
  stopPolling();
  setJobStatus("发布成功", "ok");
  logEl.classList.remove("error");
  logEl.innerHTML = [
    `<span class="log-line log-line-ok">发布成功</span>`,
    `<span class="log-line">版本: ${escapeHtml(r.version)}</span>`,
    `<span class="log-line">大小: ${formatBytes(r.size)}</span>`,
    `<span class="log-line">安装包: ${escapeHtml(r.destExe)}</span>`,
    `<span class="log-line">清单: ${escapeHtml(r.manifestPath)}</span>`,
    r.manifestUrl ? `<span class="log-line">清单 URL: ${escapeHtml(r.manifestUrl)}</span>` : "",
    r.colleagueHint
      ? `<span class="log-line">${escapeHtml(r.colleagueHint)}</span>`
      : "",
    `<span class="log-line log-line-info">--- 构建日志（末尾）---</span>`,
    renderColoredLog(job.log.slice(-4000)),
  ]
    .filter(Boolean)
    .join("\n");
  $("current-version").textContent = r.version;
  setButtonsDisabled(false);
  setResetButtonEnabled(true);
  setPublishFieldsForBuildOnly(false);
  activeAction = null;
}

function isExeLockError(text) {
  const t = (text || "").toLowerCase();
  return (
    /拒绝访问/.test(text || "") ||
    /os error 5/.test(t) ||
    /failed to remove file/.test(t) ||
    /access is denied/.test(t)
  );
}

function exeLockHintHtml(logText) {
  if (!isExeLockError(logText)) return "";
  return `<span class="log-line log-line-warn">请先关闭正在运行的 easydone，或点击重试（构建前会自动结束进程）。</span>`;
}

function showJobFailure(job, logEl) {
  jobFinishedLocally = true;
  stopPolling();
  setJobStatus("任务失败", "err");
  logEl.classList.add("error");
  const logTail = job.log.slice(-6000);
  logEl.innerHTML = [
    `<span class="log-line log-line-err">${escapeHtml(job.error || "任务失败")}</span>`,
    exeLockHintHtml(job.log + (job.error || "")),
    renderColoredLog(logTail),
  ]
    .filter(Boolean)
    .join("\n");
  setButtonsDisabled(false);
  setResetButtonEnabled(true);
  setPublishFieldsForBuildOnly(false);
  activeAction = null;
}

function runningLabel(kind) {
  if (kind === "build") return "构建中…";
  if (kind === "publish") return "发布中…";
  return "构建并发布中…";
}

const SIGNING_STALL_MS = 45_000;

function isSigningPasswordStall(job) {
  if (job.stallReason === "signing_password") return true;
  if (job.signingPasswordConfigured) return false;
  const log = job.log || "";
  if (!/expect a prompt for password/i.test(log)) return false;
  const started =
    typeof job.startedAt === "number" ? job.startedAt : Date.parse(job.startedAt ?? "");
  if (Number.isNaN(started)) return false;
  return Date.now() - started >= SIGNING_STALL_MS;
}

function signingPasswordHintHtml(job) {
  if (!isSigningPasswordStall(job)) return "";
  return `<span class="log-line log-line-warn">构建卡在签名解密：请重启 start-publish-gui.bat（已设 CI=true）、确认无密码密钥，或配置 signingKeyPassword 后重试。可点「重置任务状态」结束当前任务。</span>`;
}

function updateRunningJobStatus(job) {
  if (isSigningPasswordStall(job)) {
    setJobStatus("构建卡在签名解密（见下方说明）", "running");
    return;
  }
  setJobStatus(runningLabel(job.kind || activeAction), "running");
}

function appendSigningHintToLog(logEl, job) {
  const hint = signingPasswordHintHtml(job);
  if (!hint) return;
  const tail = job.log.length > 12000 ? job.log.slice(-12000) : job.log;
  logEl.innerHTML = hint + renderColoredLog(tail || "（等待输出…）");
  logEl.scrollTop = logEl.scrollHeight;
}

function finishJob(job, logEl) {
  const result = job.result ?? parseResultFromClientLog(job.log, job.kind || activeAction);
  if (result) {
    const enriched = { ...job, result };
    const kind = result.kind || job.kind;
    if (kind === "build") {
      showBuildSuccess(enriched, logEl);
    } else {
      showPublishSuccess(enriched, logEl);
      void refreshVersionOnly();
    }
    return;
  }
  showJobFailure(job, logEl);
}

function startJobPolling() {
  if (pollTimer) return;
  const log = $("log");
  log.hidden = false;
  log.classList.remove("error");

  const tick = async () => {
    if (jobFinishedLocally) {
      stopPolling();
      return;
    }
    try {
      const res = await fetch("/api/job");
      const job = await res.json();
      appendSigningHintToLog(log, job);

      const clientResult =
        job.result ?? parseResultFromClientLog(job.log, job.kind || activeAction);
      const enrichedJob = clientResult ? { ...job, result: clientResult } : job;

      if (job.running && !clientResult) {
        updateRunningJobStatus(job);
        setButtonsDisabled(true);
        setResetButtonEnabled(true);
        return;
      }

      stopPolling();
      finishJob(enrichedJob, log);
    } catch (e) {
      stopPolling();
      jobFinishedLocally = true;
      setButtonsDisabled(false);
      setResetButtonEnabled(true);
      setPublishFieldsForBuildOnly(false);
      activeAction = null;
      setJobStatus("轮询失败", "err");
      log.classList.add("error");
      log.textContent = e instanceof Error ? e.message : String(e);
    }
  };

  void tick();
  pollTimer = setInterval(tick, 2000);
}

async function resetJobState() {
  stopPolling();
  try {
    await fetch("/api/job/reset", { method: "POST" });
  } catch {
    /* ignore */
  }
  jobFinishedLocally = false;
  activeAction = null;
  await loadStatus();
}

async function startJob(action) {
  const log = $("log");
  jobFinishedLocally = false;
  stopPolling();
  setButtonsDisabled(true);
  setResetButtonEnabled(true);
  activeAction = action;
  setPublishFieldsForBuildOnly(action === "build");
  log.hidden = false;
  log.classList.remove("error");
  updateRunningJobStatus({ kind: action, log: "", stallReason: null });
  log.innerHTML = `<span class="log-line log-line-info">正在启动任务…请勿关闭 start-publish-gui.bat 窗口。</span>`;

  const body = { action };
  if (action !== "build") {
    body.version = $("publish-version").value.trim();
    body.notes = $("publish-notes").value;
  }

  try {
    const res = await fetch("/api/job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 409) {
      throw new Error(data.error || "已有任务进行中，可点「重置任务状态」");
    }
    if (!data.ok) throw new Error(data.error || "启动失败");
    if (data.started) {
      startJobPolling();
      return;
    }
  } catch (e) {
    jobFinishedLocally = true;
    setJobStatus("启动失败", "err");
    log.classList.add("error");
    log.innerHTML = `<span class="log-line log-line-err">${escapeHtml(e instanceof Error ? e.message : String(e))}</span>`;
    setButtonsDisabled(false);
    setResetButtonEnabled(true);
    setPublishFieldsForBuildOnly(false);
    activeAction = null;
  }
}

$("btn-build").addEventListener("click", () => void startJob("build"));
$("btn-publish-only").addEventListener("click", () => void startJob("publish"));
$("btn-build-publish").addEventListener("click", () => void startJob("build-publish"));
$("btn-reset-job")?.addEventListener("click", () => void resetJobState());

function setRepoJobStatus(text, kind) {
  const el = $("repo-job-status");
  if (!el) return;
  el.hidden = !text;
  el.textContent = text;
  el.className = "job-status";
  if (kind) el.classList.add(kind);
}

function stopRepoPolling() {
  if (repoPollTimer) {
    clearInterval(repoPollTimer);
    repoPollTimer = null;
  }
}

function showRepoSaveSuccess(job, logEl) {
  const r = job.result;
  repoJobFinishedLocally = true;
  stopRepoPolling();
  setRepoJobStatus("存档成功", "ok");
  logEl.classList.remove("error");
  logEl.innerHTML = [
    `<span class="log-line log-line-ok">已推送到 ${escapeHtml(r.branch)}</span>`,
    `<span class="log-line">时间: ${escapeHtml(formatSavedAt(r.savedAt))}</span>`,
    `<span class="log-line">大小: ${formatBytes(r.sizeBytes)}</span>`,
    r.commit ? `<span class="log-line">提交: ${escapeHtml(r.commit)}</span>` : "",
    r.remoteUrl ? `<span class="log-line">远程: ${escapeHtml(r.remoteUrl)}</span>` : "",
    `<span class="log-line log-line-info">--- 日志（末尾）---</span>`,
    renderColoredLog(job.log.slice(-5000)),
  ]
    .filter(Boolean)
    .join("\n");
  setButtonsDisabled(false);
  setSaveSlotButtonsDisabled(false);
  activeRepoBranch = null;
  void loadStatus();
}

function showRepoSaveFailure(job, logEl) {
  repoJobFinishedLocally = true;
  stopRepoPolling();
  setRepoJobStatus("存档失败", "err");
  logEl.classList.add("error");
  logEl.innerHTML = [
    `<span class="log-line log-line-err">${escapeHtml(job.error || "存档失败")}</span>`,
    renderColoredLog(job.log.slice(-6000)),
  ].join("\n");
  setButtonsDisabled(false);
  setSaveSlotButtonsDisabled(false);
  activeRepoBranch = null;
  void loadStatus();
}

async function syncRepoJobUi() {
  try {
    const [statusRes, jobRes] = await Promise.all([fetch("/api/status"), fetch("/api/repo/job")]);
    if (!statusRes.ok || !jobRes.ok) return;
    const status = await statusRes.json();
    const job = await jobRes.json();
    const log = $("repo-log");
    if (!log) return;

    if (job.running) {
      repoJobFinishedLocally = false;
      setButtonsDisabled(true);
      setSaveSlotButtonsDisabled(true);
      log.hidden = false;
      setRepoJobStatus(`正在保存到 ${job.branch || activeRepoBranch || "…"}…`, "running");
      renderJobLog(job, log);
      if (!repoPollTimer) {
        repoPollTimer = setInterval(() => void syncRepoJobUi(), 2000);
      }
      return;
    }

    stopRepoPolling();
    if (!job.log && !job.error && !job.result) return;

    log.hidden = false;
    if (job.result?.kind === "repo-save") {
      showRepoSaveSuccess(job, log);
    } else if (job.error) {
      showRepoSaveFailure(job, log);
    } else {
      const parsed = parseJsonAfterMarker(job.log, "__REPO_SAVE_RESULT__");
      if (parsed) showRepoSaveSuccess({ ...job, result: parsed }, log);
      else if (job.error) showRepoSaveFailure(job, log);
      else renderJobLog(job, log);
    }
  } catch {
    /* ignore */
  }
}

async function resetRepoJobState() {
  stopRepoPolling();
  try {
    await fetch("/api/repo/reset", { method: "POST" });
  } catch {
    /* ignore */
  }
  repoJobFinishedLocally = false;
  activeRepoBranch = null;
  await loadStatus();
}

async function startRepoSave(branch) {
  const log = $("repo-log");
  repoJobFinishedLocally = false;
  stopRepoPolling();
  activeRepoBranch = branch;
  setButtonsDisabled(true);
  setSaveSlotButtonsDisabled(true);
  if (log) {
    log.hidden = false;
    log.classList.remove("error");
    log.innerHTML = `<span class="log-line log-line-info">正在启动存档到 ${escapeHtml(branch)}…</span>`;
  }
  setRepoJobStatus(`正在保存到 ${branch}…`, "running");

  try {
    const res = await fetch("/api/repo/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch }),
    });
    const data = await res.json();
    if (res.status === 409) {
      throw new Error(data.error || "已有任务进行中");
    }
    if (!data.ok) throw new Error(data.error || "启动失败");
    repoPollTimer = setInterval(() => void syncRepoJobUi(), 2000);
    void syncRepoJobUi();
  } catch (e) {
    repoJobFinishedLocally = true;
    setRepoJobStatus("启动失败", "err");
    if (log) {
      log.classList.add("error");
      log.innerHTML = `<span class="log-line log-line-err">${escapeHtml(e instanceof Error ? e.message : String(e))}</span>`;
    }
    setButtonsDisabled(false);
    setSaveSlotButtonsDisabled(false);
    activeRepoBranch = null;
  }
}

$("btn-reset-repo-job")?.addEventListener("click", () => void resetRepoJobState());

void loadStatus();
