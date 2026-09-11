import { test as base } from "@playwright/test";
import { postQuery, type Engine } from "./helpers/api.js";

interface FixtureTableManager {
  create(engine: Engine, tableName: string, createSql: string): Promise<void>;
}

/**
 * Tracks every fixture table created via `create()` during a test and guarantees
 * DROP TABLE IF EXISTS for each afterward -- runs even if the test body throws,
 * since Playwright fixture teardown (the code after `use()`) always runs.
 */
export const test = base.extend<{ fixtureTable: FixtureTableManager }>({
  fixtureTable: async ({ request }, use) => {
    const created: Array<{ engine: Engine; tableName: string }> = [];

    const manager: FixtureTableManager = {
      async create(engine, tableName, createSql) {
        // Idempotent: self-heals if a prior crashed/interrupted run left this
        // fixture table behind without its own teardown having run.
        await postQuery(request, engine, `DROP TABLE IF EXISTS ${tableName}`, true);
        const res = await postQuery(request, engine, createSql, true);
        if (!res.ok()) {
          throw new Error(`Failed to create fixture table "${tableName}" on ${engine}: ${await res.text()}`);
        }
        created.push({ engine, tableName });
      },
    };

    await use(manager);

    for (const { engine, tableName } of created) {
      await postQuery(request, engine, `DROP TABLE IF EXISTS ${tableName}`, true);
    }
  },
});

export { expect } from "@playwright/test";
