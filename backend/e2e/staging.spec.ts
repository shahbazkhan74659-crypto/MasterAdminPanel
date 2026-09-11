import { test, expect } from "./fixtures.js";
import type { Engine } from "./helpers/api.js";
import { AUTH_STATE_PATH } from "./authState.js";

test.use({ storageState: AUTH_STATE_PATH });

const TABLE = "e2e_staging_posts";
// Phase 8's protected-table policy blocks DROP TABLE on any name containing "user"
// (by design -- it must, or the policy would be pointless), so this fixture table
// can never be torn down through the normal SQL Console path and is deliberately
// leaked on every run. A per-run-unique suffix keeps that leak from ever colliding
// with a previous run's leftover instead of trying to clean it up.
const PROTECTED_TABLE = `e2e_user_accounts_${Date.now()}`;
const DRIFT_TABLE = "e2e_staging_drift";

const CREATE_SQL: Record<Engine, string> = {
  postgres: `CREATE TABLE ${TABLE} (id SERIAL PRIMARY KEY, title TEXT NOT NULL, qty INTEGER)`,
  mysql: `CREATE TABLE ${TABLE} (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(100) NOT NULL, qty INTEGER)`,
  sqlite: `CREATE TABLE ${TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, qty INTEGER)`,
};

const ENGINES: Engine[] = ["postgres", "mysql", "sqlite"];

test.describe("staging layer - draft/diff/deploy flow", () => {
  for (const engine of ENGINES) {
    test(`${engine}: stage a draft, diff against live, deploy`, async ({ request, fixtureTable }) => {
      await fixtureTable.create(engine, TABLE, CREATE_SQL[engine]);

      let recordId: string;
      await test.step("seed a live record via the ordinary CRUD path", async () => {
        const res = await request.post(`/data-api/${engine}/${TABLE}/records`, {
          data: { values: { title: "Original title", qty: 1 } },
        });
        expect(res.status()).toBe(201);
        const body = await res.json();
        recordId = String(body.record.id);
      });

      await test.step("stages a partial draft (only qty changed)", async () => {
        const res = await request.post(`/data-api/${engine}/${TABLE}/records/${recordId}/draft`, {
          data: { values: { qty: 9 } },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
        // full shadow copy -- untouched fields carry over from live, they aren't dropped
        expect(body.draft.values.title).toBe("Original title");
        expect(Number(body.draft.values.qty)).toBe(9);
      });

      await test.step("live row is unchanged after staging", async () => {
        const res = await request.get(`/data-api/${engine}/${TABLE}/records/${recordId}`);
        const body = await res.json();
        expect(Number(body.record.qty)).toBe(1);
      });

      await test.step("GET draft shows a correct live-vs-draft diff", async () => {
        const res = await request.get(`/data-api/${engine}/${TABLE}/records/${recordId}/draft`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.hasDraft).toBe(true);
        expect(body.diff.qty.changed).toBe(true);
        expect(body.diff.title.changed).toBe(false);
      });

      await test.step("deploy without confirm is rejected", async () => {
        const res = await request.post(`/data-api/${engine}/${TABLE}/records/${recordId}/deploy`, { data: {} });
        expect(res.status()).toBe(409);
      });

      await test.step("deploy with confirm:true applies the draft to live", async () => {
        const res = await request.post(`/data-api/${engine}/${TABLE}/records/${recordId}/deploy`, {
          data: { confirm: true },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Number(body.record.qty)).toBe(9);

        const live = await request.get(`/data-api/${engine}/${TABLE}/records/${recordId}`);
        expect(Number((await live.json()).record.qty)).toBe(9);
      });

      await test.step("draft is consumed after deploy", async () => {
        const res = await request.get(`/data-api/${engine}/${TABLE}/records/${recordId}/draft`);
        const body = await res.json();
        expect(body.hasDraft).toBe(false);
      });

      await test.step("deploying again with no pending draft 404s", async () => {
        const res = await request.post(`/data-api/${engine}/${TABLE}/records/${recordId}/deploy`, {
          data: { confirm: true },
        });
        expect(res.status()).toBe(404);
      });

      await test.step("discard: stage a new draft, discard it, live untouched", async () => {
        const stage = await request.post(`/data-api/${engine}/${TABLE}/records/${recordId}/draft`, {
          data: { values: { qty: 42 } },
        });
        expect(stage.status()).toBe(200);

        const discard = await request.delete(`/data-api/${engine}/${TABLE}/records/${recordId}/draft`);
        expect(discard.status()).toBe(200);

        const discardAgain = await request.delete(`/data-api/${engine}/${TABLE}/records/${recordId}/draft`);
        expect(discardAgain.status()).toBe(404);

        const live = await request.get(`/data-api/${engine}/${TABLE}/records/${recordId}`);
        expect(Number((await live.json()).record.qty)).toBe(9); // unchanged since the earlier deploy
      });
    });
  }

  test("postgres: deploy is blocked by the protected-table policy, staging itself is not", async ({
    request,
    fixtureTable,
  }) => {
    await fixtureTable.create("postgres", PROTECTED_TABLE, `CREATE TABLE ${PROTECTED_TABLE} (id SERIAL PRIMARY KEY, title TEXT NOT NULL)`);

    const create = await request.post(`/data-api/postgres/${PROTECTED_TABLE}/records`, {
      data: { values: { title: "sensitive" } },
    });
    const recordId = String((await create.json()).record.id);

    const stage = await request.post(`/data-api/postgres/${PROTECTED_TABLE}/records/${recordId}/draft`, {
      data: { values: { title: "changed" } },
    });
    expect(stage.status()).toBe(200); // staging itself isn't blocked -- only the live write is

    const deploy = await request.post(`/data-api/postgres/${PROTECTED_TABLE}/records/${recordId}/deploy`, {
      data: { confirm: true },
    });
    expect(deploy.status()).toBe(403);

    const live = await request.get(`/data-api/postgres/${PROTECTED_TABLE}/records/${recordId}`);
    expect((await live.json()).record.title).toBe("sensitive"); // still untouched

    await request.delete(`/data-api/postgres/${PROTECTED_TABLE}/records/${recordId}/draft`); // tidy up
  });

  test("postgres: schema drift between staging and deploy surfaces as a 400, not a crash", async ({
    request,
    fixtureTable,
  }) => {
    await fixtureTable.create(
      "postgres",
      DRIFT_TABLE,
      `CREATE TABLE ${DRIFT_TABLE} (id SERIAL PRIMARY KEY, title TEXT NOT NULL, extra TEXT)`
    );

    const create = await request.post(`/data-api/postgres/${DRIFT_TABLE}/records`, {
      data: { values: { title: "before drift", extra: "x" } },
    });
    const recordId = String((await create.json()).record.id);

    const stage = await request.post(`/data-api/postgres/${DRIFT_TABLE}/records/${recordId}/draft`, {
      data: { values: { title: "after drift" } },
    });
    expect(stage.status()).toBe(200);

    // Drop a column the draft's shadow copy still holds a value for.
    const alter = await request.post(`/sql-console-api/postgres/query`, {
      data: { sql: `ALTER TABLE ${DRIFT_TABLE} DROP COLUMN extra`, confirm: true },
    });
    expect(alter.ok()).toBe(true);

    const deploy = await request.post(`/data-api/postgres/${DRIFT_TABLE}/records/${recordId}/deploy`, {
      data: { confirm: true },
    });
    expect(deploy.status()).toBe(400);

    await request.delete(`/data-api/postgres/${DRIFT_TABLE}/records/${recordId}/draft`); // tidy up
  });
});
