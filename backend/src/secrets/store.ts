import { pool } from "../db/pool.js";
import { encrypt, decrypt } from "./crypto.js";

export type SecretCategory = "db-credential" | "api-key";

export async function setSecret(category: SecretCategory, key: string, value: unknown): Promise<void> {
  const { ciphertext, iv, authTag } = encrypt(JSON.stringify(value));
  await pool.query(
    `INSERT INTO secrets (category, key, ciphertext, iv, auth_tag)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (category, key) DO UPDATE
       SET ciphertext = EXCLUDED.ciphertext,
           iv = EXCLUDED.iv,
           auth_tag = EXCLUDED.auth_tag,
           updated_at = now()`,
    [category, key, ciphertext, iv, authTag]
  );
}

export async function getSecret<T = unknown>(category: SecretCategory, key: string): Promise<T | null> {
  const result = await pool.query<{ ciphertext: string; iv: string; auth_tag: string }>(
    "SELECT ciphertext, iv, auth_tag FROM secrets WHERE category = $1 AND key = $2",
    [category, key]
  );
  const row = result.rows[0];
  if (!row) return null;
  const plaintext = decrypt({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag });
  return JSON.parse(plaintext) as T;
}

export async function requireSecret<T = unknown>(category: SecretCategory, key: string): Promise<T> {
  const value = await getSecret<T>(category, key);
  if (value === null) {
    throw new Error(`Missing secret: ${category}/${key}`);
  }
  return value;
}
