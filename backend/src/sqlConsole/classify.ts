const READ_ONLY_LEADING_KEYWORDS = ["SELECT", "SHOW", "EXPLAIN", "DESCRIBE", "DESC", "PRAGMA", "WITH"];
const WRITE_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
];

function stripLeadingCommentsAndWhitespace(sql: string): string {
  let s = sql;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const trimmed = s.replace(/^\s+/, "");
    if (trimmed.startsWith("--")) {
      const newlineIndex = trimmed.indexOf("\n");
      s = newlineIndex === -1 ? "" : trimmed.slice(newlineIndex + 1);
      continue;
    }
    if (trimmed.startsWith("/*")) {
      const endIndex = trimmed.indexOf("*/");
      s = endIndex === -1 ? "" : trimmed.slice(endIndex + 2);
      continue;
    }
    return trimmed;
  }
}

/**
 * Pragmatic, honest-effort classifier — not a full SQL parser. A whole-statement
 * keyword scan for write keywords is used (rather than precise CTE parsing for
 * `WITH`) so it never under-blocks, even though it can rarely over-block (e.g. a
 * CTE literally named "update_log" used only in a SELECT). Full rigor is Phase 8's job.
 */
export function isWriteStatement(sql: string): boolean {
  const body = stripLeadingCommentsAndWhitespace(sql);
  const leadingMatch = body.match(/^([A-Za-z]+)/);
  const leading = leadingMatch?.[1]?.toUpperCase();

  if (leading && !READ_ONLY_LEADING_KEYWORDS.includes(leading)) {
    return true;
  }

  const upper = body.toUpperCase();
  return WRITE_KEYWORDS.some((keyword) => new RegExp(`\\b${keyword}\\b`).test(upper));
}

/**
 * The console runs exactly one statement per request. A naive "does a semicolon
 * appear outside the last position" check is good enough here — it also closes
 * the "SELECT 1; DROP TABLE users;" classifier bypass, since only the first
 * statement's leading keyword would otherwise get classified.
 */
export function hasMultipleStatements(sql: string): boolean {
  const trimmed = sql.trim().replace(/;$/, "");
  return trimmed.includes(";");
}
