import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRELIVE_GMT_BASE_URL,
  PRELIVE_GMT_ENV,
  PRELIVE_GMT_ENV_NAMES,
  filterPreliveGmtEnvs,
  gtopBlockedByPreliveMessage,
  isPreliveGmtEnvName,
} from "./gmtClient.ts";

describe("PR GMT env allowlist", () => {
  it("includes the expected PreLive env names", () => {
    assert.ok(PRELIVE_GMT_ENV_NAMES.includes("PreLive-SG"));
    assert.ok(PRELIVE_GMT_ENV_NAMES.includes("iOS-REVIEW"));
    assert.ok(PRELIVE_GMT_ENV_NAMES.includes("ACT-VN"));
    assert.equal(isPreliveGmtEnvName("KOL-US"), true);
    assert.equal(isPreliveGmtEnvName("rct01"), false);
  });

  it("filters and orders fetched envs by the allowlist", () => {
    const filtered = filterPreliveGmtEnvs([
      { id: 9, name: "noise" },
      { id: 5, name: "ACT-VN", protocol: 2 },
      { id: 2, name: "PreLive-SG", protocol: 2 },
      { id: 8, name: "iOS-REVIEW", protocol: 2 },
    ]);
    assert.deepEqual(
      filtered.map((e) => e.name),
      ["iOS-REVIEW", "ACT-VN", "PreLive-SG"],
    );
  });

  it("formats the GTOP blocked message with env name", () => {
    assert.match(gtopBlockedByPreliveMessage("PreLive-SG"), /PreLive-SG/);
    assert.match(gtopBlockedByPreliveMessage(null), /PR 区服/);
  });
});
