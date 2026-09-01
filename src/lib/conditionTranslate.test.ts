import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  taskConditionRelationLabel,
  translateCondition,
  translateTaskConditionIds,
} from "./conditionTranslate.ts";

describe("translateCondition", () => {
  it("translates condition 400231 into fluent Chinese plus field meanings", () => {
    const result = translateCondition({
      conditionId: "400231",
      cdtType: 1,
      cdtValue: 3,
      preConditions: [
        { type: 49, comparison: 0, value: 101 },
        { type: 15, comparison: 0, value: 3 },
        { type: 52, comparison: 1, value: 1 },
      ],
    });

    assert.equal(
      result.sentence,
      "在101王城地图，地狱模式，击杀3个指定职业玩家，被击杀的玩家职业id需要≥1",
    );

    const byKey = Object.fromEntries(result.fields.map((f) => [f.key, f]));
    assert.equal(byKey.CdtType?.raw, 1);
    assert.equal(byKey.CdtType?.meaning, "击杀");
    assert.equal(byKey.CdtValue?.raw, 3);
    assert.equal(byKey.CdtValue?.meaning, "数量 3");
    assert.equal(byKey.PreCdtType1?.raw, 49);
    assert.equal(byKey.PreCdtType1?.meaning, "游戏模式（地图）");
    assert.equal(byKey.Comparison1?.raw, 0);
    assert.equal(byKey.Comparison1?.meaning, "等于");
    assert.equal(byKey.PreCdtValue1?.raw, 101);
    assert.equal(byKey.PreCdtValue1?.meaning, "王城");
    assert.equal(byKey.PreCdtType2?.raw, 15);
    assert.equal(byKey.PreCdtType2?.meaning, "对局模式");
    assert.equal(byKey.Comparison2?.raw, 0);
    assert.equal(byKey.Comparison2?.meaning, "等于");
    assert.equal(byKey.PreCdtValue2?.raw, 3);
    assert.equal(byKey.PreCdtValue2?.meaning, "地狱");
    assert.equal(byKey.PreCdtType3?.raw, 52);
    assert.equal(byKey.PreCdtType3?.meaning, "击杀指定职业玩家");
    assert.equal(byKey.Comparison3?.raw, 1);
    assert.equal(byKey.Comparison3?.meaning, "大于等于");
    assert.equal(byKey.PreCdtValue3?.raw, 1);
    assert.equal(byKey.PreCdtValue3?.meaning, "职业 ID 1");
    assert.equal(byKey.PreCdtType4, undefined);
    assert.equal(byKey.PreCdtRelation, undefined);
  });

  it("omits empty pre-condition slots from fields", () => {
    const result = translateCondition({
      conditionId: "1",
      cdtType: 5,
      cdtValue: 1,
      preConditions: [],
    });
    assert.equal(result.fields.some((f) => f.key.startsWith("PreCdt")), false);
  });
});

describe("taskConditionRelationLabel", () => {
  it("treats 0 and empty as 且", () => {
    assert.equal(taskConditionRelationLabel(0), "且");
    assert.equal(taskConditionRelationLabel("0"), "且");
    assert.equal(taskConditionRelationLabel(""), "且");
    assert.equal(taskConditionRelationLabel(undefined), "且");
  });

  it("treats 1 as same-match reset AND, not OR", () => {
    assert.equal(taskConditionRelationLabel(1), "且（须同一局完成，否则进度重置）");
    assert.equal(taskConditionRelationLabel("1"), "且（须同一局完成，否则进度重置）");
  });

  it("keeps unknown values as-is", () => {
    assert.equal(taskConditionRelationLabel("2"), "2");
  });
});

describe("translateTaskConditionIds", () => {
  it("uses ConditionRelation=1 as the between-block label", () => {
    const byId = new Map([
      [
        "30500090",
        {
          conditionId: "30500090",
          cdtType: 30,
          cdtValue: 1,
          preConditions: [],
        },
      ],
      [
        "30500091",
        {
          conditionId: "30500091",
          cdtType: 27,
          cdtValue: 1,
          preConditions: [],
        },
      ],
    ]);
    const result = translateTaskConditionIds(["30500090", "30500091"], byId, "1");
    assert.equal(result.relationRaw, "1");
    assert.equal(result.relationLabel, "且（须同一局完成，否则进度重置）");
    assert.equal(result.blocks.length, 2);
  });

  it("uses ConditionRelation=0 as 且 between blocks", () => {
    const byId = new Map([
      ["a", { conditionId: "a", cdtType: 5, cdtValue: 1, preConditions: [] }],
      ["b", { conditionId: "b", cdtType: 5, cdtValue: 1, preConditions: [] }],
    ]);
    const result = translateTaskConditionIds(["a", "b"], byId, "0");
    assert.equal(result.relationRaw, "0");
    assert.equal(result.relationLabel, "且");
  });
});
