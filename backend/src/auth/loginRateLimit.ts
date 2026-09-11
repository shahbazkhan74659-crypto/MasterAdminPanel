import rateLimit from "express-rate-limit";

// Strict on purpose (owner's choice): 5 attempts / 15 min per IP on POST /login only.
// DISABLE_RATE_LIMIT is read live per-request (not cached at import time) so it works
// whether the dev server was started directly (npm run dev) or spawned/reused by
// Playwright's webServer -- set DISABLE_RATE_LIMIT=true in .env.local for local/e2e
// use only, never in production. See DECISIONS.md.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
  message: { ok: false, error: "Too many login attempts. Try again later." },
});
