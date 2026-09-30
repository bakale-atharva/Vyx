import { ConvexError, type ObjectType } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { assetInsertFields } from "../schema";
import { ASSET_LIMITS } from "./plans";

export type AssetInsert = ObjectType<typeof assetInsertFields>;

/**
 * Insert an asset and bump the owner's counter in one transaction. The quota is
 * re-checked here so concurrent uploads/edits can't overshoot it.
 */
export async function insertAsset(ctx: MutationCtx, args: AssetInsert) {
  const owner = await ctx.db.get("users", args.ownerId);
  if (!owner) throw new Error("Owner not found");
  if (owner.assetCount >= ASSET_LIMITS[owner.plan]) {
    throw new ConvexError({ code: "QUOTA_ASSETS" });
  }
  const id = await ctx.db.insert("assets", { ...args, createdAt: Date.now() });
  await ctx.db.patch("users", owner._id, { assetCount: owner.assetCount + 1 });
  return id;
}
