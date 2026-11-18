import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearPendingUpdateVersion,
  evaluatePendingUpdate,
  formatPendingUpdateFailedMessage,
  getPendingUpdateVersion,
  setPendingUpdateVersion,
  versionedInstallerUrl,
} from "./pendingUpdate.ts";

describe("pendingUpdate", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, String(v));
      },
      removeItem: (k) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  });

  afterEach(() => {
    clearPendingUpdateVersion();
  });

  it("stores and clears pending version", () => {
    setPendingUpdateVersion("1.2.8");
    assert.equal(getPendingUpdateVersion(), "1.2.8");
    clearPendingUpdateVersion();
    assert.equal(getPendingUpdateVersion(), null);
  });

  it("builds versioned installer URL from manifest endpoint", () => {
    const url = versionedInstallerUrl("1.2.8");
    assert.ok(url);
    assert.match(url!, /easydone_1\.2\.8_x64-setup\.exe$/);
  });

  it("marks pending update as failed when still on older version", () => {
    const result = evaluatePendingUpdate("1.2.4", "1.2.7");
    assert.equal(result.kind, "failed");
    if (result.kind === "failed") {
      assert.match(result.message, /未成功覆盖安装/);
      assert.match(result.message, /1\.2\.4/);
      assert.match(result.message, /1\.2\.7/);
    }
  });

  it("marks pending update as success when version matches", () => {
    const result = evaluatePendingUpdate("1.2.7", "1.2.7");
    assert.equal(result.kind, "success");
  });

  it("formats a manual install hint", () => {
    const msg = formatPendingUpdateFailedMessage("1.2.4", "1.2.7");
    assert.match(msg, /easydone_1\.2\.7_x64-setup\.exe/);
  });
});
