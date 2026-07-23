import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mapDataHasTag, parseMapDataAsset } from "./parseMapDataAsset.ts";
import {
  parseConditionCsv,
  parseTaskCsvForConditions,
  attachTasksToConditions,
  detectKind,
} from "./parseConditions.ts";
import { parseMonsterCatalog, parseSkillIdSet } from "./parseConfigCatalogs.ts";
import { runTagCheck } from "./runTagCheck.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const fixtureSnippet = readFileSync(join(__dir, "fixtures/map202-hard-snippet.asset.txt"), "utf8");

const MINI_MATCH_CONFIG = JSON.stringify({
  Data: [
    {
      MapId: 202,
      MapName: "王城202",
      ScenePath: [
        {
          Mode: "困难多人",
          Difficulty: 2002,
          ConfigPath: "MatchConfigMap/Map202_GW_Hard.unity",
          IfOnline: 1,
        },
        {
          Mode: "单人困难",
          Difficulty: 2004,
          ConfigPath: "MatchConfigMap/Map202_GW_Singlemode_Hard.unity",
          IfOnline: 1,
        },
      ],
    },
    {
      MapId: 203,
      MapName: "王城203",
      ScenePath: [
        {
          Mode: "困难多人",
          Difficulty: 2002,
          ConfigPath: "MatchConfigMap/Map203_GW_Hard.unity",
          IfOnline: 1,
        },
        {
          Mode: "单人困难",
          Difficulty: 2004,
          ConfigPath: "MatchConfigMap/Map203_GW_Singlemode_Hard.unity",
          IfOnline: 1,
        },
      ],
    },
  ],
});

describe("parseMapDataAsset", () => {
  it("parses chest InstTags and triggerTags", () => {
    const parsed = parseMapDataAsset(fixtureSnippet, "Map202_GW_Hard");
    assert.equal(parsed.chestRecords.length, 2);
    assert.ok(mapDataHasTag(parsed, 1013001, "chest_tag"));
    assert.ok(mapDataHasTag(parsed, 30000220, "chest_tag"));
    assert.ok(mapDataHasTag(parsed, 1012, "arrive"));
    assert.equal(mapDataHasTag(parsed, 999999, "chest_tag"), false);
  });
});

describe("parseConditionCsv scope", () => {
  it("classifies chest, arrive, kill, skill kinds (excludes interact from scan)", () => {
    const csv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2,PreCdtType3,Comparison3,PreCdtValue3
conditionID,,,,,条件类型,条件值,,,,,,,,,
30000361,10103,False,False,True,4,1,29,0,1013001,15,1,2,49,0,101
400070,10103,False,False,True,2,1,3,0,1012,49,0,101,,0,
30100040,0,False,False,True,24,2,2,0,2,,0,,,0,
30100340,0,False,False,True,24,5,2,0,3,26,0,1030201,49,0,101
30000100,0,False,False,True,4,5,8,0,2,49,0,101,,0,
30000161,0,False,False,True,4,1,11,0,10101,,0,,,0,`;
    const rows = parseConditionCsv(csv);
    const byId = Object.fromEntries(rows.map((r) => [r.conditionId, r]));
    assert.equal(byId["30000361"]!.kind, "chest_tag");
    assert.equal(byId["400070"]!.kind, "arrive");
    assert.equal(byId["30100040"]!.kind, "kill");
    assert.equal(byId["30100340"]!.kind, "kill");
    assert.ok(byId["30100340"]!.configTargets.some((t) => t.kind === "skill_id" && t.value === 1030201));
    assert.equal(byId["30000100"], undefined);
    assert.equal(byId["30000161"], undefined);
  });

  it("detectKind still recognizes interact kinds", () => {
    assert.equal(
      detectKind(4, [
        { type: 8, comparison: 0, value: 2 },
        { type: 49, comparison: 0, value: 101 },
      ]),
      "interact_type",
    );
    assert.equal(detectKind(4, [{ type: 11, comparison: 0, value: 10101 }]), "interact_ref");
  });

  it("detectKind returns null for escape/get_items", () => {
    assert.equal(detectKind(27, [{ type: 49, comparison: 0, value: 101 }]), null);
    assert.equal(detectKind(3, [{ type: 4, comparison: 0, value: 1 }]), null);
  });
});

describe("interact conditions excluded from scan", () => {
  it("runTagCheck does not emit mapping_pending for InteractiveType/ReferenceId", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2
conditionID,,,,,条件类型,条件值,,,,,,
30000100,0,False,False,True,4,5,8,0,2,49,0,101
30000161,0,False,False,True,4,1,11,0,10101`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000010,3,0,300,,,,,,,,,,,,,,30000100,1,
3000016,3,0,300,,,,,,,,,,,,,,30000161,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MINI_MATCH_CONFIG,
      mapDataByFileName: {},
    });
    assert.equal(report.conditions.length, 0);
    assert.equal(report.issues.length, 0);
  });
});

