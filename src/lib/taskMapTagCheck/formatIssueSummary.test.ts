import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatIssueDescription, formatIssueReason } from "./formatIssueSummary.ts";
import type { TagCheckIssue } from "./types.ts";

function baseIssue(partial: Partial<TagCheckIssue>): TagCheckIssue {
  return {
    severity: "error",
    kind: "missing_tag",
    taskId: "3000036",
    taskName: "王权的终章",
    conditionId: "30000361",
    conditionRemark: "",
    targetTag: 1013001,
    mapId: 204,
    mapName: "王城",
    variantLabel: "单人困难",
    terrain: "ice",
    playerMode: "solo",
    matchTier: "hard",
    variantSuffix: "GW_Singlemode_Hard",
    mapDataFile: "Map204_GW_Singlemode_Hard_MapData.asset",
    layerFilesChecked: [],
    sceneFile: "MatchConfigMap/Map204_GW_Singlemode_Hard.unity",
    message: "long message",
    ...partial,
  };
}

describe("formatIssueSummary", () => {
  it("formats missing_tag description and reason", () => {
    const issue = baseIssue({ kind: "missing_tag" });
    assert.equal(formatIssueDescription(issue), "缺少 Tag 1013001");
    const reason = formatIssueReason(issue);
    assert.match(reason, /王城/);
    assert.match(reason, /单人/);
    assert.match(reason, /挑战/);
    assert.match(reason, /Map204_GW_Singlemode_Hard/);
    assert.ok(!reason.includes("任务 3000036"));
    assert.ok(!reason.includes("王权的终章"));
  });

  it("formats config_missing description and reason", () => {
    const issue = baseIssue({
      kind: "config_missing",
      conditionKind: "kill",
      targetTag: 9999999,
      mapName: "",
      sceneFile: "",
      mapDataFile: "",
      matchTier: "other",
    });
    assert.equal(formatIssueDescription(issue), "配置表缺少目标 9999999");
    assert.match(formatIssueReason(issue), /条件 30000361/);
  });

  it("formats scope_unresolved description and reason", () => {
    const issue = baseIssue({
      kind: "scope_unresolved",
      severity: "warn",
      mapName: "",
      sceneFile: "",
      mapDataFile: "",
      matchTier: "other",
      message: "任务/条件描述为地图内交互，但未配置 GameMode(49)，无法确定目标地图",
    });
    assert.equal(formatIssueDescription(issue), "未配置 GameMode，无法确定目标地图");
    assert.match(formatIssueReason(issue), /条件 30000361/);
    assert.match(formatIssueReason(issue), /GameMode/);
  });
});
