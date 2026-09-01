import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CN_GMT_ENV_OPTIONS,
  gmtRequestRegions,
  selectCnServer,
  selectOverseasTopbarEnvWithGtopSync,
  selectPreliveTopbarEnv,
  setGmtPreliveEnabled,
  switchGmtPlatform,
} from "./gmtPlatform.ts";
import { PRELIVE_GMT_ENV } from "./gmtClient.ts";

const overseasConfig = {
  gmtPlatform: "overseas" as const,
  gmtPreliveEnabled: false,
  gmtEnvId: 17,
  gmtEnvName: "rct01",
  gmtOverseasEnvId: null,
  gmtOverseasEnvName: null,
  gmtCnEnvId: 7,
  gmtCnEnvName: "CNRCT02",
  gtopEnvId: "31",
  gtopEnvName: "krad-office内网测试环境",
  gtopRegionServerId: "64",
  gtopRegionServerName: "GNG-pt01",
  gtopOverseasEnvId: null,
  gtopOverseasEnvName: null,
  gtopOverseasRegionServerId: null,
  gtopOverseasRegionServerName: null,
  gtopCnEnvId: "32",
  gtopCnEnvName: "krad-外网测试环境",
  gtopCnRegionServerId: "329",
  gtopCnRegionServerName: "CN-rct02",
};

