/**
 * Encryption for deep memory using node:crypto.
 *
 * Uses AES-256-GCM — simpler and more secure than Fernet.
 * No need for Python byte-compatibility since this is a fresh deployment.
 *
 * Token format: base64(12-byte IV + ciphertext + 16-byte auth tag)
 * Key: 32 bytes, stored as base64 in data/.dream_key
 */

import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { DATA_DIR, DREAM_ENCRYPTION_KEY } from "./config.js";

const KEY_FILE = resolve(DATA_DIR, ".dream_key");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class Cipher {
  private key: Buffer;

  constructor(key: Buffer) {
    if (key.length !== 32) {
      throw new Error("Encryption key must be 32 bytes");
    }
    this.key = key;
  }

  static generateKey(): string {
    return randomBytes(32).toString("base64");
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf-8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const token = Buffer.concat([iv, encrypted, authTag]);
    return token.toString("base64");
  }

  decrypt(token: string): string {
    const data = Buffer.from(token, "base64");
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf-8");
  }
}

export function getOrCreateDreamKey(): Buffer {
  if (DREAM_ENCRYPTION_KEY) {
    return Buffer.from(DREAM_ENCRYPTION_KEY, "base64");
  }

  if (existsSync(KEY_FILE)) {
    return Buffer.from(readFileSync(KEY_FILE, "utf-8").trim(), "base64");
  }

  const key = Cipher.generateKey();
  writeFileSync(KEY_FILE, key);
  chmodSync(KEY_FILE, 0o600);
  return Buffer.from(key, "base64");
}

let _cipher: Cipher | null = null;

export function getCipher(): Cipher {
  if (!_cipher) {
    _cipher = new Cipher(getOrCreateDreamKey());
  }
  return _cipher;
}
