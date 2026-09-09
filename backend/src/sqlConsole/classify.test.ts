import { describe, it, expect } from "vitest";
import { isWriteStatement, hasMultipleStatements } from "./classify.js";

describe("sqlConsole/classify", () => {
  describe("isWriteStatement", () => {
    it.each([
      ["SELECT * FROM foo"],
      ["select * from foo"],
      ["  \n  SELECT 1"],
      ["-- a comment\nSELECT 1"],
      ["/* a comment */ SELECT 1"],
      ["WITH cte AS (SELECT 1) SELECT * FROM cte"],
      ["EXPLAIN SELECT * FROM foo"],
      ["PRAGMA table_info(foo)"],
      ["SHOW TABLES"],
      ["DESCRIBE foo"],
    ])("returns false for %s", (sql) => {
      expect(isWriteStatement(sql)).toBe(false);
    });

    it.each([
      ["INSERT INTO foo VALUES (1)"],
      ["UPDATE foo SET x = 1"],
      ["DELETE FROM foo"],
      ["DROP TABLE foo"],
      ["ALTER TABLE foo ADD COLUMN x int"],
      ["TRUNCATE foo"],
      ["CREATE TABLE foo (id int)"],
      ["WITH cte AS (SELECT 1) INSERT INTO foo SELECT * FROM cte"],
      ["FOO BAR"],
    ])("returns true for %s", (sql) => {
      expect(isWriteStatement(sql)).toBe(true);
    });
  });

  describe("hasMultipleStatements", () => {
    it.each([["SELECT 1"], ["SELECT 1;"], ["SELECT 1;   "]])("returns false for %s", (sql) => {
      expect(hasMultipleStatements(sql)).toBe(false);
    });

    it.each([
      ["SELECT 1; SELECT 2"],
      ["SELECT 1; SELECT 2;"],
      ["SELECT 1; DROP TABLE users;"],
    ])("returns true for %s", (sql) => {
      expect(hasMultipleStatements(sql)).toBe(true);
    });
  });
});
