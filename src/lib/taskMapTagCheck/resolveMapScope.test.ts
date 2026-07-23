import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inferMapHintFromText, filterVariantsByMapHint } from "./resolveMapScope.ts";
import type { MapVariant } from "./types.ts";

function variant(partial: Partial<MapVariant> & Pick<MapVariant, "mapId" | "mapName" | "sceneBase">): MapVariant {
  return {
    variantSuffix: "",
    difficulty: 2002,
    modeLabel: "",
    terrain: "ice",
    playerMode: "multi",
    matchTier: "hard",
    mapDataFileName: `${partial.sceneBase}_MapData.asset`,
    sceneRelativePath: "",
    ifOnline: 1,
    ...partial,
  };
}

describe("inferMapHintFromText", () => {
  it("detects 洛萨王城 / 王城", () => {
    assert.equal(inferMapHintFromText("在洛萨王城中开启宝箱"), "gw");
    assert.equal(inferMapHintFromText("王城秘境 I"), "gw");
  });

  it("detects 黑帆窟港 as island", () => {
    assert.equal(inferMapHintFromText("在黑帆窟港开启宝箱"), "island");
    assert.equal(inferMapHintFromText("海盗洞窟探索"), "island");
  });

  it("does not infer 大墓地 / 圣堂 / 樱之城", () => {
    assert.equal(inferMapHintFromText("内萨克大墓地"), null);
    assert.equal(inferMapHintFromText("新圣堂地图"), null);
    assert.equal(inferMapHintFromText("樱之城天守"), null);
  });

  it("returns null when no map keyword", () => {
    assert.equal(inferMapHintFromText("开启指定数量宝箱"), null);
  });
});

describe("filterVariantsByMapHint", () => {
  const all = [
    variant({ mapId: 202, mapName: "王城202", sceneBase: "Map202_GW_Hard" }),
    variant({ mapId: 204, mapName: "王城204", sceneBase: "Map204_GW_Hard" }),
    variant({ mapId: 401, mapName: "海盗洞窟", sceneBase: "Map401_GW_Normal" }),
    variant({ mapId: 503, mapName: "竞技场", sceneBase: "Map503_GW_Arena" }),
    variant({ mapId: 503, mapName: "大墓地", sceneBase: "Map503_Cemetery_Hard" }),
  ];

  it("gw keeps only MapId 202/203/204, not other _GW_ scenes", () => {
    const filtered = filterVariantsByMapHint(all, "gw");
    assert.deepEqual(
      filtered.map((v) => v.mapId).sort(),
      [202, 204],
    );
  });

  it("island keeps only MapId 401/402", () => {
    const filtered = filterVariantsByMapHint(all, "island");
    assert.deepEqual(filtered.map((v) => v.mapId), [401]);
  });
});
