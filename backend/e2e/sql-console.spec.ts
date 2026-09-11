import { test, expect } from "@playwright/test";
import { postQuery, type Engine } from "./helpers/api.js";
import { AUTH_STATE_PATH } from "./authState.js";

test.use({ storageState: AUTH_STATE_PATH });

const ENGINES: Engine[] = ["postgres", "mysql", "sqlite"];

test.describe("sql console - basic per-engine sanity", () => {
  for (const engine of ENGINES) {
    test(`${engine}: lists tables`, async ({ request }) => {
      const res = await request.get(`/sql-console-api/${engine}/tables`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.tables)).toBe(true);
    });

    test(`${engine}: runs a basic SELECT`, async ({ request }) => {
      const res = await postQuery(request, engine, "SELECT 1 AS n");
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(Number(body.rows[0].n)).toBe(1);
    });
  }
});
