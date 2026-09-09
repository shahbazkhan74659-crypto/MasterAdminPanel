import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { ensureSchema } from "../db/schema.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env.local", import.meta.url)) });

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Usage: npm run seed:owner -- <username> <password>");
    process.exit(1);
  }

  await ensureSchema();
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, updated_at = now()`,
    [username, passwordHash]
  );

  console.log(`Seeded/updated owner account "${username}".`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
