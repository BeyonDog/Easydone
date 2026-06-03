/**
 * Release build preflight: stop easydone.exe and verify target exe is writable (Windows).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseExe = path.join(root, "src-tauri", "target", "release", "easydone.exe");

function killEasydoneOnWindows() {
  if (process.platform !== "win32") return;
  const r = spawnSync("taskkill", ["/F", "/IM", "easydone.exe"], {
    encoding: "utf8",
    shell: false,
  });
  const combined = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status === 0) {
    console.log("[unlock] 已结束正在运行的 easydone.exe");
    return;
  }
  if (r.status === 128 || /找不到|没有找到|not found|no tasks/i.test(combined)) {
    return;
  }
  console.warn("[unlock] taskkill 未完全成功，继续检查文件是否可写…");
}

function probeExeWritable() {
  if (!fs.existsSync(releaseExe)) return true;
  try {
    const fd = fs.openSync(releaseExe, "r+");
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function main() {
  killEasydoneOnWindows();
  if (process.platform === "win32" && fs.existsSync(releaseExe)) {
    // Brief pause so Windows releases file handles after taskkill.
    spawnSync("powershell", ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 400"], {
      stdio: "ignore",
    });
  }
  if (!probeExeWritable()) {
    console.error(
      "[unlock] 无法写入 release 二进制，文件仍被占用：\n" +
        `  ${releaseExe}\n` +
        "请先关闭正在运行的 easydone（含托盘），或在任务管理器中结束 easydone.exe / cargo.exe，然后重试构建。",
    );
    process.exit(1);
  }
  if (process.platform === "win32") {
    console.log("[unlock] release 二进制可写，继续构建");
  }
}

main();
