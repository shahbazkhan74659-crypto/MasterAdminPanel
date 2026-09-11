import { fileURLToPath } from "node:url";

// Shared storageState path written by globalSetup.ts (a real login against the
// dedicated e2e test account) and consumed by every spec file except auth.spec.ts,
// which deliberately needs a fresh, unauthenticated context.
export const AUTH_STATE_PATH = fileURLToPath(new URL("./.auth/state.json", import.meta.url));
