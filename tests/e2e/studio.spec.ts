import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { gradientPng } from "./fixtures";

const FILE_BASE = "e2e-gradient";

test.beforeEach(async ({ page }) => {
  await setupClerkTestingToken({ page });
});

async function uploadImage(page: Page) {
  await page.goto("/studio");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload image" }).click();
  await (await chooser).setFiles({
    name: `${FILE_BASE}-${Date.now()}.png`,
    mimeType: "image/png",
    buffer: gradientPng(),
  });
  await page.waitForURL(/\/studio\/image\/[^/]+$/, { timeout: 60_000 });
}

const galleryFiles = (page: Page) =>
  page.getByRole("list", { name: "Your files, newest first" }).getByRole("button");

test("upload an image, apply a free tool, save a copy to the gallery", async ({ page }) => {
  await uploadImage(page);
  await page.getByRole("toolbar", { name: "Tool groups" }).getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: "Add Grayscale" }).click();
  await expect(page.getByRole("button", { name: "Save as new" })).toBeEnabled();
  await page.getByRole("button", { name: "Save as new" }).click();

  await expect(page.getByText("Your copy is ready")).toBeVisible({ timeout: 90_000 });

  await page.goto("/studio");
  // Newest first: the saved copy, then the upload it was made from.
  const files = galleryFiles(page);
  await expect(files.nth(0)).toHaveAccessibleName(new RegExp(`${FILE_BASE}-\\d+-edited`), { timeout: 30_000 });
  await expect(files.nth(1)).toHaveAccessibleName(new RegExp(FILE_BASE));
});

test("a locked tool opens the upgrade dialog", async ({ page }) => {
  await uploadImage(page);
  await page.getByRole("toolbar", { name: "Tool groups" }).getByRole("button", { name: "AI", exact: true }).click();
  await page.getByRole("button", { name: /^Remove background, needs pro$/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Remove background needs Pro" })).toBeVisible();
});

test("the server refuses locked transformations from a Free user", async ({ page }) => {
  await page.goto("/studio");
  const userId = await page.evaluate(
    () => (window as unknown as { Clerk?: { user?: { id: string } } }).Clerk?.user?.id,
  );
  expect(userId).toBeTruthy();
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT?.replace(/\/+$/, "");
  expect(endpoint, "NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT").toBeTruthy();

  const sign = (url: string) => page.request.post("/api/imagekit/sign", { data: { url } });

  // Mute (ac-none) is Pro: a hand-edited player URL must not get signed.
  const mute = await sign(`${endpoint}/vyx/users/${userId}/videos/clip.mp4?tr=ac-none`);
  expect(mute.status()).toBe(403);
  expect(await mute.json()).toMatchObject({ code: "LOCKED", feature: "video_mute" });

  const bgRemove = await sign(`${endpoint}/vyx/users/${userId}/images/photo.jpg?tr=e-bgremove`);
  expect(bgRemove.status()).toBe(403);
  expect(await bgRemove.json()).toMatchObject({ code: "LOCKED", feature: "image_bg_remove" });

  // Another user's folder is refused outright.
  const foreign = await sign(`${endpoint}/vyx/users/user_someone_else/images/photo.jpg`);
  expect(foreign.status()).toBe(403);
  expect(await foreign.json()).toMatchObject({ code: "FORBIDDEN" });

  // A free tool on the user's own file is signed.
  const free = await sign(`${endpoint}/vyx/users/${userId}/images/photo.jpg?tr=e-grayscale`);
  expect(free.status()).toBe(200);
});
