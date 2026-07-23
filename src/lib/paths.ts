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

export function excelRankPath(root: string) {
  return joinPaths(root, "Excel", "Rank.xlsx");
}

export function taskCsvCandidatePaths(root: string): string[] {
  return [joinPaths(root, "Config", "task.csv"), joinPaths(root, "Config", "Task.csv")];
}

export function itemCsvCandidatePaths(root: string): string[] {
  return [joinPaths(root, "Config", "Item.csv"), joinPaths(root, "Config", "item.csv")];
}

export function rankCsvCandidatePaths(root: string): string[] {
  return [joinPaths(root, "Config", "Rank.csv"), joinPaths(root, "Config", "rank.csv")];
}

export function rankingSeasonInfoCsvCandidatePaths(root: string): string[] {
  return [
    joinPaths(root, "Config", "RankingSeasonInfo.csv"),
    joinPaths(root, "Config", "rankingSeasonInfo.csv"),
  ];
}

export function conditionCsvPath(root: string) {
  return joinPaths(root, "Config", "Condition.csv");
}

export function clientMapDataDir(root: string) {
  return joinPaths(root, "Client", "Assets", "AssetBox", "ResFolder", "Config", "MapData");
}

export function matchMapConfigJsonPath(root: string) {
  return joinPaths(
    root,
    "Client",
    "Assets",
    "Resources",
    "Config",
    "MatchMapConfigData",
    "MatchMapConfigData.json",
  );
}

export function mainLevelCsvCandidatePaths(root: string): string[] {
  return [
    joinPaths(root, "Config", "MainLevel.csv"),
    joinPaths(
      root,
      "Server",
      "gs",
      "gameserver",
      "cmd",
      "kradserver",
      "Data",
      "CSV",
      "MainLevel.csv",
    ),
  ];
}

export function clientScenesMatchConfigDir(root: string) {
  return joinPaths(root, "Client", "Assets", "Scenes", "Game", "MatchConfigMap");
}

function serverCsvDir(root: string) {
  return joinPaths(root, "Server", "gs", "gameserver", "cmd", "kradserver", "Data", "CSV");
}

export function monsterBaseCsvCandidatePaths(root: string): string[] {
  return [joinPaths(root, "Config", "MonsterBase.csv"), joinPaths(serverCsvDir(root), "MonsterBase.csv")];
}

export function skillCsvCandidatePaths(root: string): string[] {
  return [joinPaths(root, "Config", "Skill.csv"), joinPaths(serverCsvDir(root), "Skill.csv")];
}

export function masteryCsvCandidatePaths(root: string): string[] {
  return [
    joinPaths(root, "Config", "ClassMastery.csv"),
    joinPaths(serverCsvDir(root), "ClassMastery.csv"),
  ];
}