describe("TaskType=3 filter", () => {
  it("ignores non-mainline tasks when attaching", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1
conditionID,,,,,条件类型,条件值,,,
900001,0,False,False,True,4,1,29,0,1013001`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
10000,6,1,,,,,,,,,,,,,,,900001,1,
3000036,3,0,,,,,,,,,,,,,,,900001,1,`;
    const conds = attachTasksToConditions(
      parseConditionCsv(conditionCsv),
      parseTaskCsvForConditions(taskCsv),
    );
    assert.equal(conds.length, 1);
    assert.deepEqual(conds[0]!.taskIds, ["3000036"]);
  });

  it("excludes tutorial/test task ids 30000-30035 and 9000001", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1
conditionID,,,,,条件类型,条件值,,,
900010,0,False,False,True,4,1,29,0,1013001
900011,0,False,False,True,4,1,29,0,1013001`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
30025,3,0,,,,,,,,,,,,,,,900010,1,
9000001,3,0,,,,,,,,,,,,,,,900010,1,
3000036,3,0,,,,,,,,,,,,,,,900011,1,`;
    const conds = attachTasksToConditions(
      parseConditionCsv(conditionCsv),
      parseTaskCsvForConditions(taskCsv),
    );
    assert.equal(conds.length, 1);
    assert.equal(conds[0]!.conditionId, "900011");
    assert.deepEqual(conds[0]!.taskIds, ["3000036"]);
  });
});

describe("runTagCheck", () => {
  it("reports missing tag when no layer has the tag", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2,PreCdtType3,Comparison3,PreCdtValue3,PreCdtRelation
conditionID,,,,,条件类型,条件值,,,,,,,,,,,
30000362,10103,False,False,True,4,1,29,0,1008001,15,1,2,49,0,101,,0,,,0,,,0,,0`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000036,3,0,300,1004,,,,1,,True,,,,,,,30000362,11000448,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MINI_MATCH_CONFIG,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": fixtureSnippet,
        "Map203_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map202_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map203_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
      },
    });
    const missing = report.issues.filter((i) => i.kind === "missing_tag");
    assert.ok(missing.length >= 1);
    assert.ok(missing.some((i) => i.targetTag === 1008001));
  });

  it("emits separate missing_tag per mode when only Hard has the tag", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2,PreCdtType3,Comparison3,PreCdtValue3
conditionID,,,,,条件类型,条件值,,,,,,,,,
30000361,10103,False,False,True,4,1,29,0,1013001,15,1,2,49,0,101`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000036,3,0,,,,,,,,,,,,,,,30000361,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MINI_MATCH_CONFIG,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": fixtureSnippet,
        "Map203_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map202_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map203_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
      },
    });
    const missing = report.issues.filter((i) => i.kind === "missing_tag" && i.targetTag === 1013001);
    assert.ok(missing.some((i) => i.playerMode === "solo"), JSON.stringify(missing.map((i) => i.playerMode + ":" + i.variantSuffix)));
    assert.equal(
      missing.filter((i) => i.playerMode === "multi").length,
      0,
      "multi Hard should pass via Map202 fixture",
    );
  });

  it("passes when tag exists in any layer of the group", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2,PreCdtRelation
conditionID,,,,,条件类型,条件值,,,,,,,
30000361,10103,False,False,True,4,1,29,0,1013001,15,1,2,,0,,,0,,0`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000036,3,0,300,1004,,,,1,,True,,,,,,,30000361,11000448,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MINI_MATCH_CONFIG,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": fixtureSnippet,
        "Map203_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map202_GW_Singlemode_Hard_MapData.asset": fixtureSnippet,
        "Map203_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
      },
    });
    assert.equal(report.issues.filter((i) => i.kind === "missing_tag").length, 0);
  });

  it("reports config_missing for unknown skill id", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2
conditionID,,,,,条件类型,条件值,,,,,,
30100340,0,False,False,True,24,5,2,0,3,26,0,9999999`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3010034,3,0,,,,,,,,,,,,,,,30100340,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MINI_MATCH_CONFIG,
      mapDataByFileName: {},
      monsterCatalog: parseMonsterCatalog("MonsterId,MonsterGroupId,TagGroup,MonsterType\nid,,,\n2001,2001,,3\n"),
      skillIds: parseSkillIdSet("SkillId\nid\n1030201\n"),
    });
    assert.ok(report.issues.some((i) => i.kind === "config_missing" && i.targetTag === 9999999), JSON.stringify(report));
  });
});

