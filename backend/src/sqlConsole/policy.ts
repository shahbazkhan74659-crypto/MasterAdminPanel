// Phase 8 — SQL Console access/modification policy. Static, code-level config for now
// (same pattern as connections.ts's registry): change it, restart the server. Applies
// uniformly across every connection today (local Phase 1b engines and Phase 7 remote
// sites alike) — structured per-table so a specific connection could override these
// rules later, though nothing does yet.

const PROTECTED_TABLE_PATTERNS = ["user", "credential", "session", "password", "secret"];

export function isProtectedTable(tableName: string): boolean {
  const lower = tableName.toLowerCase();
  return PROTECTED_TABLE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function stripQuoting(identifier: string): string {
  return identifier.replace(/^[`"[]|[`"\]]$/g, "");
}

const WRITE_TARGET_PATTERNS: RegExp[] = [
  /\bINSERT\s+INTO\s+([`"[]?[\w.]+[`"\]]?)/i,
  /\bUPDATE\s+([`"[]?[\w.]+[`"\]]?)/i,
  /\bDELETE\s+FROM\s+([`"[]?[\w.]+[`"\]]?)/i,
  /\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([`"[]?[\w.]+[`"\]]?)/i,
  /\bALTER\s+TABLE\s+([`"[]?[\w.]+[`"\]]?)/i,
  /\bTRUNCATE\s+(?:TABLE\s+)?([`"[]?[\w.]+[`"\]]?)/i,
];

/**
 * Pragmatic, honest-effort extraction — not a full SQL parser, same philosophy as
 * classify.ts. Recognizes the table a write statement targets for the handful of
 * write forms the console needs to gate. Returns null when no pattern matches (e.g.
 * a CREATE TABLE, a GRANT/REVOKE, or any statement shaped in a way this doesn't
 * recognize) — an unrecognized target is only ever "can't tell," never "protected."
 */
export function extractWriteTargetTable(sql: string): string | null {
  for (const pattern of WRITE_TARGET_PATTERNS) {
    const match = sql.match(pattern);
    if (match?.[1]) {
      const raw = stripQuoting(match[1]);
      const lastSegment = raw.split(".").pop() ?? raw;
      return lastSegment;
    }
  }
  return null;
}

export function isWriteBlockedByPolicy(sql: string): boolean {
  const table = extractWriteTargetTable(sql);
  return table !== null && isProtectedTable(table);
}
