import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AppConfig } from "../types.ts";
import {
  clearModifiedConfigCsv,
  listModifiedConfigCsvFilenames,
  markModifiedConfigCsv,
  markModifiedConfigCsvBatch,
  matchFilenamesToConfigPaths,
} from "./gtopModifiedConfigCsv.ts";

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    excelWorkspaceRoot: "C:/ws",
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
    themeBackgroundHex: "#fff",
    themeWallpaperRelativePath: null,
    themeWallpaperOpacity: 1,
    initialItemFilterSheetShown: false,
    initialTaskFilterSheetShown: false,
    gmtBaseUrl: "",
    gmtCookie: "",
    gmtEnvId: null,
    gmtEnvName: null,
    gmtAccountId: "",
    gmtTradable: false,
    gmtLockRegion: "",
    gmtNotiRegion: "",
    gtopBaseUrl: "",
    gtopCookie: "",
    gtopProject: "",
    gtopEnvId: "env1",
    gtopEnvName: null,
    gtopRegionServerId: "region1",
    gtopRegionServerName: null,
    ...overrides,
  };
}

describe("gtopModifiedConfigCsv", () => {
  it("marks filenames with case-insensitive dedupe", () => {
    let config = baseConfig();
    config = markModifiedConfigCsv(config, "Task.csv");
    config = markModifiedConfigCsv(config, "task.csv");
    assert.deepEqual(listModifiedConfigCsvFilenames(config), ["Task.csv"]);
  });

  it("returns empty list when context mismatches stored state", () => {
    const config = markModifiedConfigCsv(baseConfig(), "Item.csv");
    const otherEnv = baseConfig({ gtopEnvId: "other" });
    assert.deepEqual(listModifiedConfigCsvFilenames(otherEnv), []);
    assert.deepEqual(listModifiedConfigCsvFilenames(config), ["Item.csv"]);
  });

  it("clears a marked filename", () => {
    let config = markModifiedConfigCsvBatch(baseConfig(), ["Task.csv", "Item.csv"]);
    config = clearModifiedConfigCsv(config, "item.csv");
    assert.deepEqual(listModifiedConfigCsvFilenames(config), ["Task.csv"]);
  });

  it("matchFilenamesToConfigPaths matches basename case-insensitively", () => {
    const result = matchFilenamesToConfigPaths(
      ["C:/ws/Config/Task.csv", "C:/ws/Config/item.csv"],
      ["task.csv", "Item.csv", "Missing.csv"],
    );
    assert.deepEqual(result.paths, ["C:/ws/Config/Task.csv", "C:/ws/Config/item.csv"]);
    assert.deepEqual(result.missingFilenames, ["Missing.csv"]);
  });
});
