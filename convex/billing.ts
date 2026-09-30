import { createClerkClient } from "@clerk/backend";
import type {
  BillingSubscriptionItemWebhookEvent,
  BillingSubscriptionWebhookEvent,
} from "@clerk/backend";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { ASSET_LIMITS, higherPlan, planFromSlug, type Plan } from "./lib/plans";
import { planValidator, subscriptionStatusValidator } from "./schema";
import { ensureUserRow } from "./users";

type SubscriptionData = BillingSubscriptionWebhookEvent["data"];
type ItemData = BillingSubscriptionItemWebhookEvent["data"];
type Item = SubscriptionData["items"][number];
type Payer = SubscriptionData["payer"] | ItemData["payer"];

// Items that still grant their plan's features (canceled = ends at period end).
const LIVE_ITEM_STATUSES = new Set(["active", "past_due", "canceled"]);

function profileFromPayer(payer: Payer) {
  const name = [payer?.first_name, payer?.last_name].filter(Boolean).join(" ");
  return {
    email: payer?.email ?? "",
    name: name || undefined,
    imageUrl: payer?.image_url,
  };
}

/** Return the row, or null if the event should be ignored (org payer, deleted, stale). */
async function loadForSync(
  ctx: MutationCtx,
  payer: Payer,
  timestamp: number,
): Promise<Doc<"users"> | null> {
  const clerkId = payer?.user_id;
  if (!clerkId) return null; // organization payer: not used by Vyx
  const user = await ensureUserRow(ctx, clerkId, profileFromPayer(payer));
  if (user.deletedAt !== undefined) return null;
  if (user.billingSyncedAt !== undefined && timestamp < user.billingSyncedAt) {
    return null;
  }
  return user;
}

async function patchBilling(
  ctx: MutationCtx,
  user: Doc<"users">,
  timestamp: number,
  fields: Partial<Omit<Doc<"users">, "_id" | "_creationTime">>,
) {
  const plan = fields.plan ?? user.plan;
  await ctx.db.patch("users", user._id, {
    ...fields,
    overQuota: user.assetCount > ASSET_LIMITS[plan],
    billingSyncedAt: timestamp,
  });
}

export async function syncSubscription(
  ctx: MutationCtx,
  data: SubscriptionData,
  timestamp: number,
) {
  const user = await loadForSync(ctx, data.payer, timestamp);
  if (!user) return;

  let plan: Plan = "free";
  let effective: Item | undefined;
  for (const item of data.items ?? []) {
    if (!LIVE_ITEM_STATUSES.has(item.status)) continue;
    const itemPlan = planFromSlug(item.plan?.slug);
    if (itemPlan === "free") continue;
    if (!effective || higherPlan(itemPlan, plan) === itemPlan) {
      plan = higherPlan(itemPlan, plan);
      effective = item;
    }
  }

  await patchBilling(ctx, user, timestamp, {
    plan,
    subscriptionStatus: !effective
      ? undefined
      : effective.status === "past_due" || data.status === "past_due"
        ? "past_due"
        : effective.status === "canceled"
          ? "canceled"
          : "active",
    cancelAtPeriodEnd: effective?.status === "canceled" ? true : undefined,
    periodEnd: effective?.period_end ?? undefined,
    trialEndsAt: plan === "free" ? undefined : user.trialEndsAt,
  });
}

export async function syncSubscriptionItem(
  ctx: MutationCtx,
  type: string,
  data: ItemData,
  timestamp: number,
) {
  const user = await loadForSync(ctx, data.payer, timestamp);
  if (!user) return;
  const itemPlan = planFromSlug(data.plan?.slug);

  switch (type) {
    case "subscriptionItem.pastDue":
      if (itemPlan === "free") return;
      await patchBilling(ctx, user, timestamp, { subscriptionStatus: "past_due" });
      return;
    case "subscriptionItem.canceled":
      if (itemPlan === "free") return;
      await patchBilling(ctx, user, timestamp, {
        subscriptionStatus: "canceled",
        cancelAtPeriodEnd: true,
        periodEnd: data.period_end ?? user.periodEnd,
      });
      return;
    case "subscriptionItem.upcoming":
      // Free plan queued after the current period: keep features until it ends.
      if (itemPlan !== "free" || user.plan === "free") return;
      await patchBilling(ctx, user, timestamp, {
        cancelAtPeriodEnd: true,
        periodEnd: data.period_start ?? user.periodEnd,
      });
      return;
    case "subscriptionItem.ended":
      // Only downgrade if the ended item is the plan we currently grant
      // (e.g. Pro ending after an upgrade to Ultra must not downgrade).
      if (itemPlan === "free" || itemPlan !== user.plan) return;
      await patchBilling(ctx, user, timestamp, {
        plan: "free",
        subscriptionStatus: undefined,
        cancelAtPeriodEnd: undefined,
        periodEnd: undefined,
        trialEndsAt: undefined,
      });
      return;
    case "subscriptionItem.freeTrialEnding":
      await patchBilling(ctx, user, timestamp, {
        trialEndsAt: data.period_end ?? undefined,
      });
      return;
  }
}

/** Apply the result of a live Clerk lookup (bypasses webhook ordering). */
export const applyLivePlan = internalMutation({
  args: {
    clerkId: v.string(),
    plan: planValidator,
    subscriptionStatus: v.optional(subscriptionStatusValidator),
    periodEnd: v.optional(v.number()),
  },
  handler: async (ctx, { clerkId, ...live }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user || user.deletedAt !== undefined) return null;
    await patchBilling(ctx, user, Date.now(), {
      ...live,
      cancelAtPeriodEnd: live.subscriptionStatus === "canceled" ? true : undefined,
    });
    return null;
  },
});

/**
 * Live fallback: re-read the plan from Clerk when the stored plan would reject
 * a request (the webhook may simply be late). Returns the fresh plan.
 */
export const refreshPlanFromClerk = internalAction({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }): Promise<Plan> => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");
    const clerk = createClerkClient({ secretKey });

    let plan: Plan = "free";
    let status: "active" | "past_due" | "canceled" | undefined;
    let periodEnd: number | undefined;
    try {
      const sub = await clerk.billing.getUserBillingSubscription(clerkId);
      for (const item of sub.subscriptionItems) {
        if (!LIVE_ITEM_STATUSES.has(item.status)) continue;
        const itemPlan = planFromSlug(item.plan?.slug);
        if (itemPlan === "free" || higherPlan(itemPlan, plan) !== itemPlan) continue;
        plan = itemPlan;
        status = item.status as "active" | "past_due" | "canceled";
        periodEnd = item.periodEnd ?? undefined;
      }
    } catch (err) {
      // No subscription yet (404) means the user is on the free plan.
      if ((err as { status?: number }).status !== 404) throw err;
    }
    await ctx.runMutation(internal.billing.applyLivePlan, {
      clerkId,
      plan,
      subscriptionStatus: status,
      periodEnd,
    });
    return plan;
  },
});
