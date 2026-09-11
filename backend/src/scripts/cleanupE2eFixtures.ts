import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { pool } from "../db/pool.js";
import { initConnections, pgPool, mysqlPool, sqliteDb, remoteSites } from "../sqlConsole/connections.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env.local", import.meta.url)) });

// Utility cleanup, not a one-shot migration: Phase 8's protected-table policy
// correctly blocks DROP TABLE on any name containing "user"/"credential"/
// "session"/"password"/"secret" (by design), which means any e2e test fixture
// matching that pattern (e.g. staging.spec.ts's `e2e_user_accounts_<timestamp>`,
// deployAllDrafts.spec.ts's `e2e_deploy_all_user_prefs_<timestamp>`) can never
// be torn down through the app's own SQL Console path. These leak permanently,
// exactly as documented in DECISIONS.md ("a human with direct DB access can
// clean these up manually whenever convenient"). This script does that direct
// DB operation -- bypassing the app's policy layer entirely on purpose, not
// weakening it for the app's own users. Matches any e2e-prefixed table whose
// name contains "user" (case-insensitive), covering every such fixture, not
// just one specific test's naming scheme.
async function main() {
  await initConnections();

  const { rows } = await pgPool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE 'e2e%user%'`
  );

  if (rows.length === 0) {
    console.log("No leftover e2e user-pattern fixture tables found.");
  } else {
    for (const { tablename } of rows) {
      await pgPool.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
      // The drafts table (adminpanel_app, a separate database from the target
      // postgres engine above) may hold a leftover row referencing this now-
      // dropped table too, e.g. a never-deployed draft staged against it.
      await pool.query(`DELETE FROM drafts WHERE engine = 'postgres' AND collection = $1`, [tablename]);
      console.log(`Dropped "${tablename}" (and any leftover draft referencing it)`);
    }
    console.log(`Dropped ${rows.length} leftover e2e fixture table(s).`);
  }

  await pool.end();
  await pgPool.end();
  await mysqlPool.end();
  sqliteDb.close();
  for (const site of Object.values(remoteSites)) {
    await site.pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
