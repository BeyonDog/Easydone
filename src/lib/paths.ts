/** Join path segments using the separator style of the first segment (Windows vs POSIX). */
export function joinPaths(...parts: string[]): string {
  if (parts.length === 0) return "";
  const sep = parts[0].includes("\\") ? "\\" : "/";
  return parts
    .map((p, i) => (i === 0 ? p.replace(/[/\\]+$/, "") : p.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "")))
    .filter(Boolean)
    .join(sep);
}

export function excelItemPath(root: string) {
  return joinPaths(root, "Excel", "Item.xlsx");
}

export function excelMissionPath(root: string) {
  return joinPaths(root, "Excel", "Mission.xlsx");
}

export function excelAccountPath(root: string) {
  return joinPaths(root, "Excel", "Account.xlsx");
}

export function taskCsvCandidatePaths(root: string): string[] {
  return [joinPaths(root, "Config", "task.csv"), joinPaths(root, "Config", "Task.csv")];
}
