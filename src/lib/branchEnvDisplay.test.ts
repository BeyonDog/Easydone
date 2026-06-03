import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BRANCH_ENV_DISPLAY_ORDER,
  branchGroupFromProtocol,
  buildBranchEnvDisplayLabelMap,
  getBranchEnvDisplayLabel,
  sortBranchEnvEntries,
} from "./branchEnvDisplay.ts";

describe("branchEnvDisplay", () => {
  it("maps GRPC/GSGCI rct01 separately", () => {
    assert.equal(getBranchEnvDisplayLabel("grpc-rct01"), "(GRPC) rct01");
    assert.equal(getBranchEnvDisplayLabel("GSGCI_rct01"), "(GSGCI) rct01");
    assert.equal(getBranchEnvDisplayLabel("rct01", 1), null);
  });

  it("maps protocol to branch group", () => {
    assert.equal(branchGroupFromProtocol(1), "GSGCI");
    assert.equal(branchGroupFromProtocol(2), "GRPC");
    assert.equal(branchGroupFromProtocol(undefined), null);
  });

  it("sorts known envs by fixed order", () => {
    const items = [
      { id: 1, name: "grpc-rct01" },
      { id: 2, name: "GSGCI_rct01" },
      { id: 3, name: "pt02" },
      { id: 4, name: "unknown-env" },
    ];
    const sorted = sortBranchEnvEntries(items);
    assert.deepEqual(
      sorted.map((x) => getBranchEnvDisplayLabel(x.name) ?? x.name),
      ["(GRPC) pt02", "(GSGCI) rct01", "(GRPC) rct01", "unknown-env"],
    );
  });

  it("disambiguates two bare rct01 by protocol (HAR ids 17/25)", () => {
    const items = [
      { id: 17, name: "rct01", protocol: 2 },
      { id: 25, name: "rct01", protocol: 1 },
    ];
    const map = buildBranchEnvDisplayLabelMap(items);
    assert.equal(map.get("17"), "(GRPC) rct01");
    assert.equal(map.get("25"), "(GSGCI) rct01");
    const sorted = sortBranchEnvEntries(items);
    assert.deepEqual(
      sorted.map((x) => map.get(String(x.id))),
      ["(GSGCI) rct01", "(GRPC) rct01"],
    );
  });

  it("falls back to id order when protocol missing", () => {
    const items = [
      { id: 20, name: "rct01" },
      { id: 10, name: "rct01" },
    ];
    const map = buildBranchEnvDisplayLabelMap(items);
    assert.equal(map.get("10"), "(GSGCI) rct01");
    assert.equal(map.get("20"), "(GRPC) rct01");
  });

  it("preserves exact display strings count", () => {
    assert.equal(BRANCH_ENV_DISPLAY_ORDER.length, 12);
    assert.equal(BRANCH_ENV_DISPLAY_ORDER[1], "(GRPC)pt01");
    assert.equal(BRANCH_ENV_DISPLAY_ORDER[7], "(GRPC)CCS");
  });
});
