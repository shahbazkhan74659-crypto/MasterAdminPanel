import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { pool } from "../db/pool.js";
import { ensureSchema } from "../db/schema.js";
import { setSecret } from "../secrets/store.js";
import { REMOTE_SITE_IDS } from "../sqlConsole/connections.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env.local", import.meta.url)) });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  await ensureSchema();

  await setSecret("db-credential", "target-postgres", {
    host: requireEnv("TARGET_PG_HOST"),
    port: Number(requireEnv("TARGET_PG_PORT")),
    database: requireEnv("TARGET_PG_NAME"),
    user: requireEnv("TARGET_PG_USER"),
    password: requireEnv("TARGET_PG_PASSWORD"),
  });
  console.log("Migrated secret: db-credential/target-postgres");

  await setSecret("db-credential", "target-mysql", {
    host: requireEnv("TARGET_MYSQL_HOST"),
    port: Number(requireEnv("TARGET_MYSQL_PORT")),
    database: requireEnv("TARGET_MYSQL_NAME"),
    user: requireEnv("TARGET_MYSQL_USER"),
    password: requireEnv("TARGET_MYSQL_PASSWORD"),
  });
  console.log("Migrated secret: db-credential/target-mysql");

  await setSecret("db-credential", "target-sqlite", {
    path: requireEnv("TARGET_SQLITE_PATH"),
  });
  console.log("Migrated secret: db-credential/target-sqlite");

  for (const id of REMOTE_SITE_IDS) {
    const prefix = `REMOTE_SITE_${id.toUpperCase()}`;
    await setSecret("db-credential", `remote-site:${id}`, {
      host: requireEnv(`${prefix}_HOST`),
      port: Number(requireEnv(`${prefix}_PORT`)),
      database: requireEnv(`${prefix}_NAME`),
      user: requireEnv(`${prefix}_USER`),
      password: requireEnv(`${prefix}_PASSWORD`),
    });
    console.log(`Migrated secret: db-credential/remote-site:${id}`);
  }

  console.log(
    "\nDone. You can now remove TARGET_* and REMOTE_SITE_* entries from .env.local " +
      "(keep SECRETS_MASTER_KEY, ADMINPANEL_DB_*, and SESSION_SECRET)."
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
