import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRELIVE_GMT_BASE_URL,
  PRELIVE_GMT_ENV,
  PRELIVE_GMT_ENV_NAMES,
  filterPreliveGmtEnvs,
  gmtSessionSliceFromConfig,
  gtopBlockedByPreliveMessage,
  isPreliveGmtEnvName,
} from "./gmtClient.ts";

describe("gmtSessionSliceFromConfig", () => {
  it("uses the CN GMT endpoint and cookie for the cn platform", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "cn",
      gmtBaseUrl: "https://test-krad.stdgmtool.web.garena.cn",
      gmtCookie: "overseas-cookie",
      gmtCnCookie: "cn-cookie",
      gmtEnvId: 7,
      gmtPreliveEnabled: true,
    });

    assert.deepEqual(slice, {
      gmtBaseUrl: "https://test-gngcnprod.stdgmtool.web.garena.cn",
      gmtCookie: "cn-cookie",
      gmtEnvId: 7,
    });
  });

  it("keeps the existing GMT endpoint and cookie for the overseas platform", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "overseas",
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtCnCookie: "cn-cookie",
      gmtEnvId: 17,
    });

    assert.deepEqual(slice, {
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtEnvId: 17,
    });
  });

  it("routes overseas PR mode to pre-krad with the selected env id", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "overseas",
      gmtPreliveEnabled: true,
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtCnCookie: "cn-cookie",
      gmtEnvId: 99,
    });

    assert.deepEqual(slice, {
      gmtBaseUrl: PRELIVE_GMT_BASE_URL,
      gmtCookie: "overseas-cookie",
      gmtEnvId: 99,
    });
  });

  it("falls back to PreLive-SG id when PR mode has no env id", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "overseas",
      gmtPreliveEnabled: true,
      gmtCookie: "overseas-cookie",
    });

    assert.equal(slice.gmtEnvId, PRELIVE_GMT_ENV.id);
  });
});

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
