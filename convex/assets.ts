import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { ASSET_LIMITS } from "./lib/plans";
import {
  PLAN_BASED_VIOLATIONS,
  isInUserRoot,
  validateUpload,
} from "./lib/validateUpload";
import { assetKindValidator } from "./schema";
import { getCurrentUser } from "./users";

const EMPTY_PAGE = { page: [], isDone: true, continueCursor: "" };

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    kind: v.optional(assetKindValidator),
  },
  handler: async (ctx, { paginationOpts, kind }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return EMPTY_PAGE;
    const assets = ctx.db.query("assets");
    const q = kind
      ? assets.withIndex("by_owner_kind_created", (i) =>
          i.eq("ownerId", user._id).eq("kind", kind),
        )
      : assets.withIndex("by_owner_created", (i) => i.eq("ownerId", user._id));
    return await q.order("desc").paginate(paginationOpts);
  },
});

export const get = query({
  args: { assetId: v.id("assets") },
  handler: async (ctx, { assetId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const asset = await ctx.db.get("assets", assetId);
    return asset && asset.ownerId === user._id ? asset : null;
  },
});

export const getByFileId = internalQuery({
  args: { fileId: v.string() },
  handler: async (ctx, { fileId }) =>
    await ctx.db
      .query("assets")
      .withIndex("by_file_id", (q) => q.eq("fileId", fileId))
      .first(),
});

export const insert = internalMutation({
  args: {
    ownerId: v.id("users"),
    kind: assetKindValidator,
    fileId: v.string(),
    filePath: v.string(),
    name: v.string(),
    mime: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
    parentAssetId: v.optional(v.id("assets")),
    recipe: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const owner = await ctx.db.get("users", args.ownerId);
    if (!owner) throw new Error("Owner not found");
    // Re-checked inside the transaction so concurrent uploads can't overshoot.
    if (owner.assetCount >= ASSET_LIMITS[owner.plan]) {
      throw new ConvexError({ code: "QUOTA_ASSETS" });
    }
    const id = await ctx.db.insert("assets", { ...args, createdAt: Date.now() });
    await ctx.db.patch("users", owner._id, { assetCount: owner.assetCount + 1 });
    return id;
  },
});

export const remove = internalMutation({
  args: { assetId: v.id("assets") },
  handler: async (ctx, { assetId }) => {
    const asset = await ctx.db.get("assets", assetId);
    if (!asset) return null;
    await ctx.db.delete("assets", assetId);
    const owner = await ctx.db.get("users", asset.ownerId);
    if (owner) {
      await ctx.db.patch("users", owner._id, {
        assetCount: Math.max(0, owner.assetCount - 1),
      });
    }
    return null;
  },
});

/**
 * Authoritative check after a client-side ImageKit upload. The upload params
 * (folder, checks) are client-supplied, so we re-read the file from ImageKit
 * and validate it before it becomes an asset.
 */
export const register = action({
  args: { fileId: v.string(), kind: assetKindValidator },
  handler: async (ctx, { fileId, kind }): Promise<Id<"assets">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const clerkId = identity.subject;

    const user = await ctx.runQuery(internal.users.getByClerkId, { clerkId });
    if (!user) throw new ConvexError({ code: "NO_USER" });

    // Retry-safe: a file that is already registered is not counted twice.
    const existing = await ctx.runQuery(internal.assets.getByFileId, { fileId });
    if (existing) {
      if (existing.ownerId !== user._id) {
        throw new ConvexError({ code: "WRONG_FOLDER" });
      }
      return existing._id;
    }

    const file = await ctx.runAction(internal.imagekit.getFileDetails, { fileId });
    if (!file) throw new ConvexError({ code: "FILE_NOT_FOUND" });

    const check = (plan: typeof user.plan) =>
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

    // Only delete files inside the caller's own tree; never a foreign fileId.
    const deleteIfOwned = async () => {
      if (isInUserRoot(file.filePath, clerkId)) {
        await ctx.runAction(internal.imagekit.deleteFile, { fileId });
      }
    };

    if (violation) {
      await deleteIfOwned();
      throw new ConvexError({ code: violation });
    }

    try {
      return await ctx.runMutation(internal.assets.insert, {
        ownerId: user._id,
        kind,
        fileId,
        filePath: file.filePath,
        name: file.name,
        mime: file.mime,
        size: file.size,
        width: file.width,
        height: file.height,
        duration: file.duration,
      });
    } catch (err) {
      await deleteIfOwned();
      throw err;
    }
  },
});

export const getForOwner = internalQuery({
  args: { assetId: v.id("assets"), clerkId: v.string() },
  handler: async (ctx, { assetId, clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    const asset = await ctx.db.get("assets", assetId);
    return user && asset && asset.ownerId === user._id ? asset : null;
  },
});

export const deleteAsset = action({
  args: { assetId: v.id("assets") },
  handler: async (ctx, { assetId }): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const asset = await ctx.runQuery(internal.assets.getForOwner, {
      assetId,
      clerkId: identity.subject,
    });
    if (!asset) throw new ConvexError({ code: "NOT_FOUND" });
    // ImageKit first: if it fails the row stays, so nothing is orphaned.
    await ctx.runAction(internal.imagekit.deleteFile, { fileId: asset.fileId });
    await ctx.runMutation(internal.assets.remove, { assetId });
    return null;
  },
});
