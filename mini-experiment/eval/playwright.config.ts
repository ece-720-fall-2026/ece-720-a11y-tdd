import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: {
    baseURL: process.env.EVAL_BASE_URL ?? "http://localhost:4001",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
