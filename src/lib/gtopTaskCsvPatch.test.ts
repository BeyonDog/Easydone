import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { patchTaskCsvClearPreTaskIds, parseTaskCsv } from "./gtopTaskCsvPatch.ts";

describe("patchTaskCsvClearPreTaskIds", () => {
  it("clears PreTaskID only for matching TaskID rows", () => {
    const csv = [
      "TaskID,PreTaskID,Remark",
      "1001,2000,A",
      "1002,2001,B",
      "1003,,C",
    ].join("\n");
    const result = patchTaskCsvClearPreTaskIds(csv, new Set(["1002"]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.clearedCount, 1);
    const rows = parseTaskCsv(result.text).rows;
    assert.equal(rows[1]![1], "2000");
    assert.equal(rows[2]![1], "");
    assert.equal(rows[3]![1], "");
  });

  it("supports tab-separated files", () => {
    const csv = "TaskID\tPreTaskID\n1001\t99\n";
    const result = patchTaskCsvClearPreTaskIds(csv, new Set(["1001"]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const rows = parseTaskCsv(result.text).rows;
    assert.equal(rows[0]![0], "TaskID");
    assert.equal(rows[1]![0], "1001");
    assert.equal(rows[1]![1], "");
  });

  it("fails when PreTaskID column missing", () => {
    const csv = "TaskID,Remark\n1,x\n";
    const result = patchTaskCsvClearPreTaskIds(csv, new Set(["1"]));
    assert.equal(result.ok, false);
  });
});
