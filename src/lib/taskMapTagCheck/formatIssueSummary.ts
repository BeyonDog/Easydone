import type { TagCheckIssue } from "./types.ts";

function tierLabel(t: string): string {
  if (t === "casual") return "普通";
  if (t === "hard") return "挑战";
  if (t === "hell") return "地狱";
  return t || "";
}

function modeContext(issue: TagCheckIssue): string {
  const parts: string[] = [];
  if (issue.mapName) parts.push(issue.mapName);
  if (issue.matchTier && issue.matchTier !== "other") parts.push(tierLabel(issue.matchTier));
  if (issue.playerMode) parts.push(issue.playerMode === "solo" ? "单人" : "多人");
  if (issue.terrain) parts.push(issue.terrain === "fire" ? "火" : "冰");
  return parts.join(" · ");
}

/** Short problem description for the results table. */
export function formatIssueDescription(issue: TagCheckIssue): string {
  switch (issue.kind) {
    case "missing_tag":
      return `缺少 Tag ${issue.targetTag}`;
    case "file_missing":
      return `MapData 文件缺失${issue.mapDataFile ? `：${issue.mapDataFile}` : ""}`;
    case "csv_xlsx_mismatch":
      return `Condition.csv 与 Mission.xlsx Tag 不一致（${issue.targetTag}）`;
    case "tag_count_mismatch":
      return `Tag ${issue.targetTag} 各分层数量不一致`;
    case "live_layer_missing":
      return `Tag ${issue.targetTag} 仅在 legacy 分层存在，live Map204 缺失`;
    case "config_missing":
      return `配置表缺少目标 ${issue.targetTag}`;
    case "scope_unresolved":
      return "未配置 GameMode，无法确定目标地图";
    default:
      return issue.message || "未知问题";
  }
}

/** Compact reason / context; avoids repeating task id. */
export function formatIssueReason(issue: TagCheckIssue): string {
  const mode = modeContext(issue);
  switch (issue.kind) {
    case "missing_tag":
    case "file_missing":
    case "tag_count_mismatch":
    case "live_layer_missing": {
      const bits = [mode, issue.sceneFile || issue.mapDataFile, issue.conditionId ? `条件 ${issue.conditionId}` : ""]
        .filter(Boolean);
      return bits.join(" · ") || issue.message;
    }
    case "csv_xlsx_mismatch":
      return issue.conditionId ? `条件 ${issue.conditionId}` : issue.message;
    case "config_missing":
      return [issue.conditionId ? `条件 ${issue.conditionId}` : "", issue.conditionKind ?? ""]
        .filter(Boolean)
        .join(" · ") || issue.message;
    case "scope_unresolved":
      return (
        [issue.conditionId ? `条件 ${issue.conditionId}` : "", issue.message]
          .filter(Boolean)
          .join(" · ") || "建议补条件前置 GameMode(49) 或核对 Mission 描述"
      );
    default:
      return mode || issue.message;
  }
}
