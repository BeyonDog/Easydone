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

  it("maps GNG-prefixed rct04/rct05 to GRPC labels", () => {
    assert.equal(getBranchEnvDisplayLabel("GNG-rct04"), "(GRPC) rct04");
    assert.equal(getBranchEnvDisplayLabel("GNG-rct05"), "(GRPC) rct05");
  });

  it("maps real CN GMT names while keeping kd-cn office hosts distinct", () => {
    assert.equal(getBranchEnvDisplayLabel("CNRCT02"), "(GRPC) CNRCT02");
    assert.equal(getBranchEnvDisplayLabel("CNRCT01"), "(GRPC) CNRCT01");
    assert.equal(getBranchEnvDisplayLabel("CNSBT"), "(GRPC) CNSBT");
    assert.equal(getBranchEnvDisplayLabel("kd-cn-rct02"), "kd-cn-rct02");
    assert.equal(getBranchEnvDisplayLabel("kd-cn-rct01"), "kd-cn-rct01");
    assert.equal(getBranchEnvDisplayLabel("kd-cn-sbt01"), "kd-cn-sbt01");
    assert.notEqual(getBranchEnvDisplayLabel("kd-cn-rct01"), "(GRPC) rct01");
    assert.notEqual(getBranchEnvDisplayLabel("kd-cn-rct01"), "(GSGCI) rct01");
  });

  it("does not let kd-cn hosts disturb overseas GRPC/GSGCI disambiguation", () => {
    const labels = buildBranchEnvDisplayLabelMap([
      { id: 1, name: "kd-cn-rct01", protocol: 2 },
      { id: 17, name: "rct01", protocol: 2 },
      { id: 25, name: "rct01", protocol: 1 },
    ]);
    assert.equal(labels.get("1"), "kd-cn-rct01");
    assert.equal(labels.get("17"), "(GRPC) rct01");
    assert.equal(labels.get("25"), "(GSGCI) rct01");
  });

  it("keeps GMT API names unchanged while sorting CN environments", () => {
    const items = [
      { id: 3, name: "CNSBT", protocol: 2 },
      { id: 6, name: "CNRCT01", protocol: 2 },
      { id: 7, name: "CNRCT02", protocol: 2 },
    ];
    const sorted = sortBranchEnvEntries(items);
    assert.deepEqual(
      sorted.map(({ name }) => name),
      ["CNRCT02", "CNRCT01", "CNSBT"],
    );
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
    assert.equal(BRANCH_ENV_DISPLAY_ORDER.length, 20);
    assert.equal(BRANCH_ENV_DISPLAY_ORDER[1], "(GRPC)pt01");
    assert.equal(BRANCH_ENV_DISPLAY_ORDER[9], "(GRPC)CCS");
    assert.equal(BRANCH_ENV_DISPLAY_ORDER[14], "kd-cn-rct01");
    assert.equal(BRANCH_ENV_DISPLAY_ORDER[17], "(GRPC) CNRCT02");
    assert.equal(BRANCH_ENV_DISPLAY_ORDER[18], "(GRPC) CNRCT01");
    assert.equal(BRANCH_ENV_DISPLAY_ORDER[19], "(GRPC) CNSBT");
  });
});
