import { test, expect } from "@playwright/test";
import { postSiteQuery } from "./helpers/api.js";

// Portfolio's real, external, local dev database (Phase 7). Read-only only -- never
// a confirmed write against real data, matching every prior phase's own discipline.
test.describe("remote site (portfolio) - read-only", () => {
  test("lists real tables", async ({ request }) => {
    const res = await request.get("/sql-console-api/sites/portfolio/tables");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.tables)).toBe(true);
    expect(body.tables.length).toBeGreaterThan(0);
  });

  test("runs a real SELECT against a real table", async ({ request }) => {
    const tablesRes = await request.get("/sql-console-api/sites/portfolio/tables");
    const { tables } = await tablesRes.json();
    const [firstTable] = tables;

    const res = await postSiteQuery(request, "portfolio", `SELECT * FROM ${firstTable} LIMIT 1`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test("an unconfirmed write against a real, non-protected table requires confirm:true", async ({ request }) => {
    const tablesRes = await request.get("/sql-console-api/sites/portfolio/tables");
    const { tables } = await tablesRes.json();
    const nonProtected = tables.find((t: string) => !/user|credential|session|password|secret/i.test(t));
    test.skip(!nonProtected, "no non-protected table found to test against");

    const res = await postSiteQuery(request, "portfolio", `DELETE FROM ${nonProtected} WHERE 1=0`);
    expect(res.status()).toBe(409);
  });

  test("a write against auth_user is policy-blocked with no confirm sent", async ({ request }) => {
    // Safe regardless of whether auth_user actually exists on this site -- the
    // policy check runs before any real connection is touched.
    const res = await postSiteQuery(request, "portfolio", "DELETE FROM auth_user WHERE 1=0");
    expect(res.status()).toBe(403);
  });
});
