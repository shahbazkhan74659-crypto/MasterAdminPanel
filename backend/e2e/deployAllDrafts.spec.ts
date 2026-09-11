import { test, expect } from "./fixtures.js";
import { AUTH_STATE_PATH } from "./authState.js";

test.use({ storageState: AUTH_STATE_PATH });

// Backs the new sidebar "Deploy" button (Admin's direct follow-up request):
// deploys every pending draft across every collection for an engine in one
// action, instead of one record at a time. Postgres-only -- multi-engine
// per-draft deploy semantics are already covered by staging.spec.ts.
const TABLE_A = "e2e_deploy_all_a";
const TABLE_B = "e2e_deploy_all_b";
// Phase 8's protected-table policy blocks DROP TABLE on any name containing
// "user" (by design), so this fixture can never be torn down through the
// normal path and would collide with itself on a second run without a
// per-run-unique suffix -- same precedent as staging.spec.ts's PROTECTED_TABLE.
const PROTECTED_TABLE = `e2e_deploy_all_user_prefs_${Date.now()}`;

test.describe("bulk deploy-all drafts", () => {
  test("deploys every pending draft, skips protected tables, reports partial results", async ({ request, fixtureTable }) => {
    await fixtureTable.create("postgres", TABLE_A, `CREATE TABLE ${TABLE_A} (id SERIAL PRIMARY KEY, title TEXT NOT NULL, qty INTEGER)`);
    await fixtureTable.create("postgres", TABLE_B, `CREATE TABLE ${TABLE_B} (id SERIAL PRIMARY KEY, title TEXT NOT NULL, qty INTEGER)`);
    await fixtureTable.create(
      "postgres",
      PROTECTED_TABLE,
      `CREATE TABLE ${PROTECTED_TABLE} (id SERIAL PRIMARY KEY, title TEXT NOT NULL, qty INTEGER)`
    );

    async function seedAndDraft(table: string, qty: number) {
      const res = await request.post(`/data-api/postgres/${table}/records`, { data: { values: { title: "Original", qty: 1 } } });
      expect(res.status()).toBe(201);
      const id = String((await res.json()).record.id);
      const draftRes = await request.post(`/data-api/postgres/${table}/records/${id}/draft`, { data: { values: { qty } } });
      expect(draftRes.status()).toBe(200);
      return id;
    }

    const idA = await seedAndDraft(TABLE_A, 9);
    const idB = await seedAndDraft(TABLE_B, 42);
    const idProtected = await seedAndDraft(PROTECTED_TABLE, 99);

    await test.step("deploy-all without confirm is rejected, nothing deployed", async () => {
      const res = await request.post(`/data-api/postgres/drafts/deploy-all`, { data: {} });
      expect(res.status()).toBe(409);
      const live = await request.get(`/data-api/postgres/${TABLE_A}/records/${idA}`);
      expect(Number((await live.json()).record.qty)).toBe(1);
    });

    await test.step("deploy-all with confirm:true deploys ordinary drafts, skips the protected one", async () => {
      const res = await request.post(`/data-api/postgres/drafts/deploy-all`, { data: { confirm: true } });
      expect(res.status()).toBe(200);
      const body = await res.json();

      const deployedKeys = body.deployed.map((d: { collection: string; recordId: string }) => `${d.collection}:${d.recordId}`);
      expect(deployedKeys).toContain(`${TABLE_A}:${idA}`);
      expect(deployedKeys).toContain(`${TABLE_B}:${idB}`);

      // Not toEqual: listAllDrafts spans every draft for the engine, so a
      // prior run's own leaked protected-table draft (same "can never be
      // torn down" reason PROTECTED_TABLE itself is per-run-unique for) can
      // still be sitting around and would also show up here.
      expect(body.skipped).toContainEqual({ collection: PROTECTED_TABLE, recordId: idProtected, reason: "policy" });
      expect(body.failed).toEqual([]);
    });

    await test.step("ordinary drafts are now live; the protected one's draft is untouched", async () => {
      const liveA = await request.get(`/data-api/postgres/${TABLE_A}/records/${idA}`);
      expect(Number((await liveA.json()).record.qty)).toBe(9);
      const liveB = await request.get(`/data-api/postgres/${TABLE_B}/records/${idB}`);
      expect(Number((await liveB.json()).record.qty)).toBe(42);

      const protectedDraft = await request.get(`/data-api/postgres/${PROTECTED_TABLE}/records/${idProtected}/draft`);
      const protectedBody = await protectedDraft.json();
      expect(protectedBody.hasDraft).toBe(true);
      expect(Number(protectedBody.draft.qty)).toBe(99);
    });

    await test.step("a second run with nothing left pending from this test still succeeds cleanly", async () => {
      const res = await request.post(`/data-api/postgres/drafts/deploy-all`, { data: { confirm: true } });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.deployed).toEqual([]);
      expect(body.skipped).toContainEqual({ collection: PROTECTED_TABLE, recordId: idProtected, reason: "policy" });
      expect(body.failed).toEqual([]);
    });
  });
});
