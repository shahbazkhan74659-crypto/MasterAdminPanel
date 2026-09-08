import express from "express";

const app = express();
const port = process.env.PORT ?? 3001;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`AdminPanel backend listening on port ${port}`);
});
