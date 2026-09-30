import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const BATCH = 200;

export const deleteAssetsBatch = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const rows = await ctx.db
      .query("assets")
      .withIndex("by_owner_created", (q) => q.eq("ownerId", clerkId))
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

async function deleteImageKitFolder(clerkId: string) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    console.warn("IMAGEKIT_PRIVATE_KEY not set; skipping ImageKit folder purge");
    return;
  }
  const res = await fetch("https://api.imagekit.io/v1/folder", {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${btoa(`${privateKey}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folderPath: `/vyx/users/${clerkId}/` }),
  });
  // 404: folder never existed (user never uploaded); nothing to purge.
  if (!res.ok && res.status !== 404) {
    throw new Error(`ImageKit folder delete failed: ${res.status}`);
  }
}

/** Triggered by user.deleted: ImageKit folder, then Convex rows in batches. */
export const purgeUser = internalAction({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    await deleteImageKitFolder(clerkId);
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
