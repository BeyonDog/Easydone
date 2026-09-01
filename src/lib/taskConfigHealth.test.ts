import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isExcludedFromMapCheck } from "./taskMapTagCheck/constants.ts";
import {
  collectFieldIssues,
  mergeTaskConditionRefsWithCsv,
  parseConditionCsvAll,
  parseTaskConditionRefs,
  parseTaskCsvAll,
} from "./taskConfigHealth.ts";

const TASK_HEADER = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,`;

const COND_HEADER = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2,PreCdtType3,Comparison3,PreCdtValue3
conditionID,,,,,条件类型,条件值,,,,,,,,,`;

describe("isExcludedFromMapCheck", () => {
  it("excludes daily, weekly, tutorial and listed ids", () => {
    assert.equal(isExcludedFromMapCheck(10001), true);
    assert.equal(isExcludedFromMapCheck(10012), true);
    assert.equal(isExcludedFromMapCheck(10013), false);
    assert.equal(isExcludedFromMapCheck(2000001), true);
    assert.equal(isExcludedFromMapCheck(2000008), true);
    assert.equal(isExcludedFromMapCheck(100000), true);
    assert.equal(isExcludedFromMapCheck(30000), true);
    assert.equal(isExcludedFromMapCheck(30035), true);
    assert.equal(isExcludedFromMapCheck(9000001), true);
    assert.equal(isExcludedFromMapCheck(3000036), false);
  });
});

describe("collectFieldIssues", () => {
  it("reports empty Conditions on non-excluded tasks", () => {
    const tasks = parseTaskCsvAll(`${TASK_HEADER}
4002001,4,0,,,,,,,,,,,,,,,
`);
    const issues = collectFieldIssues(tasks, []);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.kind, "empty_conditions");
    assert.equal(issues[0]!.taskId, "4002001");
  });

  it("does not report excluded tasks with empty Conditions", () => {
    const tasks = parseTaskCsvAll(`${TASK_HEADER}
10001,1,0,,,,,,,,,,,,,,,
2000001,2,0,,,,,,,,,,,,,,,
100000,1,0,,,,,,,,,,,,,,,
`);
    assert.equal(collectFieldIssues(tasks, []).length, 0);
  });

  it("reports dangling condition ids", () => {
    const tasks = parseTaskCsvAll(`${TASK_HEADER}
4002001,4,0,,,,,,,,,,,,,,,999888,1,
`);
    const issues = collectFieldIssues(tasks, []);
    assert.equal(issues.some((i) => i.kind === "dangling_condition" && i.conditionId === "999888"), true);
  });

  it("reports arrive conditions missing LocationId", () => {
    const tasks = parseTaskCsvAll(`${TASK_HEADER}
4002001,4,0,,,,,,,,,,,,,,,500001,1,
`);
    const conditions = parseConditionCsvAll(`${COND_HEADER}
500001,0,False,False,True,2,1
`);
    const issues = collectFieldIssues(tasks, conditions);
    assert.equal(issues.some((i) => i.kind === "missing_field" && i.conditionId === "500001"), true);
  });

  it("reports unknown CdtType", () => {
    const tasks = parseTaskCsvAll(`${TASK_HEADER}
4002001,4,0,,,,,,,,,,,,,,,500002,1,
`);
    const conditions = parseConditionCsvAll(`${COND_HEADER}
500002,0,False,False,True,9999,1
`);
    const issues = collectFieldIssues(tasks, conditions);
    assert.equal(issues.some((i) => i.kind === "unknown_cdt_type" && i.conditionId === "500002"), true);
  });
});

describe("parseTaskConditionRefs", () => {
  it("reads Conditions and ConditionRelation from a task sheet row", () => {
    const aoa = [
      ["任务ID", "Conditions", "ConditionRelation"],
      ["4002001", "400231;400232", "1"],
    ];
    const parsed = parseTaskConditionRefs(aoa, 0);
    assert.deepEqual(parsed, {
      taskId: "4002001",
      conditionIds: ["400231", "400232"],
      relationRaw: "1",
    });
  });

  it("falls back to Task.csv Conditions when the sheet row has none", () => {
    const sheet = parseTaskConditionRefs(
      [
        ["任务ID", "备注"],
        ["4002001", "营地"],
      ],
      0,
    );
    assert.ok(sheet);
    const merged = mergeTaskConditionRefsWithCsv(sheet, [
      { taskId: "4002001", taskName: "营地", conditionsRaw: "400231", relationRaw: "0" },
    ]);
    assert.deepEqual(merged.conditionIds, ["400231"]);
  });
});
