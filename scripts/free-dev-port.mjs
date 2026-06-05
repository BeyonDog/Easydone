/**
 * Free Vite dev port (1420) before `npm run dev` so strictPort does not fail.
 * Used by Tauri beforeDevCommand via package.json "dev" script.
 */
import { execSync } from "node:child_process";

const DEV_PORT = 1420;

function freePortWindows(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`[free-dev-port] ended PID ${pid} on port ${port}`);
      } catch {
        // process may have already exited
      }
    }
  } catch {
    // no listener or netstat failed — ok
  }
}

function freePortUnix(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] })
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    for (const pid of pids) {
      try {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        console.log(`[free-dev-port] ended PID ${pid} on port ${port}`);
      } catch {
        // ignore
      }
    }
  } catch {
    // lsof returns non-zero when nothing is listening
  }
}

if (process.platform === "win32") {
  freePortWindows(DEV_PORT);
} else {
  try {
    execSync("which lsof", { stdio: "ignore" });
    freePortUnix(DEV_PORT);
  } catch {
    console.warn("[free-dev-port] lsof not found; skip port cleanup");
  }
}
