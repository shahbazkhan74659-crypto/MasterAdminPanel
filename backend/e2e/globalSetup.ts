import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)) });

async function globalSetup() {
  const { pool } = await import("../src/db/pool.js");
  const { ensureSchema } = await import("../src/db/schema.js");
  const { upsertUser } = await import("../src/scripts/upsertUser.js");
  const { E2E_USERNAME, E2E_PASSWORD } = await import("./testCredentials.js");
  const { AUTH_STATE_PATH } = await import("./authState.js");
  const { request } = await import("@playwright/test");

  await ensureSchema();
  await upsertUser(E2E_USERNAME, E2E_PASSWORD);
  await pool.end();

  // Phase 24a: everything but /auth-api now requires a session. Log in once here
  // and save the cookie as a storageState file that every spec except auth.spec.ts
  // reuses, so the newly-gated routes stay testable without a login step per test.
  await mkdir(fileURLToPath(new URL("./.auth", import.meta.url)), { recursive: true });
  const ctx = await request.newContext({ baseURL: "http://localhost:3001" });
  const loginRes = await ctx.post("/auth-api/login", {
    data: { username: E2E_USERNAME, password: E2E_PASSWORD },
  });
  if (!loginRes.ok()) {
    throw new Error(`e2e globalSetup: login failed with status ${loginRes.status()}`);
  }
  await ctx.storageState({ path: AUTH_STATE_PATH });
  await ctx.dispose();
}

export default globalSetup;
