import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { issueReportSignature, isTaskIssueAlertActive } from "./taskIssueAck.ts";

describe("issueReportSignature", () => {
  it("is empty for no issues", () => {
    assert.equal(issueReportSignature([]), "");
  });

  it("is stable regardless of issue order", () => {
    const a = issueReportSignature([
      { taskId: "2", kind: "missing_field", conditionId: "b", message: "m2" },
      { taskId: "1", kind: "empty_conditions", conditionId: "a", message: "m1" },
    ]);
    const b = issueReportSignature([
      { taskId: "1", kind: "empty_conditions", conditionId: "a", message: "m1" },
      { taskId: "2", kind: "missing_field", conditionId: "b", message: "m2" },
    ]);
    assert.equal(a, b);
    assert.notEqual(a, "");
  });

  it("changes when an issue is added", () => {
    const one = issueReportSignature([
      { taskId: "1", kind: "empty_conditions", conditionId: "", message: "empty" },
    ]);
    const two = issueReportSignature([
      { taskId: "1", kind: "empty_conditions", conditionId: "", message: "empty" },
      { taskId: "2", kind: "dangling_condition", conditionId: "9", message: "gone" },
    ]);
    assert.notEqual(one, two);
  });
});

describe("isTaskIssueAlertActive", () => {
  it("is inactive when there are no issues", () => {
    assert.equal(isTaskIssueAlertActive("", null), false);
    assert.equal(isTaskIssueAlertActive("", "anything"), false);
  });

  it("is active when issues exist and have not been viewed", () => {
    const sig = issueReportSignature([
      { taskId: "1", kind: "empty_conditions", conditionId: "", message: "empty" },
    ]);
    assert.equal(isTaskIssueAlertActive(sig, null), true);
  });

  it("is inactive after the same signature is acknowledged", () => {
    const sig = issueReportSignature([
      { taskId: "1", kind: "empty_conditions", conditionId: "", message: "empty" },
    ]);
    assert.equal(isTaskIssueAlertActive(sig, sig), false);
  });

  it("is active again when the signature changes after ack", () => {
    const first = issueReportSignature([
      { taskId: "1", kind: "empty_conditions", conditionId: "", message: "empty" },
    ]);
    const next = issueReportSignature([
      { taskId: "1", kind: "empty_conditions", conditionId: "", message: "empty" },
      { taskId: "2", kind: "missing_field", conditionId: "c", message: "no loc" },
    ]);
    assert.equal(isTaskIssueAlertActive(next, first), true);
  });
});
