import { ConvexError } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { type Plan } from "./plans";
import {
  PLAN_BASED_VIOLATIONS,
  isInUserRoot,
  validateUpload,
  type AssetKind,
} from "./validateUpload";

/**
 * Re-read a file that now lives in ImageKit and validate it for this user
 * (folder, type, size, duration, quota). On a violation the file is deleted
 * (only if it is inside the user's own tree) and a ConvexError is thrown.
 * Shared by `assets.register` (client uploads) and edit processing.
 */
export async function validateStoredFile(
  ctx: ActionCtx,
  opts: { user: Doc<"users">; clerkId: string; fileId: string; kind: AssetKind },
) {
  const { user, clerkId, fileId, kind } = opts;

  const file = await ctx.runAction(internal.imagekit.getFileDetails, { fileId });
  if (!file) throw new ConvexError({ code: "FILE_NOT_FOUND" });

  const check = (plan: Plan) =>
    validateUpload(file, { clerkId, kind, plan, assetCount: user.assetCount });

  let violation = check(user.plan);
  if (violation && PLAN_BASED_VIOLATIONS.has(violation)) {
    // The stored plan comes from a webhook and may lag behind an upgrade.
    try {
      const livePlan = await ctx.runAction(
        internal.billing.refreshPlanFromClerk,
        { clerkId },
      );
      violation = check(livePlan);
    } catch (err) {
      console.error("Live plan refresh failed:", err);
    }
  }

  if (violation) {
    await deleteIfOwned(ctx, file.filePath, clerkId, fileId);
    throw new ConvexError({ code: violation });
  }
  return { file, deleteIfOwned: () => deleteIfOwned(ctx, file.filePath, clerkId, fileId) };
}

/** Only delete files inside the caller's own tree; never a foreign fileId. */
async function deleteIfOwned(
  ctx: ActionCtx,
  filePath: string,
  clerkId: string,
  fileId: string,
) {
  if (isInUserRoot(filePath, clerkId)) {
    await ctx.runAction(internal.imagekit.deleteFile, { fileId });
  }
}
