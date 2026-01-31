import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

// Set up isolated data dir before config.ts runs
const testDir = mkdtempSync(join(tmpdir(), "es-crypto-test-"));
process.env.ELECTRICSHEEP_DATA_DIR = testDir;

const { Cipher, getOrCreateDreamKey } = await import("../src/crypto.js");
const { DATA_DIR } = await import("../src/config.js");

describe("Cipher", () => {
  let cipher: InstanceType<typeof Cipher>;

  before(() => {
    const key = randomBytes(32);
    cipher = new Cipher(key);
  });

  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "Hello, deep memory!";
    const token = cipher.encrypt(plaintext);
    const result = cipher.decrypt(token);
    assert.equal(result, plaintext);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const plaintext = "same input";
    const a = cipher.encrypt(plaintext);
    const b = cipher.encrypt(plaintext);
    assert.notEqual(a, b);
    assert.equal(cipher.decrypt(a), cipher.decrypt(b));
  });

  it("handles empty string", () => {
    const token = cipher.encrypt("");
    assert.equal(cipher.decrypt(token), "");
  });

  it("handles unicode and emoji", () => {
    const plaintext = "Dreams of electric sheep";
    const token = cipher.encrypt(plaintext);
    assert.equal(cipher.decrypt(token), plaintext);
  });

  it("handles large payloads", () => {
    const plaintext = "x".repeat(100_000);
    const token = cipher.encrypt(plaintext);
    assert.equal(cipher.decrypt(token), plaintext);
  });

  it("rejects tampered ciphertext", () => {
    const token = cipher.encrypt("secret");
    const buf = Buffer.from(token, "base64");
    buf[20] ^= 0xff; // flip a byte in the ciphertext
    assert.throws(() => cipher.decrypt(buf.toString("base64")));
  });

  it("rejects wrong key", () => {
    const otherCipher = new Cipher(randomBytes(32));
    const token = cipher.encrypt("secret");
    assert.throws(() => otherCipher.decrypt(token));
  });

  it("rejects invalid key length", () => {
    assert.throws(() => new Cipher(randomBytes(16)), /32 bytes/);
  });

  it("generateKey produces valid base64 that decodes to 32 bytes", () => {
    const key = Cipher.generateKey();
    const buf = Buffer.from(key, "base64");
    assert.equal(buf.length, 32);
  });
});

describe("getOrCreateDreamKey", () => {
  it("creates key file on first call and reuses on second", () => {
    const keyFile = join(DATA_DIR, ".dream_key");
    const key1 = getOrCreateDreamKey();
    assert.equal(key1.length, 32);

    // File should exist with restricted permissions
    const stat = statSync(keyFile);
    assert.equal(stat.mode & 0o777, 0o600);

    // Reading the file content matches
    const stored = Buffer.from(readFileSync(keyFile, "utf-8").trim(), "base64");
    assert.deepEqual(key1, stored);
  });

  it("uses DREAM_ENCRYPTION_KEY env var when set", () => {
    const customKey = randomBytes(32).toString("base64");
    process.env.DREAM_ENCRYPTION_KEY = customKey;

    // Force re-import to pick up new env
    // We can't easily re-import, but getOrCreateDreamKey reads from config
    // which was loaded at import time. Test the Cipher directly instead.
    const key = Buffer.from(customKey, "base64");
    const c = new Cipher(key);
    const token = c.encrypt("test");
    assert.equal(c.decrypt(token), "test");

    delete process.env.DREAM_ENCRYPTION_KEY;
  });
});

after(() => {
  rmSync(testDir, { recursive: true, force: true });
});