describe("GMT/GTOP platform selection", () => {
  it("defines the three HAR-verified CN GMT environments", () => {
    assert.deepEqual(CN_GMT_ENV_OPTIONS, [
      { id: 7, name: "CNRCT02", protocol: 2 },
      { id: 6, name: "CNRCT01", protocol: 2 },
      { id: 3, name: "CNSBT", protocol: 2 },
    ]);
  });

  it("switches to CN while snapshotting the overseas GMT and GTOP selections", () => {
    const next = switchGmtPlatform(overseasConfig, "cn");
    assert.equal(next.gmtPlatform, "cn");
    assert.equal(next.gmtEnvId, 7);
    assert.equal(next.gmtEnvName, "CNRCT02");
    assert.equal(next.gtopEnvId, "32");
    assert.equal(next.gtopRegionServerId, "329");
    assert.equal(next.gmtOverseasEnvId, 17);
    assert.equal(next.gtopOverseasRegionServerName, "GNG-pt01");
    assert.equal(next.gmtPreliveEnabled, false);
  });

  it("clears PR when switching to CN from overseas PreLive", () => {
    const prelive = setGmtPreliveEnabled(overseasConfig, true);
    const next = switchGmtPlatform(prelive, "cn");
    assert.equal(next.gmtPreliveEnabled, false);
    assert.equal(next.gmtOverseasEnvId, 17);
    assert.equal(next.gmtOverseasEnvName, "rct01");
  });

  it("defaults to PreLive-SG when enabling PR and restores overseas env when disabling", () => {
    const on = setGmtPreliveEnabled(overseasConfig, true);
    assert.equal(on.gmtPreliveEnabled, true);
    assert.equal(on.gmtEnvId, PRELIVE_GMT_ENV.id);
    assert.equal(on.gmtEnvName, PRELIVE_GMT_ENV.name);
    assert.equal(on.gmtOverseasEnvId, 17);
    assert.equal(on.gmtOverseasEnvName, "rct01");

    const off = setGmtPreliveEnabled(on, false);
    assert.equal(off.gmtPreliveEnabled, false);
    assert.equal(off.gmtEnvId, 17);
    assert.equal(off.gmtEnvName, "rct01");
  });

  it("keeps an allowlisted PR env when re-enabling and does not overwrite overseas snapshot", () => {
    const onSg = setGmtPreliveEnabled(overseasConfig, true);
    const onKol = selectPreliveTopbarEnv(onSg, { id: 42, name: "KOL-US", protocol: 2 });
    assert.equal(onKol.gmtEnvId, 42);
    assert.equal(onKol.gmtEnvName, "KOL-US");
    assert.equal(onKol.gmtOverseasEnvId, 17);
    assert.equal(onKol.gtopRegionServerName, "GNG-pt01");

    const toCn = switchGmtPlatform(onKol, "cn");
    assert.equal(toCn.gmtPreliveEnabled, false);
    assert.equal(toCn.gmtOverseasEnvId, 17);
    assert.equal(toCn.gmtOverseasEnvName, "rct01");
  });

  it("ignores non-allowlisted names in selectPreliveTopbarEnv", () => {
    const on = setGmtPreliveEnabled(overseasConfig, true);
    const next = selectPreliveTopbarEnv(on, { id: 1, name: "rct01", protocol: 2 });
    assert.equal(next.gmtEnvId, PRELIVE_GMT_ENV.id);
    assert.equal(next.gmtEnvName, PRELIVE_GMT_ENV.name);
  });

  it("pairs a CN GMT server with the matching GTOP API name", () => {
    const cnConfig = switchGmtPlatform(overseasConfig, "cn");
    const next = selectCnServer(cnConfig, "CNRCT01");
    assert.equal(next.gmtEnvId, 6);
    assert.equal(next.gmtEnvName, "CNRCT01");
    assert.equal(next.gtopEnvId, null);
    assert.equal(next.gtopEnvName, "krad-外网测试环境");
    assert.equal(next.gtopRegionServerId, null);
    assert.equal(next.gtopRegionServerName, "CN-rct01");
    assert.equal(next.gtopCnEnvId, null);
  });

  it("syncs overseas GTOP region server when mapping exists", () => {
    const next = selectOverseasTopbarEnvWithGtopSync(overseasConfig, { id: 123, name: "pt02", protocol: 2 });
    assert.equal(next.gmtEnvId, 123);
    assert.equal(next.gmtEnvName, "pt02");
    assert.equal(next.gmtOverseasEnvId, 123);
    assert.equal(next.gmtOverseasEnvName, "pt02");

    assert.equal(next.gtopRegionServerId, null);
    assert.equal(next.gtopRegionServerName, "GNG-pt02");
    assert.equal(next.gtopOverseasRegionServerId, null);
    assert.equal(next.gtopOverseasRegionServerName, "GNG-pt02");
  });

  it("keeps previous overseas GTOP target when overseas env has no mapping (CCS)", () => {
    const next = selectOverseasTopbarEnvWithGtopSync(overseasConfig, { id: 456, name: "CCS", protocol: 2 });
    assert.equal(next.gmtEnvId, 456);
    assert.equal(next.gmtEnvName, "CCS");
    assert.equal(next.gtopRegionServerId, "64");
    assert.equal(next.gtopRegionServerName, "GNG-pt01");
    assert.equal(next.gtopOverseasRegionServerName, null);
  });

  it("disambiguates overseas sbt via protocol", () => {
    const gsgci = selectOverseasTopbarEnvWithGtopSync(overseasConfig, { id: 1, name: "sbt", protocol: 1 });
    assert.equal(gsgci.gtopRegionServerName, "krad-sbt01");

    const grpc = selectOverseasTopbarEnvWithGtopSync(overseasConfig, { id: 2, name: "sbt", protocol: 2 });
    assert.equal(grpc.gtopRegionServerName, "krad-sbt02");
  });

  it("uses CN request regions without overwriting overseas settings", () => {
    assert.deepEqual(
      gmtRequestRegions({
        gmtPlatform: "cn",
        gmtLockRegion: "SG",
        gmtNotiRegion: "SG",
      }),
      { lockRegion: "CN", notiRegion: "CN" },
    );
    assert.deepEqual(
      gmtRequestRegions({
        gmtPlatform: "overseas",
        gmtLockRegion: "SG",
        gmtNotiRegion: "ID",
      }),
      { lockRegion: "SG", notiRegion: "ID" },
    );
  });
});
