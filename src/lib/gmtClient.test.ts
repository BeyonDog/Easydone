import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRELIVE_GMT_BASE_URL,
  PRELIVE_GMT_ENV,
  gmtSessionSliceFromConfig,
} from "./gmtClient.ts";

describe("gmtSessionSliceFromConfig", () => {
  it("uses the CN GMT endpoint and cookie for the cn platform", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "cn",
      gmtBaseUrl: "https://test-krad.stdgmtool.web.garena.cn",
      gmtCookie: "overseas-cookie",
      gmtCnCookie: "cn-cookie",
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
      gmtEnvId: 17,
    });

    assert.deepEqual(slice, {
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtEnvId: 17,
    });
  });

  it("routes overseas PR mode to pre-krad with PreLive-SG env id", () => {
    const slice = gmtSessionSliceFromConfig({
      gmtPlatform: "overseas",
      gmtPreliveEnabled: true,
      gmtBaseUrl: "https://custom-overseas.example",
      gmtCookie: "overseas-cookie",
      gmtCnCookie: "cn-cookie",
      gmtEnvId: 17,
    });

    assert.deepEqual(slice, {
      gmtBaseUrl: PRELIVE_GMT_BASE_URL,
      gmtCookie: "overseas-cookie",
      gmtEnvId: PRELIVE_GMT_ENV.id,
    });
  });
});
