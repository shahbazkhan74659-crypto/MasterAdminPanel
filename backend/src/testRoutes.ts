import { Router } from "express";
import { Client } from "pg";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export const testRoutes = Router();

testRoutes.get("/postgres", async (_req, res) => {
  const client = new Client({
    host: process.env.TARGET_PG_HOST,
    port: Number(process.env.TARGET_PG_PORT),
    database: process.env.TARGET_PG_NAME,
    user: process.env.TARGET_PG_USER,
    password: process.env.TARGET_PG_PASSWORD,
  });
  try {
    await client.connect();
    const result = await client.query(
      "SELECT NOW() AS server_time, current_database() AS db"
    );
    res.json({ engine: "postgres", ok: true, result: result.rows[0] });
  } catch (error) {
    res.json({ engine: "postgres", ok: false, error: String(error) });
  } finally {
    await client.end();
  }
});

testRoutes.get("/mysql", async (_req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.TARGET_MYSQL_HOST,
      port: Number(process.env.TARGET_MYSQL_PORT),
      database: process.env.TARGET_MYSQL_NAME,
      user: process.env.TARGET_MYSQL_USER,
      password: process.env.TARGET_MYSQL_PASSWORD,
    });
    const [rows] = await connection.query(
      "SELECT NOW() AS server_time, DATABASE() AS db"
    );
    await connection.end();
    res.json({ engine: "mysql", ok: true, result: (rows as unknown[])[0] });
  } catch (error) {
    res.json({ engine: "mysql", ok: false, error: String(error) });
  }
});

testRoutes.get("/sqlite", (_req, res) => {
  try {
    const sqlitePath = path.resolve(repoRoot, process.env.TARGET_SQLITE_PATH ?? "");
    const db = new Database(sqlitePath, { readonly: true });
    const result = db.prepare("SELECT sqlite_version() AS version").get();
    db.close();
    res.json({ engine: "sqlite", ok: true, result });
  } catch (error) {
    res.json({ engine: "sqlite", ok: false, error: String(error) });
  }
});
