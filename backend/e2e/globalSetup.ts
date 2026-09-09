import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)) });

async function globalSetup() {
  const { pool } = await import("../src/db/pool.js");
  const { ensureSchema } = await import("../src/db/schema.js");
  const { upsertUser } = await import("../src/scripts/upsertUser.js");
  const { E2E_USERNAME, E2E_PASSWORD } = await import("./testCredentials.js");

  await ensureSchema();
  await upsertUser(E2E_USERNAME, E2E_PASSWORD);
  await pool.end();
}

export default globalSetup;
