import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AppConfig } from "../types.ts";
import { runAddSproutScore } from "./addSproutScore.ts";

function baseConfig(): AppConfig {
  return {
    excelWorkspaceRoot: "",
    gmAssistantLocalPath: "",
    itemRemarkColumn: null,
    hiddenItemColumns: [],
    hiddenTaskColumns: [],
    freezeThroughItemHeader: null,
    freezeThroughTaskHeader: null,
    itemTableFilter: null,
    taskTableFilter: null,
    savedSnapshots: [],
    sendTemplates: [],
    savedTemplates: [],
    themeAccentHex: "#000",
    themeBackgroundHex: "#111",
    themeWallpaperRelativePath: null,
    themeWallpaperOpacity: 0.5,
    initialItemFilterSheetShown: false,
    initialTaskFilterSheetShown: false,
    gmtPlatform: "overseas",
    gmtPreliveEnabled: false,
    gmtBaseUrl: "",
    gmtCookie: "c",
    gmtCnCookie: "",
    gmtEnvId: 17,
    gmtEnvName: "rct01",
    gmtOverseasEnvId: null,
    gmtOverseasEnvName: null,
    gmtCnEnvId: null,
    gmtCnEnvName: null,
    gmtAccountId: "",
    gmtTradable: false,
    gmtLockRegion: "SG",
    gmtNotiRegion: "SG",
    gtopBaseUrl: "",
    gtopCookie: "",
    gtopProject: "GNG",
    gtopEnvId: null,
    gtopEnvName: null,
    gtopRegionServerId: null,
    gtopRegionServerName: null,
  };
}

describe("runAddSproutScore", () => {
  it("fails when account id is empty", async () => {
    const logs: string[] = [];
    const ok = await runAddSproutScore({
      config: baseConfig(),
      gmtAccountIdDraft: "",
      ensureGmtLoggedIn: async () => true,
      logGmt: (p) => logs.push(p.message),
    });
    assert.equal(ok, false);
    assert.ok(logs[0]?.includes("账号"));
  });

  it("fails when not logged in", async () => {
    const logs: string[] = [];
    const ok = await runAddSproutScore({
      config: baseConfig(),
      gmtAccountIdDraft: "10002125",
      ensureGmtLoggedIn: async () => false,
      logGmt: (p) => logs.push(p.message),
    });
    assert.equal(ok, false);
    assert.ok(logs[0]?.includes("未登录"));
  });
});
