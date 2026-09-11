import { test, expect } from "./fixtures.js";
import type { Engine } from "./helpers/api.js";
import { AUTH_STATE_PATH } from "./authState.js";

test.use({ storageState: AUTH_STATE_PATH });

const TABLE = "e2e_widgets";

const CREATE_SQL: Record<Engine, string> = {
  postgres: `CREATE TABLE ${TABLE} (id SERIAL PRIMARY KEY, name TEXT NOT NULL, qty INTEGER)`,
  mysql: `CREATE TABLE ${TABLE} (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, qty INTEGER)`,
  sqlite: `CREATE TABLE ${TABLE} (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, qty INTEGER)`,
};

const ENGINES: Engine[] = ["postgres", "mysql", "sqlite"];

test.describe("data management - integrated CRUD flow", () => {
  for (const engine of ENGINES) {
    test(`${engine}: create table, introspect schema, full CRUD`, async ({ request, fixtureTable }) => {
      await fixtureTable.create(engine, TABLE, CREATE_SQL[engine]);

      await test.step("appears in collections", async () => {
        const res = await request.get(`/data-api/${engine}/collections`);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.collections).toContain(TABLE);
      });

      await test.step("schema reports the right PK/required fields", async () => {
        const res = await request.get(`/data-api/${engine}/${TABLE}/schema`);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.primaryKey).toBe("id");
        const name = body.fields.find((f: { name: string }) => f.name === "name");
        const qty = body.fields.find((f: { name: string }) => f.name === "qty");
        expect(name.required).toBe(true);
        expect(qty.required).toBe(false);
      });

      let recordId: string;

      await test.step("creates a record", async () => {
        const res = await request.post(`/data-api/${engine}/${TABLE}/records`, {
          data: { values: { name: "Widget A", qty: 3 } },
        });
        expect(res.status()).toBe(201);
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.record.name).toBe("Widget A");
        recordId = String(body.record.id);
      });

      await test.step("lists records including the new one", async () => {
        const res = await request.get(`/data-api/${engine}/${TABLE}/records`);
        const body = await res.json();
        expect(body.records.some((r: { id: unknown }) => String(r.id) === recordId)).toBe(true);
        // Phase 24b: the explorer needs the schema (primary key, field list) alongside
        // the rows, so the records endpoint now includes it rather than requiring a
        // second GET .../schema round trip.
        expect(body.schema.primaryKey).toBe("id");
        expect(body.schema.fields.some((f: { name: string }) => f.name === "name")).toBe(true);
      });

      await test.step("gets the record by id", async () => {
        const res = await request.get(`/data-api/${engine}/${TABLE}/records/${recordId}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.record.name).toBe("Widget A");
      });

      await test.step("updates the record", async () => {
        const res = await request.patch(`/data-api/${engine}/${TABLE}/records/${recordId}`, {
          data: { values: { qty: 9 } },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Number(body.record.qty)).toBe(9);
      });

      await test.step("404s on a nonexistent record id", async () => {
        const res = await request.get(`/data-api/${engine}/${TABLE}/records/999999`);
        expect(res.status()).toBe(404);
      });

      await test.step("rejects an unknown field", async () => {
        const res = await request.patch(`/data-api/${engine}/${TABLE}/records/${recordId}`, {
          data: { values: { bogus: 1 } },
        });
        expect(res.status()).toBe(400);
      });

      await test.step("rejects a create missing a required field", async () => {
        const res = await request.post(`/data-api/${engine}/${TABLE}/records`, {
          data: { values: { qty: 1 } },
        });
        expect(res.status()).toBe(400);
      });

      await test.step("deletes the record", async () => {
        const res = await request.delete(`/data-api/${engine}/${TABLE}/records/${recordId}`);
        expect(res.status()).toBe(200);
      });

      await test.step("404s after deletion", async () => {
        const res = await request.get(`/data-api/${engine}/${TABLE}/records/${recordId}`);
        expect(res.status()).toBe(404);
      });
    });
  }
});
