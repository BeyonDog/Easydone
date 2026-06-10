import { invoke } from "@tauri-apps/api/core";
import { itemCsvCandidatePaths } from "./paths";

export async function resolveItemCsvPath(workspaceRoot: string): Promise<string | null> {
  const root = workspaceRoot.trim();
  if (!root) return null;
  for (const p of itemCsvCandidatePaths(root)) {
    try {
      const ok = await invoke<boolean>("path_is_file", { path: p });
      if (ok) return p;
    } catch {
      /* try next */
    }
  }
  return null;
}
