"use server";

import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { firstLockedFeature } from "@/lib/editor/gate";
import { parseSignedRequest } from "@/lib/editor/recipe";
import { getUrlEndpoint, signUrl } from "@/lib/imagekit/server";

/** Pixel box each size is fitted into (never upscaled, aspect kept). */
const SIZES = { strip: 320, loupe: 1280 } as const;
export type ThumbnailSize = keyof typeof SIZES;

const URL_TTL_SECONDS = 60 * 60;
const MAX_BATCH = 48;
const VIDEO_THUMBNAIL_SUFFIX = "/ik-thumbnail.jpg";

/**
 * Signed thumbnail URLs for the caller's own assets, in one call. Images are
 * fitted into a box; videos use ImageKit's thumbnail frame. Ids the caller
 * does not own are omitted. Each URL is re-validated against the same
 * allowlist and plan gate as every other signed URL.
 */
export async function getThumbnailUrls(
  assetIds: string[],
  size: ThumbnailSize,
): Promise<Record<string, string>> {
  const { userId, has, getToken } = await auth.protect();
  const token = await getToken({ template: "convex" });
  if (!token || !(size in SIZES)) return {};

  const sources = await fetchQuery(
    api.assets.thumbnailSources,
    { assetIds: assetIds.slice(0, MAX_BATCH) },
    { token },
  );

  const box = SIZES[size];
  const urls: Record<string, string> = {};
  for (const source of sources) {
    const url = signUrl({
      src:
        source.filePath +
        (source.kind === "video" ? VIDEO_THUMBNAIL_SUFFIX : ""),
      transformation: [{ width: box, height: box, crop: "at_max" }],
      expiresIn: URL_TTL_SECONDS,
    });
    const check = parseSignedRequest(url, {
      urlEndpoint: getUrlEndpoint(),
      userId,
    });
    if (!check.ok || firstLockedFeature(has, check.features)) continue;
    urls[source.assetId] = url;
  }
  return urls;
}
