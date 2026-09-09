import { test, expect } from "@playwright/test";
import { E2E_USERNAME, E2E_PASSWORD } from "./testCredentials.js";

test.describe("auth", () => {
  test("full session lifecycle: login, session check, logout", async ({ request }) => {
    await test.step("starts logged out", async () => {
      const res = await request.get("/auth-api/me");
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ authenticated: false });
    });

    await test.step("logs in with valid credentials", async () => {
      const res = await request.post("/auth-api/login", {
        data: { username: E2E_USERNAME, password: E2E_PASSWORD },
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: true, username: E2E_USERNAME });
      const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie");
      expect(cookies.some((c) => c.value.includes("adminpanel.sid"))).toBe(true);
    });

    await test.step("session reflects the logged-in user", async () => {
      const res = await request.get("/auth-api/me");
      expect(await res.json()).toEqual({ authenticated: true, username: E2E_USERNAME });
    });

    await test.step("logs out", async () => {
      const res = await request.post("/auth-api/logout");
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    await test.step("session reflects logged-out state", async () => {
      const res = await request.get("/auth-api/me");
      expect(await res.json()).toEqual({ authenticated: false });
    });
  });

  test("rejects a wrong password without establishing a session", async ({ request }) => {
    const loginRes = await request.post("/auth-api/login", {
      data: { username: E2E_USERNAME, password: "definitely-wrong-password" },
    });
    expect(loginRes.status()).toBe(401);

    const meRes = await request.get("/auth-api/me");
    expect(await meRes.json()).toEqual({ authenticated: false });
  });

  test("rejects an unknown username", async ({ request }) => {
    const res = await request.post("/auth-api/login", {
      data: { username: "no-such-user", password: "whatever" },
    });
    expect(res.status()).toBe(401);
  });
});
