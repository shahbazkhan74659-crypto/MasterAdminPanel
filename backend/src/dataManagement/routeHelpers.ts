import type { Response } from "express";
import { listCollections } from "./introspection.js";
import { NoPrimaryKeyError, RecordNotFoundError } from "./crud.js";
import { ValidationError } from "./validation.js";
import { NoDraftError } from "./staging.js";

export const ALLOWED_ENGINES = ["postgres", "mysql", "sqlite"] as const;
export type Engine = (typeof ALLOWED_ENGINES)[number];

export function isValidEngine(engine: string): engine is Engine {
  return (ALLOWED_ENGINES as readonly string[]).includes(engine);
}

export async function assertKnownCollection(engine: Engine, collection: string): Promise<void> {
  const collections = await listCollections(engine);
  if (!collections.includes(collection)) {
    throw new ValidationError(`Unknown collection "${collection}"`);
  }
}

export function handleError(err: unknown, res: Response): void {
  if (err instanceof ValidationError || err instanceof NoPrimaryKeyError) {
    res.status(400).json({ ok: false, error: err.message });
    return;
  }
  if (err instanceof NoDraftError || err instanceof RecordNotFoundError) {
    res.status(404).json({ ok: false, error: err.message });
    return;
  }
  res.status(500).json({ ok: false, error: String(err) });
}