const MATCH_WITH_CEMETERY = JSON.stringify({
  Data: [
    ...JSON.parse(MINI_MATCH_CONFIG).Data,
    {
      MapId: 503,
      MapName: "大墓地",
      ScenePath: [
        {
          Mode: "困难多人",
          Difficulty: 2002,
          ConfigPath: "MatchConfigMap/Map503_Cemetery_Hard.unity",
          IfOnline: 1,
        },
      ],
    },
  ],
});

const MATCH_WITH_GW_NON_WANGCHENG = JSON.stringify({
  Data: [
    ...JSON.parse(MINI_MATCH_CONFIG).Data,
    {
      MapId: 401,
      MapName: "海盗洞窟",
      ScenePath: [
        {
          Mode: "困难多人",
          Difficulty: 2002,
          ConfigPath: "MatchConfigMap/Map401_GW_Normal.unity",
          IfOnline: 1,
        },
      ],
    },
    {
      MapId: 503,
      MapName: "无限域6v6竞技场",
      ScenePath: [
        {
          Mode: "困难多人",
          Difficulty: 2002,
          ConfigPath: "MatchConfigMap/Map503_GW_Arena.unity",
          IfOnline: 1,
        },
      ],
    },
    {
      MapId: 301,
      MapName: "新圣堂地图",
      ScenePath: [
        {
          Mode: "困难多人",
          Difficulty: 2002,
          ConfigPath: "MatchConfigMap/Map301_GW_SingleMode_Hard.unity",
          IfOnline: 1,
        },
      ],
    },
  ],
});

