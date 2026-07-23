import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findGtopEnvByName,
  GTOP_BRANCH_SERVER_ALLOWLIST,
  GTOP_FIXED_ENV_NAME,
  missingGtopBranchServerNames,
  resolveGtopBranchServerOptions,
} from "./gtopBranchServers.ts";

describe("findGtopEnvByName", () => {
  const envs = [
    { id: "99", name: "other-env" },
    { id: "112", name: GTOP_FIXED_ENV_NAME },
  ];

  it("matches fixed env name exactly", () => {
    const hit = findGtopEnvByName(envs);
    assert.equal(hit?.id, "112");
    assert.equal(hit?.name, GTOP_FIXED_ENV_NAME);
  });

  it("falls back to krad-office + 内网测试 substring", () => {
    const fuzzy = [
      { id: "7", name: "krad-office 内网测试环境" },
      { id: "8", name: "other" },
    ];
    assert.equal(findGtopEnvByName(fuzzy)?.id, "7");
  });

  it("returns undefined when not found", () => {
    assert.equal(findGtopEnvByName([{ id: "1", name: "x" }]), undefined);
  });

  it("does not fall back to the office environment when CN external is requested", () => {
    assert.equal(
      findGtopEnvByName(
        [{ id: "31", name: "krad-office内网测试环境" }],
        "krad-外网测试环境",
      ),
      undefined,
    );
  });
});

describe("resolveGtopBranchServerOptions", () => {
  it("maps allowlist names to server ids", () => {
    const opts = resolveGtopBranchServerOptions([
      { id: "128", name: "krad-sbt01" },
      { id: "64", name: "GNG-pt01" },
    ]);
    const sbt = opts.find((o) => o.name === "krad-sbt01");
    assert.equal(sbt?.id, "128");
    assert.deepEqual(missingGtopBranchServerNames(opts).length, opts.length - 2);
  });

  it("includes kd-cn hosts and resolves their ids", () => {
    assert.ok(GTOP_BRANCH_SERVER_ALLOWLIST.includes("kd-cn-rct01"));
    assert.ok(GTOP_BRANCH_SERVER_ALLOWLIST.includes("kd-cn-rct02"));
    assert.ok(GTOP_BRANCH_SERVER_ALLOWLIST.includes("kd-cn-sbt01"));
    const opts = resolveGtopBranchServerOptions([
      { id: "201", name: "kd-cn-rct01" },
      { id: "202", name: "kd-cn-rct02" },
      { id: "203", name: "kd-cn-sbt01" },
    ]);
    assert.equal(opts.find((o) => o.name === "kd-cn-rct01")?.id, "201");
    assert.equal(opts.find((o) => o.name === "kd-cn-rct02")?.id, "202");
    assert.equal(opts.find((o) => o.name === "kd-cn-sbt01")?.id, "203");
  });

  it("keeps kd-cn office hosts separate from the CN platform targets", () => {
    const opts = resolveGtopBranchServerOptions([
      { id: "201", name: "kd-cn-rct01" },
      { id: "202", name: "kd-cn-rct02" },
      { id: "203", name: "kd-cn-sbt01" },
    ]);
    const cnOptions = opts.filter((o) => o.name.startsWith("kd-cn-"));
    assert.deepEqual(
      cnOptions.map(({ name, displayName, id }) => ({ name, displayName, id })),
      [
        { name: "kd-cn-rct02", displayName: "kd-cn-rct02", id: "202" },
        { name: "kd-cn-rct01", displayName: "kd-cn-rct01", id: "201" },
        { name: "kd-cn-sbt01", displayName: "kd-cn-sbt01", id: "203" },
      ],
    );
  });

  it("resolves the three CN platform servers from the external test environment", () => {
    const opts = resolveGtopBranchServerOptions(
      [
        { id: "328", name: "CN-rct01" },
        { id: "329", name: "CN-rct02" },
        { id: "261", name: "CN-sbt" },
      ],
      "cn",
    );
    assert.deepEqual(
      opts.map(({ name, displayName, id }) => ({ name, displayName, id })),
      [
        { name: "CN-rct02", displayName: "(GRPC) CNRCT02", id: "329" },
        { name: "CN-rct01", displayName: "(GRPC) CNRCT01", id: "328" },
        { name: "CN-sbt", displayName: "(GRPC) CNSBT", id: "261" },
      ],
    );
    assert.deepEqual(missingGtopBranchServerNames(opts), []);
  });
});
