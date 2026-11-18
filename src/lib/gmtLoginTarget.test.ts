import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyGmtLoginCookie,
  gmtCookieForTarget,
  gmtLoginProbeSliceForTarget,
  gmtLoginTargetFromConfig,
  gmtLoginTargetLabel,
  gmtSessionSliceForTarget,
  gmtSessionSliceFromConfig,
} from "./gmtLoginTarget.ts";
import { PRELIVE_GMT_BASE_URL, PRELIVE_GMT_ENV } from "./gmtClient.ts";

const baseConfig = {
  gmtPlatform: "overseas" as const,
  gmtPreliveEnabled: false,
  gmtBaseUrl: "https://custom-overseas.example",
  gmtCookie: "overseas-cookie",
  gmtCnCookie: "cn-cookie",
  gmtPreliveCookie: "pr-cookie",
  gmtEnvId: 17,
};

describe("gmtLoginTargetFromConfig", () => {
  it("maps cn platform to cn", () => {
    assert.equal(gmtLoginTargetFromConfig({ gmtPlatform: "cn" }), "cn");
  });

  it("maps overseas PR to prelive", () => {
    assert.equal(gmtLoginTargetFromConfig({ gmtPlatform: "overseas", gmtPreliveEnabled: true }), "prelive");
  });

  it("maps overseas non-PR to overseas", () => {
    assert.equal(gmtLoginTargetFromConfig({ gmtPlatform: "overseas", gmtPreliveEnabled: false }), "overseas");
  });
});

describe("gmtLoginTargetLabel", () => {
  it("returns Chinese labels", () => {
    assert.equal(gmtLoginTargetLabel("cn"), "国服");
    assert.equal(gmtLoginTargetLabel("overseas"), "海外");
    assert.equal(gmtLoginTargetLabel("prelive"), "海外(PR)");
  });
});

describe("gmtCookieForTarget", () => {
  it("reads the correct cookie slot per target", () => {
    assert.equal(gmtCookieForTarget(baseConfig, "overseas"), "overseas-cookie");
    assert.equal(gmtCookieForTarget(baseConfig, "cn"), "cn-cookie");
    assert.equal(gmtCookieForTarget(baseConfig, "prelive"), "pr-cookie");
  });
});

describe("applyGmtLoginCookie", () => {
  it("writes only the target slot without touching others", () => {
    const next = applyGmtLoginCookie(baseConfig, "prelive", "new-pr");
    assert.equal(next.gmtPreliveCookie, "new-pr");
    assert.equal(next.gmtCookie, "overseas-cookie");
    assert.equal(next.gmtCnCookie, "cn-cookie");
  });
});

describe("gmtSessionSliceFromConfig", () => {
  it("uses the CN GMT endpoint and cookie for the cn platform", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "cn",
      gmtBaseUrl: "https://test-krad.stdgmtool.web.garena.cn",
      gmtCookie: "overseas-cookie",
      gmtCnCookie: "cn-cookie",
      gmtPreliveCookie: "pr-cookie",
      gmtEnvId: 7,
      gmtPreliveEnabled: true,
    });

    assert.deepEqual(slice, {
      gmtBaseUrl: "https://test-gngcnprod.stdgmtool.web.garena.cn",
      gmtCookie: "cn-cookie",
      gmtEnvId: 7,
    });
  });

  it("keeps the existing GMT endpoint and cookie for the overseas platform", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "overseas",
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtCnCookie: "cn-cookie",
      gmtPreliveCookie: "pr-cookie",
      gmtEnvId: 17,
    });

    assert.deepEqual(slice, {
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtEnvId: 17,
    });
  });

  it("routes overseas PR mode to pre-krad with gmtPreliveCookie", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "overseas",
      gmtPreliveEnabled: true,
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtCnCookie: "cn-cookie",
      gmtPreliveCookie: "pr-cookie",
      gmtEnvId: 99,
    });

    assert.deepEqual(slice, {
      gmtBaseUrl: PRELIVE_GMT_BASE_URL,
      gmtCookie: "pr-cookie",
      gmtEnvId: 99,
    });
  });

  it("falls back to PreLive-SG id when PR mode has no env id", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "overseas",
      gmtPreliveEnabled: true,
      gmtCookie: "overseas-cookie",
      gmtPreliveCookie: "pr-cookie",
    });

    assert.equal(slice.gmtEnvId, PRELIVE_GMT_ENV.id);
    assert.equal(slice.gmtCookie, "pr-cookie");
  });
});

describe("gmtSessionSliceForTarget", () => {
  it("builds slice for explicit target regardless of current platform", () => {
    const slice = gmtSessionSliceForTarget(baseConfig, "prelive");
    assert.equal(slice.gmtBaseUrl, PRELIVE_GMT_BASE_URL);
    assert.equal(slice.gmtCookie, "pr-cookie");
  });
});

describe("gmtLoginProbeSliceForTarget", () => {
  const prTopbarConfig = {
    ...baseConfig,
    gmtPreliveEnabled: true,
    gmtEnvId: 99,
  };

  it("omits env id for all targets so settings probes are independent of topbar", () => {
    for (const target of ["overseas", "cn", "prelive"] as const) {
      const slice = gmtLoginProbeSliceForTarget(prTopbarConfig, target);
      assert.equal(slice.gmtEnvId, null);
    }
  });

  it("keeps per-target baseUrl and cookie", () => {
    assert.deepEqual(gmtLoginProbeSliceForTarget(prTopbarConfig, "overseas"), {
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtEnvId: null,
    });
    assert.deepEqual(gmtLoginProbeSliceForTarget(prTopbarConfig, "cn"), {
      gmtBaseUrl: "https://test-gngcnprod.stdgmtool.web.garena.cn",
      gmtCookie: "cn-cookie",
      gmtEnvId: null,
    });
    assert.deepEqual(gmtLoginProbeSliceForTarget(prTopbarConfig, "prelive"), {
      gmtBaseUrl: PRELIVE_GMT_BASE_URL,
      gmtCookie: "pr-cookie",
      gmtEnvId: null,
    });
  });
});
