import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  reporter: "list",
  timeout: 60_000,
  projects: [
    { name: "fixtures", testMatch: "fixtures.spec.ts", use: { ...devices["Desktop Chrome"] } },
    { name: "apg-live", testMatch: "apg-live.spec.ts", use: { ...devices["Desktop Chrome"] } },
    {
      name: "calibration",
      testMatch: "calibration.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: process.env.CALIBRATION_URL ?? "http://localhost:4201" },
    },
  ],
});
