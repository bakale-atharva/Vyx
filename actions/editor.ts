"use server";

import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { FeatureSlug } from "@/lib/billing/plans";
import { firstLockedFeature } from "@/lib/editor/gate";
import { OPERATIONS_BY_ID } from "@/lib/editor/operations";
import {
  overlayAssetIds,
  parseRecipe,
  parseSignedRequest,
  recipeToTransformations,
  requiredFeatures,
} from "@/lib/editor/recipe";
import { getUrlEndpoint, signUrl } from "@/lib/imagekit/server";

const PREVIEW_TTL_SECONDS = 60 * 60;

export type PreviewResult =
  | { url: string; async: boolean }
  | { error: "LOCKED"; feature: FeatureSlug }
  | { error: "NOT_FOUND" }
  | { error: "INVALID"; message: string };

/**
 * Sign a preview URL for a recipe. Every step is checked against the user's
 * live plan (`has`) before anything is signed, so a locked tool can never be
 * previewed, however the request was crafted.
 */
export async function getPreviewUrl(
  assetId: string,
  recipe: unknown,
): Promise<PreviewResult> {
  const { userId, has, getToken } = await auth.protect();
  const token = await getToken({ template: "convex" });
  if (!token) return { error: "INVALID", message: "Not signed in" };

  const loadAsset = async (id: string) => {
    try {
      return await fetchQuery(
        api.assets.get,
        { assetId: id as Id<"assets"> },
        { token },
      );
    } catch {
      return null; // malformed id
    }
  };

  const asset = await loadAsset(assetId);
  if (!asset) return { error: "NOT_FOUND" };

  const parsed = parseRecipe(asset.kind, recipe);
  if (!parsed.ok) return { error: "INVALID", message: parsed.error };

  const locked = firstLockedFeature(has, requiredFeatures(parsed.steps));
  if (locked) return { error: "LOCKED", feature: locked };

  // Overlay images must be the caller's own image assets.
  const assetPaths: Record<string, string> = {};
  for (const id of overlayAssetIds(parsed.steps)) {
    const overlay = await loadAsset(id);
    if (!overlay || overlay.kind !== "image") {
      return { error: "INVALID", message: "Overlay image not found" };
    }
    assetPaths[id] = overlay.filePath;
  }

  let built;
  try {
    built = recipeToTransformations(parsed.steps, { assetPaths });
  } catch (err) {
    return {
      error: "INVALID",
      message: err instanceof Error ? err.message : "Invalid recipe",
    };
  }

  const url = signUrl({
    src: asset.filePath + (built.pathSuffix ?? ""),
    transformation: built.transformation,
    queryParameters: built.queryParameters,
    expiresIn: PREVIEW_TTL_SECONDS,
  });

  // Defense in depth: re-derive the needed features from the URL itself, so a
  // registry bug can't sign something the plan doesn't cover.
  const check = parseSignedRequest(url, {
    urlEndpoint: getUrlEndpoint(),
    userId,
  });
  if (!check.ok) {
    console.error("Built preview URL failed validation:", check.reason);
    return { error: "INVALID", message: "Could not build a valid preview" };
  }
  const lockedByUrl = firstLockedFeature(has, check.features);
  if (lockedByUrl) return { error: "LOCKED", feature: lockedByUrl };

  const isAsync = parsed.steps.some((s) => OPERATIONS_BY_ID[s.opId]?.async);
  return { url, async: isAsync };
}
