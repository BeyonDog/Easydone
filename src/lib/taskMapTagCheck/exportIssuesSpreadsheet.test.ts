import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTaskIdFillColorMap,
  exportIssuesToSpreadsheetXml,
  TASK_ID_FILL_COLORS,
} from "./exportIssuesSpreadsheet.ts";
import type { TagCheckIssue } from "./types.ts";

function miniIssue(taskId: string, taskName: string): TagCheckIssue {
  return {
    severity: "error",
    kind: "missing_tag",
    taskId,
    taskName,
    conditionId: "1",
    conditionRemark: "",
    targetTag: 100,
    mapId: 202,
    mapName: "洛萨王城",
    variantLabel: "单人",
    terrain: "ice",
    playerMode: "solo",
    matchTier: "casual",
    variantSuffix: "GW",
    mapDataFile: "Map202.asset",
    layerFilesChecked: [],
    message: "msg",
  };
}

describe("buildTaskIdFillColorMap", () => {
  it("assigns same color to repeated taskId", () => {
    const map = buildTaskIdFillColorMap(["100", "200", "100", "200"]);
    assert.equal(map.get("100"), map.get("100"));
    assert.equal(map.get("100"), TASK_ID_FILL_COLORS[0]);
    assert.equal(map.get("200"), TASK_ID_FILL_COLORS[1]);
    assert.equal(map.size, 2);
  });

  it("cycles palette for many distinct taskIds", () => {
    const ids = Array.from({ length: TASK_ID_FILL_COLORS.length + 2 }, (_, i) => String(i));
    const map = buildTaskIdFillColorMap(ids);
    assert.equal(map.get("0"), TASK_ID_FILL_COLORS[0]);
    assert.equal(map.get(String(TASK_ID_FILL_COLORS.length)), TASK_ID_FILL_COLORS[0]);
  });
});

describe("exportIssuesToSpreadsheetXml", () => {
  it("embeds per-taskId fill styles and escapes xml without task name column", () => {
    const xml = exportIssuesToSpreadsheetXml([
      miniIssue("100", "任务A"),
      miniIssue("100", "任务A"),
      miniIssue("200", "任务B & <C>"),
    ]);
    assert.match(xml, /<Data ss:Type="String">任务ID<\/Data>/);
    assert.doesNotMatch(xml, /<Data ss:Type="String">任务<\/Data>/);
    assert.doesNotMatch(xml, /任务A/);
    assert.match(xml, /ss:Color="#E8F0FE"/);
    assert.match(xml, /ss:Color="#E6F4EA"/);
    assert.equal((xml.match(/ss:StyleID="fill0"/g) ?? []).length, 2);
    assert.match(xml, /&amp; &lt;C&gt;/);
    assert.match(xml, /<Worksheet ss:Name="问题列表">/);
  });
});
