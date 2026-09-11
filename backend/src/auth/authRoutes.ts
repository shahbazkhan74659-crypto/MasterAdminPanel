import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { loginSchema } from "./loginSchema.js";
import { loginRateLimit } from "./loginRateLimit.js";

export const authRoutes = Router();

authRoutes.post("/login", loginRateLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const { username, password } = parsed.data;

  const result = await pool.query<{ id: number; username: string; password_hash: string }>(
    "SELECT id, username, password_hash FROM users WHERE username = $1",
    [username]
  );
  const user = result.rows[0];

  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !passwordMatches) {
    res.status(401).json({ ok: false, error: "Invalid username or password" });
    return;
  }

  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ ok: false, error: "Could not start session" });
      return;
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ ok: true, username: user.username });
  });
});

authRoutes.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("adminpanel.sid");
    res.json({ ok: true });
  });
});

authRoutes.get("/me", (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});
