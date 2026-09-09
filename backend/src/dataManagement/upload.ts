import multer from "multer";
import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import type { EngineName } from "../sqlConsole/connections.js";

export const mediaRoot = fileURLToPath(new URL("../../media", import.meta.url));

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);

function buildMediaDir(engine: EngineName, collection: string, field: string): string {
  return path.join(mediaRoot, engine, collection, field);
}

export function servedPathFor(engine: EngineName, collection: string, field: string, filename: string): string {
  return `/media/${engine}/${collection}/${field}/${filename}`;
}

function makeStorage(allowedExtensions: Set<string>) {
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      const { engine, collection, field } = req.params as { engine: EngineName; collection: string; field: string };
      const dir = buildMediaDir(engine, collection, field);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = allowedExtensions.has(ext) ? ext : "";
      cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExt}`);
    },
  });
}

export const imageUpload = multer({
  storage: makeStorage(IMAGE_EXTENSIONS),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

export const videoUpload = multer({
  storage: makeStorage(VIDEO_EXTENSIONS),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith("video/")),
});

/** Runs a multer single-file middleware as a Promise so its errors can be caught with try/catch. */
export function runUpload(uploader: ReturnType<typeof multer>, req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    uploader.single("file")(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
