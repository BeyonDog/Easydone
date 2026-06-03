/**
 * Resolve git executable when not on PATH (common on Windows GUI / service launches).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/** @type {string | null | undefined} */
let cached = undefined;

/**
 * @param {object | null | undefined} publishConfig
 * @returns {string[]}
 */
function explicitCandidates(publishConfig) {
  const gh = publishConfig?.github ?? {};
  const fromCfg = gh.gitPath || gh.gitExe;
  const fromEnv = process.env.EASYDONE_GIT || process.env.GIT_PATH;
  const raw = [fromCfg, fromEnv].filter(Boolean).map((s) => String(s).trim());
  return raw;
}

/**
 * @returns {string[]}
 */
function windowsInstallCandidates() {
  if (process.platform !== "win32") return [];
  const dirs = [];
  const local = process.env.LOCALAPPDATA;
  const pf = process.env.ProgramFiles;
  const pf86 = process.env["ProgramFiles(x86)"];
  if (local) dirs.push(path.join(local, "Programs", "Git"));
  if (pf) dirs.push(path.join(pf, "Git"));
  if (pf86) dirs.push(path.join(pf86, "Git"));
  const exes = [];
  for (const base of dirs) {
    exes.push(path.join(base, "cmd", "git.exe"));
    exes.push(path.join(base, "bin", "git.exe"));
  }
  return exes;
}

/**
 * @param {string} exe
 */
function probeGit(exe) {
  try {
    const r = spawnSync(exe, ["--version"], {
      encoding: "utf8",
      shell: exe === "git" && process.platform === "win32",
      windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

/**
 * @param {object | null | undefined} [publishConfig]
 * @returns {string | null} Absolute path to git.exe, or "git" if found on PATH
 */
export function resolveGitExe(publishConfig = null) {
  if (cached !== undefined) return cached;

  const tried = new Set();
  const queue = [...explicitCandidates(publishConfig), "git", ...windowsInstallCandidates()];

  for (const exe of queue) {
    if (!exe || tried.has(exe)) continue;
    tried.add(exe);

    if (exe !== "git") {
      const resolved = path.isAbsolute(exe) ? exe : path.resolve(exe);
      if (!fs.existsSync(resolved)) continue;
      if (probeGit(resolved)) {
        cached = resolved;
        return cached;
      }
      continue;
    }

    if (probeGit("git")) {
      cached = "git";
      return cached;
    }
  }

  cached = null;
  return null;
}

/**
 * @param {object | null | undefined} [publishConfig]
 */
export function isGitAvailable(publishConfig = null) {
  return resolveGitExe(publishConfig) != null;
}

/**
 * Clear cached resolution (tests / config reload).
 */
export function resetGitExeCache() {
  cached = undefined;
}
