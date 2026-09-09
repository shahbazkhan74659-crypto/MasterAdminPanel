import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { pool } from "../db/pool.js";
import { ensureSchema } from "../db/schema.js";
import { upsertUser } from "./upsertUser.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env.local", import.meta.url)) });

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Usage: npm run seed:owner -- <username> <password>");
    process.exit(1);
  }

  await ensureSchema();
  await upsertUser(username, password);

  console.log(`Seeded/updated owner account "${username}".`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
