import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  S6_GROUP_SCORE_MIN,
  buildS6FallbackLadder,
  buildSliderStops,
  computeRankUpgradeDelta,
  parseRankSheet,
  scoreMinForRankId,
} from "./rankLadder.ts";

describe("rankLadder S6 fallback", () => {
  it("covers groups 1~9 with documented enter scores", () => {
    const ladder = buildS6FallbackLadder();
    assert.equal(ladder.source, "fallback");
    assert.ok(ladder.stops.length >= 9);
    for (const [groupId, min] of Object.entries(S6_GROUP_SCORE_MIN)) {
      const gid = Number(groupId);
      const major = ladder.stops.find((s) => s.rankGroupId === gid && s.isMajor);
      assert.ok(major, `missing major for group ${gid}`);
      assert.equal(major!.scoreMin, min);
    }
  });

  it("marks first stop of each group as major", () => {
    const stops = buildSliderStops(buildS6FallbackLadder().rows);
    const majors = stops.filter((s) => s.isMajor);
    assert.equal(majors.length, 9);
    assert.equal(majors[0]!.rankGroupId, 1);
    assert.equal(majors[8]!.rankGroupId, 9);
  });
});

describe("parseRankSheet", () => {
  it("parses RankID / RankGroupID / ScoreMin / Name", () => {
    const aoa = [
      ["RankID", "RankGroupID", "ScoreMin", "ScoreMax", "Name"],
      [1, 1, 1, 300, "见习"],
      [2, 2, 300, 700, "青铜4"],
      [6, 3, 1900, 2400, "白银5"],
    ];
    const parsed = parseRankSheet(aoa);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows.length, 3);
    assert.equal(scoreMinForRankId(parsed.rows, 6), 1900);
    const stops = buildSliderStops(parsed.rows);
    assert.equal(stops.filter((s) => s.isMajor).length, 3);
  });

  it("filters by SeasonStart when provided", () => {
    const aoa = [
      ["RankID", "RankGroupID", "ScoreMin", "Name", "SeasonStart", "SeasonEnd"],
      [1, 1, 1, "S5初心3", "2025-01-01", "2026-07-01"],
      [1, 1, 1, "见习", "2026-07-02", "2099-01-01"],
      [2, 2, 300, "青铜4", "2026-07-02", "2099-01-01"],
    ];
    const parsed = parseRankSheet(aoa, { seasonStartIso: "2026-07-02" });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]!.name, "见习");
  });
});

describe("computeRankUpgradeDelta", () => {
  it("returns positive delta for upgrades", () => {
    assert.equal(computeRankUpgradeDelta(100, 1900), 1800);
  });

  it("returns non-positive when already at or above target", () => {
    assert.equal(computeRankUpgradeDelta(1900, 1900), 0);
    assert.equal(computeRankUpgradeDelta(2000, 1900), -100);
  });
});
