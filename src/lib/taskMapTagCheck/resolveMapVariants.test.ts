import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMapVariants, isVariantExcludedFromCheck } from "./resolveMapVariants.ts";

const entry = (mapId: number, mapName: string, scenes: Array<{ Mode: string; Difficulty: number; ConfigPath: string }>) => ({
  MapId: mapId,
  MapName: mapName,
  ScenePath: scenes,
});

describe("isVariantExcludedFromCheck", () => {
  it("excludes beginner scenes by name and difficulty", () => {
    assert.equal(
      isVariantExcludedFromCheck({
        mapId: 204,
        sceneBase: "Map204_GW_Beginner01",
        difficulty: 9004,
        modeLabel: "新手关01",
        terrain: "ice",
      }),
      true,
    );
    assert.equal(
      isVariantExcludedFromCheck({
        mapId: 201,
        sceneBase: "Map01_GW_BeginnerWarm01",
        difficulty: 9002,
        modeLabel: "新手图02",
        terrain: "ice",
      }),
      true,
    );
  });

  it("excludes fire terrain on non-wangcheng maps", () => {
    assert.equal(
      isVariantExcludedFromCheck({
        mapId: 401,
        sceneBase: "Map401_GW_HardFire",
        difficulty: 2012,
        modeLabel: "困难多人（火）",
        terrain: "fire",
      }),
      true,
    );
    assert.equal(
      isVariantExcludedFromCheck({
        mapId: 204,
        sceneBase: "Map204_GW_HardFire",
        difficulty: 2012,
        modeLabel: "困难多人（火）",
        terrain: "fire",
      }),
      false,
    );
  });

  it("keeps normal wangcheng ice variants", () => {
    assert.equal(
      isVariantExcludedFromCheck({
        mapId: 204,
        sceneBase: "Map204_GW_Hard",
        difficulty: 2002,
        modeLabel: "困难多人",
        terrain: "ice",
      }),
      false,
    );
  });
});

describe("buildMapVariants", () => {
  it("drops beginner and non-wangcheng fire scenes", () => {
    const variants = buildMapVariants([
      entry(204, "大大墓地", [
        { Mode: "困难多人", Difficulty: 2002, ConfigPath: "MatchConfigMap/Map204_GW_Hard.unity" },
        { Mode: "新手关01", Difficulty: 9004, ConfigPath: "MatchConfigMap/Map204_GW_Beginner01.unity" },
        { Mode: "困难多人（火）", Difficulty: 2012, ConfigPath: "MatchConfigMap/Map204_GW_HardFire.unity" },
      ]),
      entry(401, "海盗洞窟", [
        { Mode: "困难多人", Difficulty: 2002, ConfigPath: "MatchConfigMap/Map401_GW_Normal.unity" },
        { Mode: "困难多人（火）", Difficulty: 2012, ConfigPath: "MatchConfigMap/Map401_GW_HardFire.unity" },
      ]),
    ]);
    const bases = variants.map((v) => v.sceneBase).sort();
    assert.deepEqual(bases, ["Map204_GW_Hard", "Map204_GW_HardFire", "Map401_GW_Normal"]);
    assert.ok(variants.every((v) => v.mapId !== 204 || v.mapName === "洛萨王城"));
    assert.ok(variants.every((v) => v.mapId !== 401 || v.mapName === "黑帆窟港"));
  });

  it("maps cemetery config names to friendly display names", () => {
    const variants = buildMapVariants([
      entry(203, "大墓地3", [
        { Mode: "困难多人", Difficulty: 2002, ConfigPath: "MatchConfigMap/Map203_GW_Hard.unity" },
      ]),
      entry(402, "海盗大事件", [
        { Mode: "困难多人", Difficulty: 2002, ConfigPath: "MatchConfigMap/Map402_GW_Hard.unity" },
      ]),
    ]);
    assert.equal(variants[0]!.mapName, "洛萨王城");
    assert.equal(variants[1]!.mapName, "黑帆窟港");
  });

  it("drops non-checkable MapId (圣堂/竞技场等)", () => {
    const variants = buildMapVariants([
      entry(202, "王城", [
        { Mode: "困难多人", Difficulty: 2002, ConfigPath: "MatchConfigMap/Map202_GW_Hard.unity" },
      ]),
      entry(301, "新圣堂", [
        { Mode: "困难多人", Difficulty: 2002, ConfigPath: "MatchConfigMap/Map301_GW_Hard.unity" },
      ]),
      entry(503, "竞技场", [
        { Mode: "困难多人", Difficulty: 2002, ConfigPath: "MatchConfigMap/Map503_GW_Arena.unity" },
      ]),
      entry(401, "海盗洞窟", [
        { Mode: "困难多人", Difficulty: 2002, ConfigPath: "MatchConfigMap/Map401_GW_Normal.unity" },
      ]),
    ]);
    assert.deepEqual(
      variants.map((v) => v.mapId).sort(),
      [202, 401],
    );
  });
});
