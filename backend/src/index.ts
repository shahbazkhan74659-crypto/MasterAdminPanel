import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { testRoutes } from "./testRoutes.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env.local", import.meta.url)) });

const app = express();
const port = process.env.PORT ?? 3001;

app.use(express.static(path.resolve(fileURLToPath(new URL("../public", import.meta.url)))));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/test-api", testRoutes);

app.listen(port, () => {
  console.log(`AdminPanel backend listening on port ${port}`);
});
