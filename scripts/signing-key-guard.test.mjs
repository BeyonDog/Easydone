import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSigningKeyConsistent,
  checkSigningKeyConsistent,
  loadLock,
  readTauriPubkey,
} from "./signing-key-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH = path.join(root, "keys", "signing-key.lock.json");

describe("signing-key-guard", () => {
  it("lock matches tauri.conf and .pub in repo", () => {
    const lock = loadLock();
    const tauri = readTauriPubkey();
    assert.ok(lock?.pubkey);
    assert.equal(lock.pubkey.trim(), tauri);
    const r = checkSigningKeyConsistent();
    assert.equal(r.ok, true);
    assertSigningKeyConsistent();
  });

  it("fails when lock pubkey disagrees with tauri.conf", () => {
    const lock = loadLock();
    const original = lock.pubkey;
    const tampered = `${original}x`;
    fs.writeFileSync(LOCK_PATH, `${JSON.stringify({ ...lock, pubkey: tampered }, null, 2)}\n`, "utf8");
    try {
      const r = checkSigningKeyConsistent();
      assert.equal(r.ok, false);
      assert.match(r.message, /signing-key\.lock\.json|禁止换钥/);
    } finally {
      fs.writeFileSync(LOCK_PATH, `${JSON.stringify({ ...lock, pubkey: original }, null, 2)}\n`, "utf8");
    }
  });
});
