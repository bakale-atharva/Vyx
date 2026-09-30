import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const planValidator = v.union(
  v.literal("free"),
  v.literal("pro"),
  v.literal("ultra"),
);

export const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
);

export const assetKindValidator = v.union(
  v.literal("image"),
  v.literal("video"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    plan: planValidator,
    subscriptionStatus: v.optional(subscriptionStatusValidator),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    periodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    overQuota: v.optional(v.boolean()),
    billingSyncedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    // Denormalized count of this user's assets (kept in sync by assets.insert/remove).
    assetCount: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  assets: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_owner_created", ["ownerId", "createdAt"])
    .index("by_owner_kind_created", ["ownerId", "kind", "createdAt"])
    .index("by_file_id", ["fileId"]),

  webhookEvents: defineTable({
    svixId: v.string(),
    type: v.string(),
    receivedAt: v.number(),
  })
    .index("by_svix_id", ["svixId"])
    .index("by_received_at", ["receivedAt"]),
});
