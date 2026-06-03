import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { healGmtEnvConfig } from "./healGmtEnvConfig.ts";

describe("healGmtEnvConfig", () => {
  const dualRct01 = [
    { id: 10, name: "rct01" },
    { id: 17, name: "rct01" },
  ];

  it("auto-fills id when name matches exactly one env", () => {
    const r = healGmtEnvConfig({ gmtEnvId: null, gmtEnvName: "pt02" }, [{ id: 3, name: "pt02" }]);
    assert.equal(r.kind, "persist");
    if (r.kind === "persist") {
      assert.deepEqual(r.next, { gmtEnvId: 3, gmtEnvName: "pt02" });
    }
  });

  it("clears ambiguous name-only config for duplicate rct01", () => {
    const r = healGmtEnvConfig({ gmtEnvId: null, gmtEnvName: "rct01" }, dualRct01);
    assert.equal(r.kind, "persist");
    if (r.kind === "persist") {
      assert.deepEqual(r.next, { gmtEnvId: null, gmtEnvName: null });
      assert.match(r.toast ?? "", /重新选择/);
    }
  });

  it("clears stale gmtEnvId not in env list", () => {
    const r = healGmtEnvConfig({ gmtEnvId: 999, gmtEnvName: "rct01" }, dualRct01);
    assert.equal(r.kind, "persist");
    if (r.kind === "persist") {
      assert.deepEqual(r.next, { gmtEnvId: null, gmtEnvName: null });
    }
  });
});
