import assert from "node:assert/strict";
import { test } from "node:test";
import { isInUserRoot, validateUpload } from "../../convex/lib/validateUpload";

const MB = 1024 * 1024;
const image = (over: Partial<Parameters<typeof validateUpload>[0]> = {}) => ({
  filePath: "/vyx/users/u1/images/a.jpg",
  mime: "image/jpeg",
  size: 2 * MB,
  ...over,
});
const video = (over: Partial<Parameters<typeof validateUpload>[0]> = {}) => ({
  filePath: "/vyx/users/u1/videos/a.mp4",
  mime: "video/mp4",
  size: 20 * MB,
  duration: 30,
  ...over,
});
const free = { clerkId: "u1", plan: "free" as const, assetCount: 0 };

test("accepts files that fit the plan", () => {
  assert.equal(validateUpload(image(), { ...free, kind: "image" }), null);
  assert.equal(validateUpload(video(), { ...free, kind: "video" }), null);
});

test("wrong folder: another user, the other kind, or a .. segment", () => {
  assert.equal(validateUpload(image({ filePath: "/vyx/users/u2/images/a.jpg" }), { ...free, kind: "image" }), "WRONG_FOLDER");
  assert.equal(validateUpload(image({ filePath: "/vyx/users/u1/videos/a.jpg" }), { ...free, kind: "image" }), "WRONG_FOLDER");
  assert.equal(validateUpload(image({ filePath: "/vyx/users/u1/images/../../u2/images/a.jpg" }), { ...free, kind: "image" }), "WRONG_FOLDER");
});

test("wrong mime for the kind", () => {
  assert.equal(validateUpload(image({ mime: "video/mp4" }), { ...free, kind: "image" }), "WRONG_TYPE");
  assert.equal(validateUpload(image({ mime: "image/svg+xml" }), { ...free, kind: "image" }), "WRONG_TYPE");
});

test("size limits follow the plan", () => {
  assert.equal(validateUpload(image({ size: 11 * MB }), { ...free, kind: "image" }), "TOO_LARGE");
  assert.equal(validateUpload(image({ size: 11 * MB }), { ...free, plan: "pro", kind: "image" }), null);
  assert.equal(validateUpload(video({ size: 60 * MB }), { ...free, kind: "video" }), "TOO_LARGE");
});

test("video length limits, and a missing duration counts as too long", () => {
  assert.equal(validateUpload(video({ duration: 61 }), { ...free, kind: "video" }), "TOO_LONG");
  assert.equal(validateUpload(video({ duration: 61 }), { ...free, plan: "pro", kind: "video" }), null);
  assert.equal(validateUpload(video({ duration: undefined }), { ...free, kind: "video" }), "TOO_LONG");
});

test("asset quota", () => {
  assert.equal(validateUpload(image(), { ...free, assetCount: 25, kind: "image" }), "QUOTA_ASSETS");
  assert.equal(validateUpload(image(), { ...free, assetCount: 24, kind: "image" }), null);
  assert.equal(validateUpload(image(), { ...free, plan: "pro", assetCount: 25, kind: "image" }), null);
});

test("isInUserRoot guards deletes", () => {
  assert.equal(isInUserRoot("/vyx/users/u1/images/a.jpg", "u1"), true);
  assert.equal(isInUserRoot("/vyx/users/u2/images/a.jpg", "u1"), false);
  assert.equal(isInUserRoot("/vyx/users/u1/../u2/a.jpg", "u1"), false);
});
