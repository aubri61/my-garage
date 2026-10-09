import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  globalSetup: "./tests/e2e/environment-setup.ts",
  globalTeardown: "./tests/e2e/environment-teardown.ts",
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  // A separate production server keeps tests away from the user's dev session.
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    env: { BACKEND_URL: "http://127.0.0.1:8083", NEXT_DIST_DIR: ".next-e2e", NEXT_FORCE_WORKER_THREADS: "1" },
    timeout: 120_000,
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
  },
});
