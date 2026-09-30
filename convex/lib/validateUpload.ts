import {
  ALLOWED_MIME,
  ASSET_LIMITS,
  UPLOAD_LIMITS,
  type Plan,
} from "./plans";

export type AssetKind = "image" | "video";

export type UploadViolation =
  | "WRONG_FOLDER"
  | "WRONG_TYPE"
  | "TOO_LARGE"
  | "TOO_LONG"
  | "QUOTA_ASSETS";

/** Violations that depend on the plan, so a stale stored plan may cause them. */
export const PLAN_BASED_VIOLATIONS: ReadonlySet<UploadViolation> = new Set([
  "TOO_LARGE",
  "TOO_LONG",
  "QUOTA_ASSETS",
]);

export type UploadedFile = {
  filePath: string;
  mime: string;
  size: number;
  duration?: number;
};

export function userRoot(clerkId: string) {
  return `/vyx/users/${clerkId}/`;
}

export function userFolder(clerkId: string, kind: AssetKind) {
  return `${userRoot(clerkId)}${kind}s/`;
}

/** True when the path is inside the user's own tree (safe to delete on their behalf). */
export function isInUserRoot(filePath: string, clerkId: string) {
  return (
    filePath.startsWith(userRoot(clerkId)) &&
    !filePath.split("/").includes("..")
  );
}

export function validateUpload(
  file: UploadedFile,
  opts: { clerkId: string; kind: AssetKind; plan: Plan; assetCount: number },
): UploadViolation | null {
  const { clerkId, kind, plan, assetCount } = opts;
  const folder = userFolder(clerkId, kind);

  if (!file.filePath.startsWith(folder) || file.filePath.split("/").includes("..")) {
    return "WRONG_FOLDER";
  }
  if (!(ALLOWED_MIME[kind] as readonly string[]).includes(file.mime)) {
    return "WRONG_TYPE";
  }

  const limits = UPLOAD_LIMITS[plan];
  const maxBytes = kind === "image" ? limits.imageBytes : limits.videoBytes;
  if (file.size > maxBytes) return "TOO_LARGE";
  if (kind === "video") {
    // Missing duration is treated as too long: we can't prove it fits.
    if (file.duration === undefined || file.duration > limits.videoSeconds) {
      return "TOO_LONG";
    }
  }
  if (assetCount >= ASSET_LIMITS[plan]) return "QUOTA_ASSETS";
  return null;
}
