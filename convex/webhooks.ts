import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { syncSubscription, syncSubscriptionItem } from "./billing";
import { markUserDeleted, upsertUserRow } from "./users";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 500;

/**
 * Single transactional entry point for verified Clerk webhooks: the dedupe
 * insert and the state change commit together or not at all.
 */
export const ingest = internalMutation({
  args: {
    svixId: v.string(),
    type: v.string(),
    timestamp: v.number(),
    data: v.any(),
  },
  handler: async (ctx, { svixId, type, timestamp, data }) => {
    const seen = await ctx.db
      .query("webhookEvents")
      .withIndex("by_svix_id", (q) => q.eq("svixId", svixId))
      .first();
    if (seen) return { duplicate: true };
    await ctx.db.insert("webhookEvents", { svixId, type, receivedAt: Date.now() });

    if (type === "user.created" || type === "user.updated") {
      const primary = data.email_addresses?.find(
        (e: { id: string }) => e.id === data.primary_email_address_id,
      );
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ");
      await upsertUserRow(ctx, data.id, {
        email:
          primary?.email_address ?? data.email_addresses?.[0]?.email_address ?? "",
        name: name || data.username || undefined,
        imageUrl: data.image_url || undefined,
      });
    } else if (type === "user.deleted") {
      if (data.id) await markUserDeleted(ctx, data.id);
    } else if (type.startsWith("subscription.")) {
      await syncSubscription(ctx, data, timestamp);
    } else if (type.startsWith("subscriptionItem.")) {
      await syncSubscriptionItem(ctx, type, data, timestamp);
    }
    return { duplicate: false };
  },
});

export const pruneEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db
      .query("webhookEvents")
      .withIndex("by_received_at", (q) =>
        q.lt("receivedAt", Date.now() - RETENTION_MS),
      )
      .take(PRUNE_BATCH);
    for (const row of old) await ctx.db.delete("webhookEvents", row._id);
    return null;
  },
});
