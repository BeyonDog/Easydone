import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";

let flushOnClose: (() => void) | null = null;
let registered = false;

export function setWindowCloseFlush(fn: () => void) {
  flushOnClose = fn;
}

/** Register once for app lifetime; never unlisten (Tauri close breaks after unlisten). */
export function initWindowCloseHandler() {
  if (registered || !isTauri()) return;

  const register = async () => {
    if (registered) return;
    await getCurrentWindow().onCloseRequested(async () => {
      try {
        flushOnClose?.();
      } finally {
        try {
          await getCurrentWindow().destroy();
        } catch {
          await exit(0);
        }
      }
    });
    registered = true;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void register(), { once: true });
  } else {
    void register();
  }
}
