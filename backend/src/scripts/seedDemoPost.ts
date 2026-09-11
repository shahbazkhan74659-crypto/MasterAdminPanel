import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { pool } from "../db/pool.js";
import { ensureSchema } from "../db/schema.js";
import { initConnections, pgPool, mysqlPool, sqliteDb, remoteSites } from "../sqlConsole/connections.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env.local", import.meta.url)) });

// One-off local dev seed, matching seedOwner.ts's precedent: Phase 23's frontend
// wiring needs a real "posts" row to fetch/stage/deploy against. Seeds into the
// postgres Phase 1b target database specifically (an arbitrary-but-reasonable
// choice among the three engines) with exactly the values already hardcoded in
// AppShell.tsx's static markup, so the wired UI shows the same demo record every
// prior static phase already used. Idempotent: safe to re-run.
const DEMO_POST = {
  id: 1,
  title: "Launching Our New Storefront",
  slug: "launching-our-new-storefront",
  status: "published",
  excerpt: "A quick look at what changed in the redesign.",
  tags: "product,launch",
  featured: true,
};

async function main() {
  await ensureSchema();
  await initConnections();

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      status TEXT NOT NULL,
      excerpt TEXT,
      tags TEXT,
      featured BOOLEAN NOT NULL DEFAULT false
    );
  `);

  await pgPool.query(
    `INSERT INTO posts (id, title, slug, status, excerpt, tags, featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [DEMO_POST.id, DEMO_POST.title, DEMO_POST.slug, DEMO_POST.status, DEMO_POST.excerpt, DEMO_POST.tags, DEMO_POST.featured]
  );

  // Keep the SERIAL sequence ahead of the manually-specified id=1 so a future
  // real POST /data-api/postgres/posts/records doesn't collide with it.
  await pgPool.query(`SELECT setval(pg_get_serial_sequence('posts', 'id'), (SELECT MAX(id) FROM posts))`);

  console.log(`Seeded demo "posts" table with record id=${DEMO_POST.id} on the postgres target database.`);

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
