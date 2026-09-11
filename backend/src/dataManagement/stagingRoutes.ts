import { Router } from "express";
import { isProtectedTable } from "../sqlConsole/policy.js";
import { saveDraft, getDraft, getDraftWithLiveDiff, discardDraft, deployDraft, listAllDrafts } from "./staging.js";
import { isValidEngine, assertKnownCollection, handleError } from "./routeHelpers.js";

export const stagingRoutes = Router();

stagingRoutes.post("/:engine/:collection/records/:id/draft", async (req, res) => {
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
    const draft = await saveDraft(engine, collection, id, values);
    res.json({ ok: true, draft });
  } catch (err) {
    handleError(err, res);
  }
});

stagingRoutes.get("/:engine/:collection/records/:id/draft", async (req, res) => {
  const { engine, collection, id } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  try {
    await assertKnownCollection(engine, collection);
    const result = await getDraftWithLiveDiff(engine, collection, id);
    if (!result) {
      res.status(404).json({ ok: false, error: `Record "${id}" not found` });
      return;
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    handleError(err, res);
  }
});

stagingRoutes.delete("/:engine/:collection/records/:id/draft", async (req, res) => {
  const { engine, collection, id } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  try {
    await assertKnownCollection(engine, collection);
    const discarded = await discardDraft(engine, collection, id);
    if (!discarded) {
      res.status(404).json({ ok: false, error: "No draft to discard" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res);
  }
});

// Deploy: gate order mirrors the SQL Console's gatedQuery convention (policy
// checked before the confirm requirement, so a protected-name collection is
// blocked even with confirm:true) -- see sqlConsole/sqlConsoleRoutes.ts.
stagingRoutes.post("/:engine/:collection/records/:id/deploy", async (req, res) => {
  const { engine, collection, id } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  const { confirm } = req.body ?? {};
  try {
    await assertKnownCollection(engine, collection);

    const draft = await getDraft(engine, collection, id);
    if (!draft) {
      res.status(404).json({ ok: false, error: `No pending draft for "${collection}" record "${id}"` });
      return;
    }
    if (isProtectedTable(collection)) {
      res.status(403).json({ ok: false, error: "Writes to this table are blocked by policy" });
      return;
    }
    if (confirm !== true) {
      res.status(409).json({ ok: false, error: "Deploy requires confirm:true" });
      return;
    }

    const { record } = await deployDraft(engine, collection, id);
    res.json({ ok: true, record });
  } catch (err) {
    handleError(err, res);
  }
});

// Bulk deploy: every pending draft across every collection for the engine, in
// one action. One bad/protected draft must not block the rest, so this
// reports partial success (deployed/skipped/failed) rather than aborting on
// the first problem -- the per-record route above stays all-or-nothing since
// it only ever targets one record.
stagingRoutes.post("/:engine/drafts/deploy-all", async (req, res) => {
  const { engine } = req.params;
  if (!isValidEngine(engine)) {
    res.status(400).json({ ok: false, error: `Unknown engine "${engine}"` });
    return;
  }
  const { confirm } = req.body ?? {};
  if (confirm !== true) {
    res.status(409).json({ ok: false, error: "Deploy requires confirm:true" });
    return;
  }
  try {
    const drafts = await listAllDrafts(engine);
    const deployed: { collection: string; recordId: string }[] = [];
    const skipped: { collection: string; recordId: string; reason: string }[] = [];
    const failed: { collection: string; recordId: string; error: string }[] = [];

    for (const draft of drafts) {
      if (isProtectedTable(draft.collection)) {
        skipped.push({ collection: draft.collection, recordId: draft.recordId, reason: "policy" });
        continue;
      }
      try {
        await deployDraft(engine, draft.collection, draft.recordId);
        deployed.push({ collection: draft.collection, recordId: draft.recordId });
      } catch (err) {
        failed.push({ collection: draft.collection, recordId: draft.recordId, error: err instanceof Error ? err.message : String(err) });
      }
    }
    res.json({ ok: true, deployed, skipped, failed });
  } catch (err) {
    handleError(err, res);
  }
});
