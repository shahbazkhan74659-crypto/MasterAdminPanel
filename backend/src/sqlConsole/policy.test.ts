import { describe, it, expect } from "vitest";
import { isProtectedTable, extractWriteTargetTable, isWriteBlockedByPolicy } from "./policy.js";

describe("sqlConsole/policy", () => {
  describe("isProtectedTable", () => {
    it.each([
      ["users"],
      ["USERS"],
      ["credentials"],
      ["sessions"],
      ["password_resets"],
      ["secrets"],
      // Honest substring false-positives — documented behavior, not a bug.
      ["obsession"],
      ["secretary"],
    ])("returns true for %s", (name) => {
      expect(isProtectedTable(name)).toBe(true);
    });

    it.each([["products"], ["orders"], ["widgets"]])("returns false for %s", (name) => {
      expect(isProtectedTable(name)).toBe(false);
    });
  });

  describe("extractWriteTargetTable", () => {
    it.each([
      ["INSERT INTO foo (a) VALUES (1)", "foo"],
      ['INSERT INTO "Foo" VALUES (1)', "Foo"],
      ["INSERT INTO schema.foo VALUES (1)", "foo"],
      ["UPDATE foo SET x = 1", "foo"],
      ["DELETE FROM foo WHERE id = 1", "foo"],
      ["DROP TABLE foo", "foo"],
      ["DROP TABLE IF EXISTS foo", "foo"],
      ["ALTER TABLE foo ADD COLUMN x int", "foo"],
      ["TRUNCATE foo", "foo"],
      ["TRUNCATE TABLE foo", "foo"],
      ["INSERT INTO `foo` VALUES (1)", "foo"],
      ["INSERT INTO [foo] VALUES (1)", "foo"],
    ])("extracts %s -> %s", (sql, expected) => {
      expect(extractWriteTargetTable(sql)).toBe(expected);
    });

    it.each([
      ["CREATE TABLE foo (id int)"],
      ["GRANT SELECT ON foo TO bar"],
    ])("returns null for unrecognized shape: %s", (sql) => {
      expect(extractWriteTargetTable(sql)).toBeNull();
    });
  });

  describe("isWriteBlockedByPolicy", () => {
    it("blocks a write targeting a protected table", () => {
      expect(isWriteBlockedByPolicy("INSERT INTO users VALUES (1)")).toBe(true);
    });

    it("allows a write targeting a non-protected table", () => {
      expect(isWriteBlockedByPolicy("INSERT INTO products VALUES (1)")).toBe(false);
    });

    it("does NOT block a CREATE TABLE naming a protected pattern (known gap, see DECISIONS.md)", () => {
      // extractWriteTargetTable has no pattern for CREATE TABLE, so this can never be
      // detected as a policy-protected write today -- it still requires confirm:true
      // like any other write, it's just not policy-blocked. A future Phase 8 tightening
      // item, not fixed here (Phase 11 is tests-only).
      expect(isWriteBlockedByPolicy("CREATE TABLE credentials (id int)")).toBe(false);
    });
  });
});
