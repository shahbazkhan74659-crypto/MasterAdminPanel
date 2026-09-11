import { test, expect } from "@playwright/test";
import { postQuery } from "./helpers/api.js";
import { AUTH_STATE_PATH } from "./authState.js";

test.use({ storageState: AUTH_STATE_PATH });

// gatedQuery is one shared function reused identically by every local engine and by
// the remote-site routes -- proving it once against postgres is sufficient here.
test.describe("write-safety and policy gates (postgres)", () => {
  test("an unconfirmed, non-protected write requires confirm:true", async ({ request }) => {
    const res = await postQuery(request, "postgres", "INSERT INTO e2e_policy_scratch (a) VALUES (1)");
    expect(res.status()).toBe(409);
  });

  test("a protected-table write is blocked with no confirm sent at all", async ({ request }) => {
    const res = await postQuery(request, "postgres", "DELETE FROM credentials WHERE 1=0");
    expect(res.status()).toBe(403);
  });

  test("a protected-table write is still blocked even with confirm:true", async ({ request }) => {
    const res = await postQuery(request, "postgres", "DELETE FROM credentials WHERE 1=0", true);
    expect(res.status()).toBe(403);
  });

  test("multiple statements in one request are rejected", async ({ request }) => {
    const res = await postQuery(request, "postgres", "SELECT 1; SELECT 2;");
    expect(res.status()).toBe(400);
  });

  test("a plain SELECT succeeds without confirm", async ({ request }) => {
    const res = await postQuery(request, "postgres", "SELECT 1 AS n");
    expect(res.status()).toBe(200);
  });
});
