import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
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
