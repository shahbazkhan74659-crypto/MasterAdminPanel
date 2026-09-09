import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/globalSetup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3001" },
  webServer: {
    command: "npm run build && npm start",
    url: "http://localhost:3001/health",
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
