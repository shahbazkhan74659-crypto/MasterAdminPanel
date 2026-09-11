import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { pool } from "../db/pool.js";
import { ensureSchema } from "../db/schema.js";
import { initConnections, pgPool, mysqlPool, sqliteDb, remoteSites } from "../sqlConsole/connections.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env.local", import.meta.url)) });

// One-off local dev seed, matching seedDemoPost.ts's precedent (Phase 23): Phase
// 24c's new per-field-type dispatch (relation/richtext/other-JSON/image/video)
// has nothing real to render against otherwise -- the only prior seeded record
// ("posts" id 1) only exercises plain text/select/textarea/boolean fields.
// Table/column names deliberately avoid the substring list ("user"/"credential"/
// "session"/"password"/"secret") Phase 8's protected-table policy blocks.
// Idempotent: safe to re-run.
async function main() {
  await ensureSchema();
  await initConnections();

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS authors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
  await pgPool.query(
    `INSERT INTO authors (id, name) VALUES (1, 'Jane Doe') ON CONFLICT (id) DO NOTHING`
  );
  await pgPool.query(
    `SELECT setval(pg_get_serial_sequence('authors', 'id'), (SELECT MAX(id) FROM authors))`
  );

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS field_types_demo (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body_richtext TEXT,
      author_id_relation INTEGER REFERENCES authors(id),
      cover_image TEXT,
      clip_video TEXT,
      metadata JSONB
    );
  `);

  await pgPool.query(
    `INSERT INTO field_types_demo (id, title, body_richtext, author_id_relation, cover_image, clip_video, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [
      1,
      "Field types demo record",
      "<p>Some <strong>rich text</strong> content.</p>",
      1,
      "/media/postgres/field_types_demo/cover_image/example.jpg",
      null,
      JSON.stringify({ views: 42, tags: ["demo", "phase-24c"] }),
    ]
  );

  await pgPool.query(
    `SELECT setval(pg_get_serial_sequence('field_types_demo', 'id'), (SELECT MAX(id) FROM field_types_demo))`
  );

  console.log('Seeded "authors" and "field_types_demo" demo tables on the postgres target database.');

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
