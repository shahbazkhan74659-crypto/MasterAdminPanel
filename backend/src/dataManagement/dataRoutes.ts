import { Router } from "express";
import multer from "multer";
import { listCollections, getTableSchema } from "./introspection.js";
import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  NoPrimaryKeyError,
} from "./crud.js";
import { ValidationError } from "./validation.js";
import { imageUpload, videoUpload, runUpload, servedPathFor } from "./upload.js";

const ALLOWED_ENGINES = ["postgres", "mysql", "sqlite"] as const;
type Engine = (typeof ALLOWED_ENGINES)[number];

function isValidEngine(engine: string): engine is Engine {
  return (ALLOWED_ENGINES as readonly string[]).includes(engine);
}

async function assertKnownCollection(engine: Engine, collection: string): Promise<void> {
  const collections = await listCollections(engine);
  if (!collections.includes(collection)) {
    throw new ValidationError(`Unknown collection "${collection}"`);
  }
}

function handleError(err: unknown, res: import("express").Response): void {
  if (err instanceof ValidationError || err instanceof NoPrimaryKeyError) {
    res.status(400).json({ ok: false, error: err.message });
    return;
  }
  res.status(500).json({ ok: false, error: String(err) });
}

export const dataRoutes = Router();

dataRoutes.get("/:engine/collections", async (req, res) => {
  const { engine } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  try {
    const collections = await listCollections(engine);
    res.json({ ok: true, collections });
  } catch (err) {
    handleError(err, res);
  }
});

dataRoutes.get("/:engine/:collection/schema", async (req, res) => {
  const { engine, collection } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  try {
    await assertKnownCollection(engine, collection);
    const schema = await getTableSchema(engine, collection);
    res.json({ ok: true, ...schema });
  } catch (err) {
    handleError(err, res);
  }
});

dataRoutes.get("/:engine/:collection/records", async (req, res) => {
  const { engine, collection } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  const limit = Math.min(Number(req.query.limit) || 100, 1000);
  const offset = Number(req.query.offset) || 0;
  try {
    await assertKnownCollection(engine, collection);
    const { rows } = await listRecords(engine, collection, limit, offset);
    res.json({ ok: true, records: rows, rowCount: rows.length, limit, offset });
  } catch (err) {
    handleError(err, res);
  }
});

dataRoutes.get("/:engine/:collection/records/:id", async (req, res) => {
  const { engine, collection, id } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  try {
    await assertKnownCollection(engine, collection);
    const record = await getRecord(engine, collection, id);
    if (!record) {
      res.status(404).json({ ok: false, error: `Record "${id}" not found` });
      return;
    }
    res.json({ ok: true, record });
  } catch (err) {
    handleError(err, res);
  }
});

dataRoutes.post("/:engine/:collection/records", async (req, res) => {
  const { engine, collection } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  const { values } = req.body ?? {};
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    res.status(400).json({ ok: false, error: "values (object) is required" });
    return;
  }
  try {
    await assertKnownCollection(engine, collection);
    const record = await createRecord(engine, collection, values);
    res.status(201).json({ ok: true, record });
  } catch (err) {
    handleError(err, res);
  }
});

dataRoutes.patch("/:engine/:collection/records/:id", async (req, res) => {
  const { engine, collection, id } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  const { values } = req.body ?? {};
  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    res.status(400).json({ ok: false, error: "values (object) is required" });
    return;
  }
  try {
    await assertKnownCollection(engine, collection);
    const record = await updateRecord(engine, collection, id, values);
    if (!record) {
      res.status(404).json({ ok: false, error: `Record "${id}" not found` });
      return;
    }
    res.json({ ok: true, record });
  } catch (err) {
    handleError(err, res);
  }
});

dataRoutes.delete("/:engine/:collection/records/:id", async (req, res) => {
  const { engine, collection, id } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  try {
    await assertKnownCollection(engine, collection);
    const deleted = await deleteRecord(engine, collection, id);
    if (!deleted) {
      res.status(404).json({ ok: false, error: `Record "${id}" not found` });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res);
  }
});

dataRoutes.post("/:engine/:collection/records/:id/upload/:field", async (req, res) => {
  const { engine, collection, id, field } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }

  try {
    await assertKnownCollection(engine, collection);
    const schema = await getTableSchema(engine, collection);
    const fieldSchema = schema.fields.find((f) => f.name === field);
    if (!fieldSchema || (fieldSchema.specialType !== "image" && fieldSchema.specialType !== "video")) {
      res.status(400).json({ ok: false, error: `Field "${field}" is not an image/video field` });
      return;
    }

    const existing = await getRecord(engine, collection, id);
    if (!existing) {
      res.status(404).json({ ok: false, error: `Record "${id}" not found` });
      return;
    }

    const uploader = fieldSchema.specialType === "image" ? imageUpload : videoUpload;
    try {
      await runUpload(uploader, req, res);
    } catch (uploadErr) {
      if (uploadErr instanceof multer.MulterError) {
        res.status(400).json({ ok: false, error: uploadErr.message });
        return;
      }
      throw uploadErr;
    }

    if (!req.file) {
      res.status(400).json({ ok: false, error: "Uploaded file does not match the field's expected type" });
      return;
    }

    const servedPath = servedPathFor(engine, collection, field, req.file.filename);
    const record = await updateRecord(engine, collection, id, { [field]: servedPath });
    res.status(201).json({ ok: true, field, path: servedPath, record });
  } catch (err) {
    handleError(err, res);
  }
});
