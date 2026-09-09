import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";

export async function upsertUser(username: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
    [username, passwordHash]
  );
}
