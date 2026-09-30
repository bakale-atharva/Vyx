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

/** Everything needed to create an asset (shared by assets.insert / edits.complete). */
export const assetInsertFields = {
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
};

export const editRequestValidator = v.object({
  src: v.string(),
  transformation: v.array(v.any()),
  queryParameters: v.record(v.string(), v.string()),
});

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

  assets: defineTable({ ...assetInsertFields, createdAt: v.number() })
    .index("by_owner_created", ["ownerId", "createdAt"])
    .index("by_owner_kind_created", ["ownerId", "kind", "createdAt"])
    .index("by_file_id", ["fileId"]),

  // In-flight and failed "Save as new" jobs. Successful ones become assets and
  // are deleted, so the gallery can show processing/failed cards from this table.
  edits: defineTable({
    ownerId: v.id("users"),
    parentAssetId: v.id("assets"),
    kind: assetKindValidator, // kind of the asset the edit produces
    name: v.string(),
    recipe: v.any(),
    request: editRequestValidator,
    status: v.union(v.literal("processing"), v.literal("failed")),
    errorCode: v.optional(v.string()),
    attempts: v.number(),
    createdAt: v.number(),
  })
    .index("by_owner_created", ["ownerId", "createdAt"])
    .index("by_created", ["createdAt"]),

  webhookEvents: defineTable({
    svixId: v.string(),
    type: v.string(),
    receivedAt: v.number(),
  })
    .index("by_svix_id", ["svixId"])
    .index("by_received_at", ["receivedAt"]),
});
