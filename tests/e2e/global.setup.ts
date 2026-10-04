import path from "node:path";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

setup.describe.configure({ mode: "serial" });

// Same path as `storageState` in playwright.config.ts (relative to the repo root).
const authFile = path.resolve("playwright/.clerk/user.json");

setup("configure Clerk testing tokens", async () => {
  await clerkSetup();
});

setup("sign in the Free test user", async ({ page }) => {
  const emailAddress = process.env.E2E_CLERK_USER_EMAIL;
  if (!emailAddress) throw new Error("Set E2E_CLERK_USER_EMAIL to a Free-plan test user");

  await page.goto("/");
  // Server-side sign-in token: no password, no verification codes.
  await clerk.signIn({ page, emailAddress });
  await page.goto("/studio");
  await expect(page.getByRole("button", { name: "Upload image" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
