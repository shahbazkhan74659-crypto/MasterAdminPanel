import type { RequestHandler } from "express";

// Gates every route mounted after this middleware in index.ts. Mounted once,
// after the whole /auth-api router, so /auth-api/login|logout|me stay reachable
// without a session.
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.session.userId) {
    next();
    return;
  }
  res.status(401).json({ ok: false, error: "Authentication required" });
};
