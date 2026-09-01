import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  findGtopEnvByName,
  GTOP_BRANCH_SERVER_ALLOWLIST,
  GTOP_FIXED_ENV_NAME,
  missingGtopBranchServerNames,
  mapOverseasGmtEnvToGtopRegionServerName,
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

describe("mapOverseasGmtEnvToGtopRegionServerName", () => {
  it("maps pt/cvt/rct03~05 to GNG-* hosts", () => {
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("pt02", 2), "GNG-pt02");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("pt01", 2), "GNG-pt01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("cvt01", 2), "GNG-cvt01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("cvt02", 2), "GNG-cvt02");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("rct03", 2), "GNG-rct03");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("rct04", 2), "GNG-rct04");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("rct05", 2), "GNG-rct05");
  });

  it("maps rct01/rct02 to krad-* regardless of protocol", () => {
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("rct01", 1), "krad-rct01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("rct01", 2), "krad-rct01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("rct02", 1), "krad-rct02");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("rct02", 2), "krad-rct02");
  });

  it("maps ambiguous sbt via protocol", () => {
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("sbt", 1), "krad-sbt01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("sbt", 2), "krad-sbt02");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("sbt"), null);
  });

  it("maps sbt01/sbt02 directly", () => {
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("sbt01", 1), "krad-sbt01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("sbt02", 2), "krad-sbt02");
  });

  it("maps kd-cn-* hosts to themselves", () => {
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("kd-cn-rct01", 2), "kd-cn-rct01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("kd-cn-rct02", 2), "kd-cn-rct02");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("kd-cn-sbt01", 2), "kd-cn-sbt01");
  });

  it("returns null for CCS", () => {
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("CCS", 2), null);
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("(GRPC)CCS", 2), null);
  });

  it("accepts prefixed names like grpc-rct01 / gsgci_rct01", () => {
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("grpc-rct01", 2), "krad-rct01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("GSGCI_rct01", 1), "krad-rct01");
    assert.equal(mapOverseasGmtEnvToGtopRegionServerName("grpc-sbt", 2), "krad-sbt02");
  });
});
