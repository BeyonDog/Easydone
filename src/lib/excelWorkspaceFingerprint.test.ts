import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC,
  fingerprintsEqual,
  normalizeExcelAutoRefreshIntervalSec,
} from "./excelWorkspaceFingerprint.ts";

describe("fingerprintsEqual", () => {
  it("compares item/mission/account mtimes", () => {
    assert.equal(
      fingerprintsEqual({ item: 1, mission: 2, account: 3 }, { item: 1, mission: 2, account: 3 }),
      true,
    );
    assert.equal(
      fingerprintsEqual({ item: 1, mission: 2, account: 3 }, { item: 1, mission: 2, account: 4 }),
      false,
    );
  });
});

describe("normalizeExcelAutoRefreshIntervalSec", () => {
  it("defaults when missing or invalid", () => {
    assert.equal(
      normalizeExcelAutoRefreshIntervalSec(undefined),
      DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC,
    );
    assert.equal(normalizeExcelAutoRefreshIntervalSec(-1), DEFAULT_EXCEL_AUTO_REFRESH_INTERVAL_SEC);
  });

  it("allows zero to disable", () => {
    assert.equal(normalizeExcelAutoRefreshIntervalSec(0), 0);
  });

  it("floors valid numbers", () => {
    assert.equal(normalizeExcelAutoRefreshIntervalSec(90.7), 90);
  });
});
