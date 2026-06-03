import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  UPDATE_UP_TO_DATE_MESSAGE,
  formatUpdateCheckErrorWithUrlPart,
  isManifestNotFound,
} from "./updateErrorText.ts";

describe("isManifestNotFound", () => {
  it("matches HTTP 404 variants", () => {
    assert.equal(isManifestNotFound("HTTP 404"), true);
    assert.equal(isManifestNotFound("HTTP 404：http://10.0.0.1/latest.json"), true);
    assert.equal(isManifestNotFound("HTTP 500"), false);
  });
});

describe("formatUpdateCheckErrorWithUrlPart", () => {
  it("maps 404 to up-to-date message", () => {
    const urlPart = "（http://10.21.125.168:8080/latest.json）";
    assert.equal(formatUpdateCheckErrorWithUrlPart("HTTP 404", urlPart), UPDATE_UP_TO_DATE_MESSAGE);
    assert.equal(
      formatUpdateCheckErrorWithUrlPart("HTTP 404：http://10.21.125.168:8080/latest.json", urlPart),
      UPDATE_UP_TO_DATE_MESSAGE,
    );
  });

  it("keeps other HTTP errors as failure messages", () => {
    const msg = formatUpdateCheckErrorWithUrlPart("HTTP 500", "");
    assert.match(msg, /更新清单请求失败/);
    assert.notEqual(msg, UPDATE_UP_TO_DATE_MESSAGE);
  });
});