describe("map scope narrowing", () => {
  it("GameMode=101 ignores Map401/503/301 even with _GW_ scene names", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2,PreCdtType3,Comparison3,PreCdtValue3
conditionID,,,,,条件类型,条件值,,,,,,,,,
30000110,0,False,False,True,4,1,29,0,1013,49,0,101`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000011,3,0,300,,,,,,,,,,,,,,30000110,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MATCH_WITH_GW_NON_WANGCHENG,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map203_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map202_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map203_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map401_GW_Normal_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map503_GW_Arena_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map301_GW_SingleMode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
      },
      missionTaskTextById: { "3000011": "王城秘境 I 洛萨王城秘境" },
    });
    const nonWangcheng = report.issues.filter((i) => [401, 503, 301].includes(i.mapId));
    assert.equal(nonWangcheng.length, 0, JSON.stringify(report.issues.map((i) => ({ kind: i.kind, mapId: i.mapId, mapName: i.mapName }))));
    assert.ok(report.issues.some((i) => i.kind === "missing_tag" && i.targetTag === 1013));
    assert.ok(report.issues.every((i) => [202, 203].includes(i.mapId) || i.kind === "scope_unresolved"));
  });

  it("GameMode=101 excludes beginner scenes on Map204 (30000250)", () => {
    const matchConfig = JSON.stringify({
      Data: [
        ...JSON.parse(MINI_MATCH_CONFIG).Data,
        {
          MapId: 204,
          MapName: "大大墓地",
          ScenePath: [
            {
              Mode: "困难多人",
              Difficulty: 2002,
              ConfigPath: "MatchConfigMap/Map204_GW_Hard.unity",
              IfOnline: 1,
            },
            {
              Mode: "新手关01",
              Difficulty: 9004,
              ConfigPath: "MatchConfigMap/Map204_GW_Beginner01.unity",
              IfOnline: 1,
            },
          ],
        },
      ],
    });
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2
conditionID,,,,,条件类型,条件值,,,,,,
30000250,10103,False,False,True,4,1,29,0,1008001,49,0,101`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000025,3,0,300,,,,,,,,,,,,,,30000250,1,`;
    const emptyMap = "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n";
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: matchConfig,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": emptyMap,
        "Map203_GW_Hard_MapData.asset": emptyMap,
        "Map202_GW_Singlemode_Hard_MapData.asset": emptyMap,
        "Map203_GW_Singlemode_Hard_MapData.asset": emptyMap,
        "Map204_GW_Hard_MapData.asset": fixtureSnippet,
        "Map204_GW_Beginner01_MapData.asset": emptyMap,
      },
    });
    assert.equal(
      report.issues.filter((i) => i.sceneFile?.includes("Beginner01")).length,
      0,
      JSON.stringify(report.issues),
    );
    assert.equal(
      report.issues.filter((i) => i.mapId === 204 && i.kind === "missing_tag").length,
      0,
    );
  });

  it("GameMode=101 does not check 大墓地", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2,PreCdtType3,Comparison3,PreCdtValue3
conditionID,,,,,条件类型,条件值,,,,,,,,,
30000361,10103,False,False,True,4,1,29,0,1013001,15,1,2,49,0,101`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000036,3,0,,,,,,,,,,,,,,,30000361,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MATCH_WITH_CEMETERY,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": fixtureSnippet,
        "Map203_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map202_GW_Singlemode_Hard_MapData.asset": fixtureSnippet,
        "Map203_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
      },
    });
    assert.equal(report.issues.filter((i) => i.mapName === "大墓地").length, 0);
    assert.equal(report.issues.filter((i) => i.kind === "missing_tag").length, 0);
  });

  it("TaskChain=300 scopes to 王城 without GameMode", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2
conditionID,,,,,条件类型,条件值,,,,,,
30000361,10103,False,False,True,4,1,29,0,9990001,15,1,2`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000036,3,0,300,,,,,,,,,,,,,,30000361,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MATCH_WITH_CEMETERY,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map203_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map202_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map203_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
      },
    });
    assert.equal(report.issues.filter((i) => i.mapName === "大墓地").length, 0);
    assert.ok(report.issues.some((i) => i.kind === "missing_tag" && i.targetTag === 9990001));
  });

  it("Mission text with 洛萨王城 scopes without GameMode/TaskChain", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1
conditionID,,,,,条件类型,条件值,,,
900100,0,False,False,True,4,1,29,0,9990002`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000100,3,0,,,,,,,,,,,,,,,900100,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MATCH_WITH_CEMETERY,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map203_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map202_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
        "Map203_GW_Singlemode_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
      },
      missionConditionTextById: { "900100": "在洛萨王城中开启指定宝箱" },
    });
    assert.equal(report.issues.filter((i) => i.mapName === "大墓地").length, 0);
    assert.ok(report.issues.some((i) => i.kind === "missing_tag"));
    assert.equal(report.issues.filter((i) => i.kind === "scope_unresolved").length, 0);
  });

  it("map interaction without GameMode/map hint emits scope_unresolved", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1
conditionID,,,,,条件类型,条件值,,,
900200,开启宝箱,False,False,True,4,1,29,0,1019`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000200,3,0,,,,,,,,,,,,,,,900200,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MATCH_WITH_CEMETERY,
      mapDataByFileName: {},
      missionConditionTextById: { "900200": "开启指定数量宝箱" },
    });
    assert.equal(report.issues.filter((i) => i.kind === "missing_tag").length, 0);
    assert.ok(report.issues.some((i) => i.kind === "scope_unresolved"));
  });

  it("GameMode=201 scopes to island Map401/402 only", () => {
    const matchConfig = JSON.stringify({
      Data: [
        ...JSON.parse(MINI_MATCH_CONFIG).Data,
        {
          MapId: 401,
          MapName: "海盗洞窟",
          ScenePath: [
            {
              Mode: "困难多人",
              Difficulty: 2002,
              ConfigPath: "MatchConfigMap/Map401_GW_Normal.unity",
              IfOnline: 1,
            },
          ],
        },
        {
          MapId: 402,
          MapName: "海盗大事件",
          ScenePath: [
            {
              Mode: "困难多人",
              Difficulty: 2002,
              ConfigPath: "MatchConfigMap/Map402_GW_Hard.unity",
              IfOnline: 1,
            },
          ],
        },
      ],
    });
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2
conditionID,,,,,条件类型,条件值,,,,,,
30900040,10103,False,False,True,4,1,29,0,8880001,49,0,201`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3090004,3,0,309,,,,,,,,,,,,,,30900040,1,`;
    const emptyMap = "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n";
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: matchConfig,
      mapDataByFileName: {
        "Map401_GW_Normal_MapData.asset": emptyMap,
        "Map402_GW_Hard_MapData.asset": emptyMap,
        "Map202_GW_Hard_MapData.asset": emptyMap,
      },
    });
    const mapIds = report.issues.filter((i) => i.kind === "missing_tag").map((i) => i.mapId);
    assert.ok(mapIds.every((id) => id === 401 || id === 402), JSON.stringify(report.issues));
    assert.equal(report.issues.filter((i) => i.mapId === 202).length, 0);
  });

  it("GameMode=102 (圣堂) yields scope_unresolved", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2
conditionID,,,,,条件类型,条件值,,,,,,
900300,0,False,False,True,4,1,29,0,7770001,49,0,102`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000300,3,0,,,,,,,,,,,,,,,900300,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MINI_MATCH_CONFIG,
      mapDataByFileName: {},
    });
    assert.equal(report.issues.filter((i) => i.kind === "missing_tag").length, 0);
    assert.ok(report.issues.some((i) => i.kind === "scope_unresolved"));
  });

  it("Mission text with 圣堂 does not scope to non-checkable maps", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1
conditionID,,,,,条件类型,条件值,,,
900400,0,False,False,True,4,1,29,0,6660001`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000400,3,0,,,,,,,,,,,,,,,900400,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MINI_MATCH_CONFIG,
      mapDataByFileName: {},
      missionConditionTextById: { "900400": "在新圣堂中开启宝箱" },
    });
    assert.equal(report.issues.filter((i) => i.kind === "missing_tag").length, 0);
    assert.ok(report.issues.some((i) => i.kind === "scope_unresolved"));
  });

  it("never emits position_mismatch", () => {
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2,PreCdtType3,Comparison3,PreCdtValue3
conditionID,,,,,条件类型,条件值,,,,,,,,,
30000361,10103,False,False,True,4,1,29,0,1013001,15,1,2,49,0,101`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000036,3,0,,,,,,,,,,,,,,,30000361,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: MINI_MATCH_CONFIG,
      mapDataByFileName: {
        "Map202_GW_Hard_MapData.asset": fixtureSnippet,
        "Map203_GW_Hard_MapData.asset": fixtureSnippet,
        "Map202_GW_Singlemode_Hard_MapData.asset": fixtureSnippet,
        "Map203_GW_Singlemode_Hard_MapData.asset": fixtureSnippet,
      },
    });
    assert.equal(report.issues.filter((i) => i.kind === "position_mismatch").length, 0);
  });

  it("shows 洛萨王城 instead of MatchMapConfig 大墓地 names", () => {
    const matchConfig = JSON.stringify({
      Data: [
        {
          MapId: 203,
          MapName: "大墓地3",
          ScenePath: [
            {
              Mode: "困难多人",
              Difficulty: 2002,
              ConfigPath: "MatchConfigMap/Map203_GW_Hard.unity",
              IfOnline: 1,
            },
          ],
        },
      ],
    });
    const conditionCsv = `ID,GotoViewPanel,ShowTips,GotoSubmit,ShowInMatch,CdtType,CdtValue,PreCdtType1,Comparison1,PreCdtValue1,PreCdtType2,Comparison2,PreCdtValue2
conditionID,,,,,条件类型,条件值,,,,,,
30000351,10103,False,False,True,4,1,29,0,1013001,49,0,101`;
    const taskCsv = `TaskID,TaskType,CircleType,TaskChain,NPCID,ClientOrder,StartTime,EndTime,ConditionRelation,GotoGroup,IsAuto,UnlockCdt,UnlockCdtValue,PreTaskID,TaskGetDialogID,TaskClaimedDialogID,ImagePath,Conditions,RewardID,BPExp
任务ID,,,,,,,,,,,,,,,,,,,
3000035,3,0,300,,,,,,,,,,,,,,30000351,1,`;
    const report = runTagCheck({
      conditionCsvText: conditionCsv,
      taskCsvText: taskCsv,
      matchMapConfigJson: matchConfig,
      mapDataByFileName: {
        "Map203_GW_Hard_MapData.asset": "  MapChestBoxRecords:\n  MapLootRecords:\n  MapTriggerRecords:\n",
      },
    });
    const withMap = report.issues.filter((i) => i.mapName);
    assert.ok(withMap.length > 0);
    assert.ok(withMap.every((i) => i.mapName === "洛萨王城"));
    assert.ok(withMap.every((i) => !i.mapName.includes("大墓地")));
  });
});
