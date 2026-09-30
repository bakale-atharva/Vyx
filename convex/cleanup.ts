import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { userRoot } from "./lib/validateUpload";

const BATCH = 200;

export const deleteAssetsBatch = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) return "done" as const;
    const rows = await ctx.db
      .query("assets")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", user._id))
      .take(BATCH);
    for (const row of rows) await ctx.db.delete("assets", row._id);
    return rows.length === BATCH ? ("more" as const) : ("done" as const);
  },
});

export const deleteUserRow = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (user) await ctx.db.delete("users", user._id);
    return null;
  },
});

/** Triggered by user.deleted: ImageKit folder, then Convex rows in batches. */
export const purgeUser = internalAction({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    await ctx.runAction(internal.imagekit.deleteFolder, {
      folderPath: userRoot(clerkId),
    });
    let state: "more" | "done" = "more";
    while (state === "more") {
      state = await ctx.runMutation(internal.cleanup.deleteAssetsBatch, {
        clerkId,
      });
    }
    await ctx.runMutation(internal.cleanup.deleteUserRow, { clerkId });
    return null;
  },
});
