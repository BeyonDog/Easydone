import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MANUAL_INSTALL_DOWNLOAD_URL,
  UPDATE_UP_TO_DATE_MESSAGE,
  formatUpdateCheckErrorWithUrlPart,
  formatUpdateInstallError,
  isManifestNotFound,
  isUpdaterSignatureKeyMismatch,
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

  it("maps updater signature key mismatch to Chinese with manual install URL", () => {
    const raw = "The signature was created with a different key than the one provided";
    assert.equal(isUpdaterSignatureKeyMismatch(raw), true);
    const msg = formatUpdateCheckErrorWithUrlPart(raw, "");
    assert.match(msg, /公钥不一致/);
    assert.match(msg, /手动安装/);
    assert.ok(msg.includes(MANUAL_INSTALL_DOWNLOAD_URL));
  });
});

describe("formatUpdateInstallError", () => {
  it("maps signature key mismatch", () => {
    const raw = "The signature was created with a different key than the one provided";
    const msg = formatUpdateInstallError(raw);
    assert.match(msg, /公钥不一致/);
    assert.ok(msg.includes(MANUAL_INSTALL_DOWNLOAD_URL));
  });

  it("keeps unrelated errors", () => {
    assert.equal(formatUpdateInstallError("disk full"), "disk full");
  });

  it("defaults empty message", () => {
    assert.equal(formatUpdateInstallError("   "), "更新安装失败");
  });
});
