import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatTaskCompleteToast,
  headSelectedDataIdx,
  pickNextTaskRowByIdAsc,
  validateTaskChainSelection,
} from "./completeTask.ts";

describe("formatTaskCompleteToast", () => {
  it("uses remark when present", () => {
    assert.equal(formatTaskCompleteToast({ taskId: "40001", remarkLabel: "星星之火" }), "已完成星星之火");
  });

  it("falls back to task id", () => {
    assert.equal(formatTaskCompleteToast({ taskId: "40001", remarkLabel: "" }), "已完成任务 40001");
  });

  it("appends remaining count", () => {
    assert.equal(
      formatTaskCompleteToast({ taskId: "401", remarkLabel: "" }, 2),
      "已完成任务 401（剩余 2 个）",
    );
  });
});

describe("headSelectedDataIdx", () => {
  it("returns first still-selected in order", () => {
    assert.equal(headSelectedDataIdx([2, 0, 1], new Set([0, 1])), 0);
  });
});

describe("pickNextTaskRowByIdAsc", () => {
  const aoa = [
    ["任务ID", "任务链", "备注"],
    [403, 1, "c"],
    [401, 1, "a"],
    [402, 1, "b"],
  ];

  it("returns smallest task id regardless of selection order", () => {
    assert.equal(pickNextTaskRowByIdAsc(aoa, new Set([0, 1, 2])), 1);
    assert.equal(pickNextTaskRowByIdAsc(aoa, new Set([0, 2])), 2);
    assert.equal(pickNextTaskRowByIdAsc(aoa, new Set([0])), 0);
  });

  it("sorts numerically not lexically", () => {
    const wide = [
      ["任务ID"],
      [9],
      [10],
    ];
    assert.equal(pickNextTaskRowByIdAsc(wide, new Set([0, 1])), 0);
  });
});

describe("validateTaskChainSelection", () => {
  const aoa = [
    ["任务ID", "任务链"],
    [401, 1],
    [402, 1],
    [403, 1],
    [501, 2],
    [502, 2],
    [503, 2],
  ];

  it("rejects gap within one chain", () => {
    const r = validateTaskChainSelection(aoa, new Set([0, 2]));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /402/);
  });

  it("passes when chain interval is fully selected", () => {
    assert.deepEqual(validateTaskChainSelection(aoa, new Set([0, 1, 2])), { ok: true });
  });

  it("validates chains independently", () => {
    assert.deepEqual(validateTaskChainSelection(aoa, new Set([3, 4])), { ok: true });
    assert.deepEqual(validateTaskChainSelection(aoa, new Set([0, 3])), { ok: true });
  });

  it("reports multiple chain gaps", () => {
    const r = validateTaskChainSelection(aoa, new Set([0, 2, 3, 5]));
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.message, /402/);
      assert.match(r.message, /502/);
    }
  });
});
