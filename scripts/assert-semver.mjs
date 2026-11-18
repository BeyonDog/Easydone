/**
 * Strict SemVer X.Y.Z (optional -prerelease / +build), matching Tauri config requirements.
 * Rejects shorthand like "1.3".
 */

/** @param {unknown} version */
export function isValidSemver(version) {
  if (typeof version !== "string") return false;
  const v = version.trim();
  // MAJOR.MINOR.PATCH with optional pre-release / build metadata
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    v,
  );
}

/**
 * @param {unknown} version
 * @param {string} [label]
 * @returns {string} trimmed valid version
 */
export function assertValidSemver(version, label = "版本号") {
  const v = typeof version === "string" ? version.trim() : "";
  if (!isValidSemver(v)) {
    throw new Error(
      `${label}必须是完整 semver（如 1.3.0），当前为「${version ?? ""}」。` +
        ` Tauri 不接受「1.3」这类缺 patch 的写法。`,
    );
  }
  return v;
}
