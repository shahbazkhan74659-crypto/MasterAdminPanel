import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRoutes } from "./auth/authRoutes.js";
import { sqlConsoleRoutes } from "./sqlConsole/sqlConsoleRoutes.js";
import { dataRoutes } from "./dataManagement/dataRoutes.js";
import { stagingRoutes } from "./dataManagement/stagingRoutes.js";
import { pool } from "./db/pool.js";
import { ensureSchema } from "./db/schema.js";
import { initConnections } from "./sqlConsole/connections.js";
import { requireAuth } from "./auth/requireAuth.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)) });

const PgSession = connectPgSimple(session);
const app = express();
const port = process.env.PORT ?? 3001;

app.use(express.json());

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true, tableName: "session" }),
    name: "adminpanel.sid",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // Local HTTP dev only. Phase 29 (Render/HTTPS deploy) must flip this to
      // true and add app.set("trust proxy", 1), since Render terminates TLS
      // in front of the app.
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Public: login/logout/me must stay reachable without a session.
app.use("/auth-api", authRoutes);

// Everything mounted from here on requires a real session (Phase 24a).
app.use(requireAuth);

app.use("/media", express.static(path.resolve(fileURLToPath(new URL("../media", import.meta.url)))));
app.use("/sql-console-api", sqlConsoleRoutes);
app.use("/data-api", dataRoutes);
app.use("/data-api", stagingRoutes);

async function bootstrap() {
  await ensureSchema();
  await initConnections();
  app.listen(port, () => {
    console.log(`AdminPanel backend listening on port ${port}`);
  });
}

bootstrap();
