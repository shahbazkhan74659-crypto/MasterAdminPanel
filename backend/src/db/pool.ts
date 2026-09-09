import { Pool } from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Load env here too, not just in index.ts: ES module imports are hoisted and
// evaluate before any non-import statement in the importing file, so relying
// on index.ts's dotenv.config() call alone would construct this Pool before
// .env.local is loaded (safe to call twice — dotenv won't override already-set vars).
dotenv.config({ path: fileURLToPath(new URL("../../../.env.local", import.meta.url)) });

export const pool = new Pool(
  process.env.ADMINPANEL_DB_URL
    ? { connectionString: process.env.ADMINPANEL_DB_URL }
    : {
        host: process.env.ADMINPANEL_DB_HOST,
        port: Number(process.env.ADMINPANEL_DB_PORT),
        database: process.env.ADMINPANEL_DB_NAME,
        user: process.env.ADMINPANEL_DB_USER,
        password: process.env.ADMINPANEL_DB_PASSWORD,
      }
);
