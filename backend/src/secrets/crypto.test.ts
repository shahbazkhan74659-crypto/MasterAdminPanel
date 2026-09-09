import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { encrypt, decrypt } from "./crypto.js";

const TEST_KEY = "a1".repeat(32); // 64 hex chars = 32 bytes

describe("secrets/crypto", () => {
  beforeAll(() => {
    process.env.SECRETS_MASTER_KEY = TEST_KEY;
  });

  it("round-trips a plaintext string", () => {
    expect(decrypt(encrypt("hello world"))).toBe("hello world");
  });

  it("round-trips an empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("produces base64 iv/ciphertext/authTag, with a 12-byte iv", () => {
    const payload = encrypt("some value");
    expect(() => Buffer.from(payload.ciphertext, "base64")).not.toThrow();
    expect(() => Buffer.from(payload.authTag, "base64")).not.toThrow();
    expect(Buffer.from(payload.iv, "base64")).toHaveLength(12);
  });

  it("uses a distinct iv/ciphertext per call for identical plaintext", () => {
    const a = encrypt("same value");
    const b = encrypt("same value");
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("throws on a corrupted authTag", () => {
    const payload = encrypt("secret value");
    const tamperedTag = Buffer.from(payload.authTag, "base64");
    tamperedTag[0] = tamperedTag[0] ^ 0xff;
    expect(() => decrypt({ ...payload, authTag: tamperedTag.toString("base64") })).toThrow();
  });

  it("throws on corrupted ciphertext", () => {
    const payload = encrypt("secret value");
    const tamperedCiphertext = Buffer.from(payload.ciphertext, "base64");
    tamperedCiphertext[0] = tamperedCiphertext[0] ^ 0xff;
    expect(() => decrypt({ ...payload, ciphertext: tamperedCiphertext.toString("base64") })).toThrow();
  });

  describe("master key validation", () => {
    afterEach(() => {
      process.env.SECRETS_MASTER_KEY = TEST_KEY;
    });

    it("throws when SECRETS_MASTER_KEY is missing", () => {
      delete process.env.SECRETS_MASTER_KEY;
      expect(() => encrypt("x")).toThrow("SECRETS_MASTER_KEY is not set");
    });

    it("throws when SECRETS_MASTER_KEY is the wrong length", () => {
      process.env.SECRETS_MASTER_KEY = "abcd";
      expect(() => encrypt("x")).toThrow("64 hex characters");
    });
  });
});
