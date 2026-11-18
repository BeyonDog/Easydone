import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertValidSemver, isValidSemver } from "./assert-semver.mjs";

describe("isValidSemver", () => {
  it("accepts full X.Y.Z", () => {
    assert.equal(isValidSemver("1.3.0"), true);
    assert.equal(isValidSemver("0.9.5"), true);
    assert.equal(isValidSemver("10.0.1"), true);
  });

  it("accepts prerelease and build metadata", () => {
    assert.equal(isValidSemver("1.3.0-beta.1"), true);
    assert.equal(isValidSemver("1.3.0+build.2"), true);
  });

  it("rejects shorthand and empty", () => {
    assert.equal(isValidSemver("1.3"), false);
    assert.equal(isValidSemver("1"), false);
    assert.equal(isValidSemver(""), false);
    assert.equal(isValidSemver(" 1.3 "), false);
    assert.equal(isValidSemver(null), false);
  });
});

describe("assertValidSemver", () => {
  it("returns trimmed version when valid", () => {
    assert.equal(assertValidSemver(" 1.3.0 "), "1.3.0");
  });

  it("throws a clear error for 1.3", () => {
    assert.throws(() => assertValidSemver("1.3"), /完整 semver/);
  });
});
