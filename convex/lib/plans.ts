export const PLANS = ["free", "pro", "ultra"] as const;
export type Plan = (typeof PLANS)[number];

/** Clerk plan slugs, as configured in the Clerk dashboard. */
export const PLAN_SLUGS = {
  free: "free_user",
  pro: "pro",
  ultra: "ultra",
} as const;

export const ASSET_LIMITS: Record<Plan, number> = {
  free: 25,
  pro: 500,
  ultra: 5000,
};

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, ultra: 2 };

export function planFromSlug(slug: string | undefined | null): Plan {
  if (slug === PLAN_SLUGS.ultra) return "ultra";
  if (slug === PLAN_SLUGS.pro) return "pro";
  return "free";
}

export function higherPlan(a: Plan, b: Plan): Plan {
  return PLAN_RANK[a] >= PLAN_RANK[b] ? a : b;
}
