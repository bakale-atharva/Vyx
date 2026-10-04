import { defineConfig, devices } from "@playwright/test";

// Clerk and ImageKit keys live in .env.local (never committed).
try {
  process.loadEnvFile(".env.local");
} catch {
  // CI provides the variables directly.
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * E2E suite (`pnpm test:e2e`). Runs against a dev server with the Convex
 * backend running. The test user (E2E_CLERK_USER_EMAIL) must be on the Free
 * plan: the lock tests rely on it.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 120_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "studio",
      testMatch: /.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.clerk/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm run frontend",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
