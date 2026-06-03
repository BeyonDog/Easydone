import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveTaskTypeColumnIndex,
  taskTypeFilterKey,
} from "./xlsxHelpers.ts";

describe("taskTypeFilterKey", () => {
  it("maps integer codes to labels", () => {
    assert.equal(taskTypeFilterKey(1), "日常");
    assert.equal(taskTypeFilterKey(2000), "当期BP任务");
    assert.equal(taskTypeFilterKey(1500), "活动任务");
  });

  it("keeps text labels from Excel cells", () => {
    assert.equal(taskTypeFilterKey("日常"), "日常");
    assert.equal(taskTypeFilterKey("周常"), "周常");
  });

  it("preserves unknown integer and text keys", () => {
    assert.equal(taskTypeFilterKey(7), "7");
    assert.equal(taskTypeFilterKey("支线"), "支线");
  });

  it("treats empty and N/A as 空", () => {
    assert.equal(taskTypeFilterKey(""), "空");
    assert.equal(taskTypeFilterKey(null), "空");
    assert.equal(taskTypeFilterKey("N/A"), "空");
    assert.equal(taskTypeFilterKey("#N/A"), "空");
  });
});

describe("resolveTaskTypeColumnIndex", () => {
  it("finds TaskType column case-insensitively", () => {
    assert.equal(resolveTaskTypeColumnIndex(["tasktype", "任务链"]), 0);
    assert.equal(resolveTaskTypeColumnIndex(["TaskType", "任务链"]), 0);
  });

  it("finds 任务类型 fallback", () => {
    assert.equal(resolveTaskTypeColumnIndex(["任务类型", "任务链"]), 0);
  });

  it("returns -1 when column missing", () => {
    assert.equal(resolveTaskTypeColumnIndex(["任务链"]), -1);
  });
});
