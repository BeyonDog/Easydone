import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectBackupSources, missingBackupSources } from "./backup-key-repo.mjs";

describe("backup-key-repo sources", () => {
  it("lists three backup files with exists flags", () => {
    const sources = collectBackupSources();
    assert.equal(sources.length, 3);
    assert.ok(sources.every((s) => s.dest && typeof s.exists === "boolean"));
  });

  it("missingBackupSources only returns absent files", () => {
    const missing = missingBackupSources();
    for (const m of missing) {
      assert.equal(m.exists, false);
    }
  });
});
