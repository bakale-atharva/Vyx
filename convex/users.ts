import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { ASSET_LIMITS } from "./lib/plans";

type Profile = { email: string; name?: string; imageUrl?: string };

/** Find a user row or create a free-plan one. Never resurrects deleted users. */
export async function ensureUserRow(
  ctx: MutationCtx,
  clerkId: string,
  profile: Profile,
): Promise<Doc<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("users", {
    clerkId,
    email: profile.email,
    name: profile.name,
    imageUrl: profile.imageUrl,
    plan: "free",
    assetCount: 0,
  });
  return (await ctx.db.get("users", id))!;
}

/** The signed-in user's row, or null if unauthenticated / not yet created / deleted. */
export async function getCurrentUser(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  return user && user.deletedAt === undefined ? user : null;
}

export async function upsertUserRow(
  ctx: MutationCtx,
  clerkId: string,
  profile: Profile,
) {
  const user = await ensureUserRow(ctx, clerkId, profile);
  if (user.deletedAt !== undefined) return;
  await ctx.db.patch("users", user._id, {
    email: profile.email,
    name: profile.name,
    imageUrl: profile.imageUrl,
  });
}

export async function markUserDeleted(ctx: MutationCtx, clerkId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
  if (user) await ctx.db.patch("users", user._id, { deletedAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.cleanup.purgeUser, { clerkId });
}

export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    return user && user.deletedAt === undefined ? user : null;
  },
});

export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, ...profile }) => {
    await upsertUserRow(ctx, clerkId, profile);
    return null;
  },
});

export const markDeleted = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    await markUserDeleted(ctx, clerkId);
    return null;
  },
});

/** Lazily create the row on first studio load (webhook may lag behind). */
export const ensureMe = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ensureUserRow(ctx, identity.subject, {
      email: identity.email ?? "",
      name: identity.name,
      imageUrl: identity.pictureUrl,
    });
    return user._id;
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus ?? null,
      banners: {
        pastDue: user.subscriptionStatus === "past_due",
        cancelAtPeriodEnd: user.cancelAtPeriodEnd === true,
        periodEnd: user.periodEnd ?? null,
        trialEndsAt: user.trialEndsAt ?? null,
        overQuota: user.overQuota === true,
      },
      usage: { assets: user.assetCount, limit: ASSET_LIMITS[user.plan] },
    };
  },
});
